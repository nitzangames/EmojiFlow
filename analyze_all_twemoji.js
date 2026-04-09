#!/usr/bin/env node
// Analyze ALL Twemoji 72x72 PNGs: downsample to 18x18, quantize at threshold=30,
// count distinct colors, build histogram.
//
// Usage: node analyze_all_twemoji.js
//
// Phase 1: fetch file list from jsDelivr
// Phase 2: download all PNGs in parallel batches to /tmp/twemoji-all/
// Phase 3: process each with the game's downsample+quantize pipeline
// Phase 4: print histogram

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const http  = require('http');

// ─── Tunables ─────────────────────────────────────────────────────────────────
const QUANTIZE_THRESHOLD = 30;
const GRID_SIZE          = 18;
const SRC_SIZE           = 72;
const CACHE_DIR          = '/tmp/twemoji-all';
const CONCURRENCY        = 30;   // simultaneous downloads
const CDN_BASE           = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/';
const LIST_URL           = 'https://data.jsdelivr.com/v1/packages/gh/twitter/twemoji@14.0.2?structure=flat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'twemoji-analyzer/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

async function downloadFile(url, dest) {
  const buf = await get(url);
  fs.writeFileSync(dest, buf);
  return buf;
}

async function runPool(items, concurrency, fn) {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// ─── PNG decoder (same as analyze_colors.js) ──────────────────────────────────

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const dstBase  = y * stride;
    const prevBase = (y > 0) ? (y - 1) * stride : -1;
    for (let x = 0; x < stride; x++) {
      const s = raw[rowStart + x];
      const a = x >= bpp ? pixels[dstBase + x - bpp] : 0;
      const b = prevBase >= 0 ? pixels[prevBase + x] : 0;
      const c = (prevBase >= 0 && x >= bpp) ? pixels[prevBase + x - bpp] : 0;
      switch (filterType) {
        case 0: pixels[dstBase + x] = s; break;
        case 1: pixels[dstBase + x] = (s + a) & 0xff; break;
        case 2: pixels[dstBase + x] = (s + b) & 0xff; break;
        case 3: pixels[dstBase + x] = (s + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: pixels[dstBase + x] = (s + paeth(a, b, c)) & 0xff; break;
        default: throw new Error('Unknown PNG filter type: ' + filterType);
      }
    }
  }
  return pixels;
}

function decodePNG(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error('Not a PNG');
  }

  let pos = 8, width, height, bitDepth, colorType;
  let plte = null, trns = null;
  const idatChunks = [];

  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos); pos += 4;
    const type   = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data   = buf.slice(pos, pos + length); pos += length + 4;

    if (type === 'IHDR') {
      width     = data.readUInt32BE(0);
      height    = data.readUInt32BE(4);
      bitDepth  = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') {
      plte = [];
      for (let i = 0; i < data.length; i += 3) plte.push([data[i], data[i+1], data[i+2]]);
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));

  let bpp;
  if      (colorType === 3) bpp = 1;
  else if (colorType === 2) bpp = 3;
  else if (colorType === 6) bpp = 4;
  else throw new Error('Unsupported PNG color type: ' + colorType);

  const scanlines = unfilter(raw, width, height, bpp);
  const rgba = new Uint8Array(width * height * 4);

  if (colorType === 3) {
    for (let i = 0; i < width * height; i++) {
      const idx = scanlines[i];
      const [r, g, b] = plte[idx];
      const a = trns && idx < trns.length ? trns[idx] : 255;
      rgba[i*4]=r; rgba[i*4+1]=g; rgba[i*4+2]=b; rgba[i*4+3]=a;
    }
  } else if (colorType === 2) {
    for (let i = 0; i < width * height; i++) {
      rgba[i*4]=scanlines[i*3]; rgba[i*4+1]=scanlines[i*3+1]; rgba[i*4+2]=scanlines[i*3+2]; rgba[i*4+3]=255;
    }
  } else {
    rgba.set(scanlines);
  }

  return { width, height, pixels: rgba };
}

// ─── Game pipeline ─────────────────────────────────────────────────────────────

function downsample(pixels, srcW, srcH, dstSize) {
  const blockW = srcW / dstSize;
  const blockH = srcH / dstSize;
  const out = [];
  for (let dy = 0; dy < dstSize; dy++) {
    for (let dx = 0; dx < dstSize; dx++) {
      let rS=0, gS=0, bS=0, aS=0, n=0;
      for (let by = 0; by < blockH; by++) {
        for (let bx = 0; bx < blockW; bx++) {
          const sx = Math.floor(dx*blockW+bx);
          const sy = Math.floor(dy*blockH+by);
          const i  = (sy*srcW+sx)*4;
          rS+=pixels[i]; gS+=pixels[i+1]; bS+=pixels[i+2]; aS+=pixels[i+3]; n++;
        }
      }
      out.push({ r:Math.round(rS/n), g:Math.round(gS/n), b:Math.round(bS/n), a:Math.round(aS/n) });
    }
  }
  return out;
}

function colorDist(c1, c2) {
  const dr=c1.r-c2.r, dg=c1.g-c2.g, db=c1.b-c2.b;
  return Math.sqrt(dr*dr+dg*dg+db*db);
}

function countColors(pixels, threshold) {
  const ALPHA_CUTOFF = 128;
  const clusters = [];
  for (const p of pixels) {
    if (p.a < ALPHA_CUTOFF) continue;
    let bestIdx = -1, bestDist = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const d = colorDist(p, clusters[c]);
      if (d < bestDist) { bestDist=d; bestIdx=c; }
    }
    if (bestIdx >= 0 && bestDist < threshold) {
      const cl = clusters[bestIdx];
      const n  = cl.count + 1;
      cl.r = Math.round((cl.r*cl.count + p.r)/n);
      cl.g = Math.round((cl.g*cl.count + p.g)/n);
      cl.b = Math.round((cl.b*cl.count + p.b)/n);
      cl.count = n;
    } else {
      clusters.push({ r:p.r, g:p.g, b:p.b, count:1 });
    }
  }
  return clusters.length;
}

