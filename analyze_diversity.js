#!/usr/bin/env node
// Analyze color diversity of all Twemoji 72x72 PNGs.
// For each emoji: downsample 72x72 -> 18x18, quantize at threshold=30,
// then compute pairwise color distances for diversity scoring.
//
// Usage: node analyze_diversity.js

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Tunables ─────────────────────────────────────────────────────────────────
const QUANTIZE_THRESHOLD = 30;
const GRID_SIZE          = 18;
const SRC_SIZE           = 72;
const CACHE_DIR          = '/tmp/twemoji-all';
const MIN_COLORS         = 2;
const MAX_COLORS         = 8;
const TOP_N              = 20;

// ─── PNG decoder (same as analyze_all_twemoji.js) ─────────────────────────────

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

// Returns array of cluster centers (RGB objects) — same greedy quantize as game-logic.js
function quantizeColors(pixels, threshold) {
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
  return clusters;
}

function toHex(c) {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// Rough color name from RGB
function colorName(r, g, b) {
  // Compute hue, saturation, lightness
  const rn = r/255, gn = g/255, bn = b/255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));

  if (s < 0.12) {
    if (l < 0.15) return 'black';
    if (l > 0.85) return 'white';
    return 'gray';
  }

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + 6) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }

  if (l < 0.20) return 'dark-' + hueLabel(h);
  if (l > 0.80) return 'light-' + hueLabel(h);
  return hueLabel(h);
}

function hueLabel(h) {
  if (h < 15)  return 'red';
  if (h < 45)  return 'orange';
  if (h < 70)  return 'yellow';
  if (h < 150) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 285) return 'indigo';
  if (h < 330) return 'purple';
  if (h < 345) return 'pink';
  return 'red';
}

// Compute pairwise distances between all cluster centers
function pairwiseStats(clusters) {
  const n = clusters.length;
  if (n < 2) return { minDist: 0, avgDist: 0 };
  let minDist = Infinity, totalDist = 0, count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const d = colorDist(clusters[i], clusters[j]);
      if (d < minDist) minDist = d;
      totalDist += d;
      count++;
    }
  }
  return {
    minDist: Math.round(minDist * 10) / 10,
    avgDist: Math.round((totalDist / count) * 10) / 10
  };
}

function analyzeBuffer(buf) {
  const { width, height, pixels } = decodePNG(buf);
  const ds = downsample(pixels, width, height, GRID_SIZE);
  const clusters = quantizeColors(ds, QUANTIZE_THRESHOLD);
  const { minDist, avgDist } = pairwiseStats(clusters);
  const palette = clusters.map(toHex);
  return { colors: clusters.length, minDist, avgDist, palette, clusters };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} PNGs in ${CACHE_DIR}`);

  const results = [];
  let processed = 0, failed = 0;
  const total = files.length;

  for (const fname of files) {
    const fpath = path.join(CACHE_DIR, fname);
    try {
      const buf = fs.readFileSync(fpath);
      if (buf.length < 8 || buf[0] !== 137) { failed++; continue; }
      const { colors, minDist, avgDist, palette } = analyzeBuffer(buf);
      results.push({
        fname: fname.replace('.png', ''),
        colors,
        minDist,
        avgDist,
        palette
      });
      processed++;
    } catch (e) {
      failed++;
    }
    if ((processed + failed) % 500 === 0) {
      process.stdout.write(`  ${processed + failed}/${total}\r`);
    }
  }

  console.log(`\nProcessed: ${processed}  Failed: ${failed}`);

  // Save full results
  const outPath = path.join(__dirname, 'twemoji_diversity_analysis.json');
  const filtered = results.filter(r => r.colors >= MIN_COLORS && r.colors <= MAX_COLORS);
  filtered.sort((a, b) => a.colors - b.colors || b.avgDist - a.avgDist);
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2));
  console.log(`Saved ${filtered.length} results to ${outPath}`);

  // ─── Print grouped summary ─────────────────────────────────────────────────
  console.log('\n' + '='.repeat(80));
  console.log(`COLOR DIVERSITY ANALYSIS  threshold=${QUANTIZE_THRESHOLD}  grid=${GRID_SIZE}x${GRID_SIZE}`);
  console.log('='.repeat(80));

  for (let n = MIN_COLORS; n <= MAX_COLORS; n++) {
    const group = filtered.filter(r => r.colors === n);
    if (group.length === 0) continue;
    const top = group.slice(0, TOP_N); // already sorted by avgDist desc

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`  ${n} COLORS  (${group.length} total emoji, showing top ${Math.min(TOP_N, group.length)} by spread score)`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`  ${'CODEPOINT'.padEnd(30)} | COLORS | MIN_DIST | AVG_DIST | COLOR NAMES`);
    console.log(`  ${'-'.repeat(78)}`);

    for (const r of top) {
      const colorNames = r.palette.map(hex => {
        const rv = parseInt(hex.slice(1,3),16);
        const gv = parseInt(hex.slice(3,5),16);
        const bv = parseInt(hex.slice(5,7),16);
        return colorName(rv, gv, bv);
      }).join(', ');
      const cp = r.fname.padEnd(30);
      console.log(`  ${cp} | ${String(r.colors).padStart(6)} | ${String(r.minDist).padStart(8)} | ${String(r.avgDist).padStart(8)} | ${colorNames}`);
    }
  }

  // Overall stats
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL DISTRIBUTION (2-8 colors):');
  for (let n = MIN_COLORS; n <= MAX_COLORS; n++) {
    const group = filtered.filter(r => r.colors === n);
    if (group.length === 0) continue;
    const avgSpread = group.reduce((s, r) => s + r.avgDist, 0) / group.length;
    console.log(`  ${n} colors: ${String(group.length).padStart(5)} emoji  avg-spread=${avgSpread.toFixed(1)}`);
  }
  console.log('='.repeat(80));
}

main().catch(e => { console.error(e); process.exit(1); });