function analyzeBuffer(buf) {
  const { width, height, pixels } = decodePNG(buf);
  const ds = downsample(pixels, width, height, GRID_SIZE);
  return countColors(ds, QUANTIZE_THRESHOLD);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // --- Cache dir
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  // --- Fetch file list
  console.log('Fetching Twemoji file list from jsDelivr…');
  const listBuf = await get(LIST_URL);
  const listJson = JSON.parse(listBuf.toString());

  // jsDelivr flat structure: { files: [ { name: '/assets/72x72/1f600.png', … }, … ] }
  const allFiles = listJson.files || [];
  const pngFiles = allFiles
    .map(f => f.name || f)
    .filter(n => n.startsWith('/assets/72x72/') && n.endsWith('.png'));

  console.log(`Found ${pngFiles.length} 72x72 PNGs.`);
  if (pngFiles.length === 0) {
    console.error('No files found — check jsDelivr response structure:');
    console.error(JSON.stringify(listJson).slice(0, 500));
    process.exit(1);
  }

  // --- Download missing files
  const toDownload = pngFiles.filter(p => {
    const fname = path.basename(p);
    return !fs.existsSync(path.join(CACHE_DIR, fname));
  });

  if (toDownload.length > 0) {
    console.log(`Downloading ${toDownload.length} files (${CONCURRENCY} concurrent)…`);
    let done = 0, errors = 0;
    const start = Date.now();

    await runPool(toDownload, CONCURRENCY, async (filePath) => {
      const fname = path.basename(filePath);
      const url   = CDN_BASE + fname;
      const dest  = path.join(CACHE_DIR, fname);
      try {
        await downloadFile(url, dest);
      } catch (e) {
        errors++;
        // write empty marker so we don't retry endlessly on this run
        // (don't write anything — just skip)
      }
      done++;
      if (done % 200 === 0 || done === toDownload.length) {
        const elapsed = ((Date.now()-start)/1000).toFixed(1);
        const rate = (done/elapsed).toFixed(1);
        process.stdout.write(`  ${done}/${toDownload.length}  (${rate}/s, errors: ${errors})\r`);
      }
    });
    console.log(`\nDownloads complete.`);
  } else {
    console.log('All files already cached.');
  }

  // --- Process each file
  console.log('Processing all PNGs…');
  const histogram = {};   // colorCount -> number of emoji
  const details   = [];   // { fname, colors }
  let processed = 0, failed = 0;

  for (const filePath of pngFiles) {
    const fname = path.basename(filePath);
    const dest  = path.join(CACHE_DIR, fname);
    if (!fs.existsSync(dest)) { failed++; continue; }
    try {
      const buf    = fs.readFileSync(dest);
      // quick sanity check
      if (buf.length < 8 || buf[0] !== 137) { failed++; continue; }
      const colors = analyzeBuffer(buf);
      histogram[colors] = (histogram[colors] || 0) + 1;
      details.push({ fname: fname.replace('.png',''), colors });
      processed++;
    } catch (e) {
      failed++;
    }
  }

  // --- Print histogram
  console.log('\n' + '='.repeat(50));
  console.log(`RESULTS: threshold=${QUANTIZE_THRESHOLD}, grid=${GRID_SIZE}x${GRID_SIZE}`);
  console.log(`Processed: ${processed} emoji  |  Failed/skipped: ${failed}`);
  console.log('='.repeat(50));
  console.log('\nHistogram (distinct colors → number of emoji):\n');

  const maxColors = Math.max(...Object.keys(histogram).map(Number));
  let cumulative = 0;
  for (let n = 1; n <= maxColors; n++) {
    const count = histogram[n] || 0;
    if (count === 0) continue;
    cumulative += count;
    const bar = '█'.repeat(Math.min(50, Math.round(count / processed * 200)));
    console.log(`  ${String(n).padStart(3)} colors: ${String(count).padStart(5)} emoji  ${bar}`);
  }

  console.log('\nCumulative:');
  cumulative = 0;
  for (let n = 1; n <= maxColors; n++) {
    cumulative += (histogram[n] || 0);
    if (histogram[n] > 0) {
      const pct = (cumulative / processed * 100).toFixed(1);
      console.log(`  ≤${String(n).padStart(2)} colors: ${String(cumulative).padStart(5)} (${pct}%)`);
    }
  }

  // Sweet spots for game design
  console.log('\nGame-design buckets:');
  const buckets = [[1,2],[3,4],[5,6],[7,9],[10,15],[16,999]];
  for (const [lo,hi] of buckets) {
    let cnt = 0;
    for (let n = lo; n <= hi; n++) cnt += (histogram[n] || 0);
    const label = hi >= 999 ? `${lo}+` : `${lo}-${hi}`;
    console.log(`  ${label.padEnd(8)} colors: ${String(cnt).padStart(5)} emoji  (${(cnt/processed*100).toFixed(1)}%)`);
  }

  // Save full detail list sorted by color count
  details.sort((a,b) => a.colors - b.colors || a.fname.localeCompare(b.fname));
  const outPath = path.join(__dirname, 'twemoji_color_analysis.json');
  fs.writeFileSync(outPath, JSON.stringify({ threshold: QUANTIZE_THRESHOLD, histogram, details }, null, 2));
  console.log(`\nFull detail saved to: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
