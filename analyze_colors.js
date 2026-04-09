#!/usr/bin/env node
// Analyze color breakdown for all 50 Twemoji PNGs using the game's actual pipeline.
// Implements a minimal PNG decoder for indexed-color (type 3) and RGBA (type 6) PNGs.

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Game pipeline replicated from pixel-extract.js ───────────────────────────

function downsample(pixels, srcW, srcH, dstSize) {
  const blockW = srcW / dstSize;
  const blockH = srcH / dstSize;
  const out = [];
  for (let dy = 0; dy < dstSize; dy++) {
    for (let dx = 0; dx < dstSize; dx++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let by = 0; by < blockH; by++) {
        for (let bx = 0; bx < blockW; bx++) {
          const sx = Math.floor(dx * blockW + bx);
          const sy = Math.floor(dy * blockH + by);
          const idx = sy * srcW + sx;
          rSum += pixels[idx * 4];
          gSum += pixels[idx * 4 + 1];
          bSum += pixels[idx * 4 + 2];
          aSum += pixels[idx * 4 + 3];
          count++;
        }
      }
      out.push({
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count),
        a: Math.round(aSum / count),
      });
    }
  }
  return out;
}

function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function quantizeColors(pixels, threshold) {
  const ALPHA_CUTOFF = 128;
  const clusters = [];
  const assignments = new Uint8Array(pixels.length);
  const pixelCounts = [];

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (p.a < ALPHA_CUTOFF) {
      assignments[i] = 255;
      continue;
    }
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const d = colorDistance(p, clusters[c]);
      if (d < bestDist) { bestDist = d; bestIdx = c; }
    }
    if (bestIdx >= 0 && bestDist < threshold) {
      const cl = clusters[bestIdx];
      const n = cl.count + 1;
      cl.r = Math.round((cl.r * cl.count + p.r) / n);
      cl.g = Math.round((cl.g * cl.count + p.g) / n);
      cl.b = Math.round((cl.b * cl.count + p.b) / n);
      cl.count = n;
      assignments[i] = bestIdx;
    } else {
      assignments[i] = clusters.length;
      clusters.push({ r: p.r, g: p.g, b: p.b, count: 1 });
    }
  }

  // Count pixels per cluster
  const counts = new Array(clusters.length).fill(0);
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] !== 255) counts[assignments[i]]++;
  }

  const palette = clusters.map((cl, idx) => {
    const hex = '#' + ((1 << 24) + (cl.r << 16) + (cl.g << 8) + cl.b).toString(16).slice(1);
    return { r: cl.r, g: cl.g, b: cl.b, hex, count: counts[idx] };
  });

  return { palette, assignments };
}

// ─── Minimal PNG decoder ───────────────────────────────────────────────────────

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
    const src = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const dst = pixels.slice(y * stride, y * stride + stride);
    const prev = y > 0 ? pixels.slice((y - 1) * stride, y * stride) : new Uint8Array(stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? dst[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      switch (filterType) {
        case 0: dst[x] = src[x]; break;
        case 1: dst[x] = (src[x] + a) & 0xff; break;
        case 2: dst[x] = (src[x] + b) & 0xff; break;
        case 3: dst[x] = (src[x] + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: dst[x] = (src[x] + paeth(a, b, c)) & 0xff; break;
        default: throw new Error('Unknown filter type: ' + filterType);
      }
    }
    pixels.set(dst, y * stride);
  }
  return pixels;
}

function decodePNG(buf) {
  // Verify PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error('Not a PNG file');
  }

  let pos = 8;
  let width, height, bitDepth, colorType;
  let palette = null; // PLTE
  let trns = null;   // tRNS
  const idatChunks = [];

  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos); pos += 4;
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + length); pos += length;
    pos += 4; // CRC

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') {
      palette = [];
      for (let i = 0; i < data.length; i += 3) {
        palette.push([data[i], data[i + 1], data[i + 2]]);
      }
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);

  // Determine bpp for unfiltering
  let bpp;
  if (colorType === 3) bpp = 1;      // indexed
  else if (colorType === 2) bpp = 3; // RGB
  else if (colorType === 6) bpp = 4; // RGBA
  else throw new Error('Unsupported color type: ' + colorType);

  const scanlines = unfilter(raw, width, height, bpp);

  // Convert to RGBA pixels array
  const rgba = new Uint8Array(width * height * 4);

  if (colorType === 3) {
    // Indexed color
    for (let i = 0; i < width * height; i++) {
      const idx = scanlines[i];
      const [r, g, b] = palette[idx];
      let a = 255;
      if (trns && idx < trns.length) a = trns[idx];
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = a;
    }
  } else if (colorType === 2) {
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = scanlines[i * 3];
      rgba[i * 4 + 1] = scanlines[i * 3 + 1];
      rgba[i * 4 + 2] = scanlines[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else if (colorType === 6) {
    rgba.set(scanlines);
  }

  return { width, height, pixels: rgba };
}

// ─── Main analysis ─────────────────────────────────────────────────────────────

const LEVELS = [
  // Band 1: 2-3 colors (levels 1-10)
  { emoji: '1f534', name: 'Red Circle',        ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e0', name: 'Orange Circle',     ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e1', name: 'Yellow Circle',     ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e2', name: 'Green Circle',      ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f535', name: 'Blue Circle',       ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e3', name: 'Purple Circle',     ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2b50',  name: 'Star',              ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2764-fe0f', name: 'Red Heart',     ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f49b', name: 'Yellow Heart',      ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f499', name: 'Blue Heart',        ammoBuffer: 0.20, quantizeThreshold: 35 },

  // Band 2: 3-4 colors (levels 11-20)
  { emoji: '1f34e', name: 'Red Apple',         ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f34a', name: 'Tangerine',         ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f33b', name: 'Sunflower',         ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f525', name: 'Fire',              ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f4a7', name: 'Droplet',           ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f31f', name: 'Glowing Star',      ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f33a', name: 'Hibiscus',          ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f352', name: 'Cherries',          ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f353', name: 'Strawberry',        ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f438', name: 'Frog',              ammoBuffer: 0.10, quantizeThreshold: 25 },

  // Band 3: 4-5 colors (levels 21-30)
  { emoji: '1f345', name: 'Tomato',            ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f34b', name: 'Lemon',             ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f34c', name: 'Banana',            ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f347', name: 'Grapes',            ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f349', name: 'Watermelon',        ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f350', name: 'Pear',              ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f351', name: 'Peach',             ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f33d', name: 'Corn',              ammoBuffer: 0.08, quantizeThreshold: 22 },
  { emoji: '1f955', name: 'Carrot',            ammoBuffer: 0.08, quantizeThreshold: 22 },
  { emoji: '1f966', name: 'Broccoli',          ammoBuffer: 0.08, quantizeThreshold: 22 },

  // Band 4: 5-6 colors (levels 31-40)
  { emoji: '1f338', name: 'Cherry Blossom',    ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f40c', name: 'Snail',             ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f41b', name: 'Bug',               ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f42c', name: 'Dolphin',           ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f431', name: 'Cat Face',          ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f435', name: 'Monkey Face',       ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f436', name: 'Dog Face',          ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f98a', name: 'Fox',               ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f98e', name: 'Lizard',            ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f984', name: 'Unicorn',           ammoBuffer: 0.05, quantizeThreshold: 18 },

  // Band 5: 6+ colors (levels 41-50)
  { emoji: '1f340', name: 'Four Leaf Clover',  ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f332', name: 'Evergreen Tree',    ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f383', name: 'Jack-O-Lantern',    ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f384', name: 'Christmas Tree',    ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f30b', name: 'Volcano',           ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f3a8', name: 'Artist Palette',    ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f30d', name: 'Globe',             ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f308', name: 'Rainbow',           ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f386', name: 'Fireworks',         ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f3d4', name: 'Snow Mountain',     ammoBuffer: 0.03, quantizeThreshold: 14 },
];

const EMOJI_DIR = path.join(__dirname, 'emoji');
const GRID_SIZE = 18;
const SRC_SIZE = 72;

// Table header
const colW = [5, 14, 20, 11, 8];
function pad(s, w) { s = String(s); return s + ' '.repeat(Math.max(0, w - s.length)); }

console.log(
  pad('Level', colW[0]) + ' | ' +
  pad('Emoji', colW[1]) + ' | ' +
  pad('Name', colW[2]) + ' | ' +
  pad('Threshold', colW[3]) + ' | ' +
  pad('Colors', colW[4]) + ' | Color details (hex: pixel_count)'
);
console.log('-'.repeat(colW[0]) + '-+-' + '-'.repeat(colW[1]) + '-+-' + '-'.repeat(colW[2]) + '-+-' + '-'.repeat(colW[3]) + '-+-' + '-'.repeat(colW[4]) + '-+' + '-'.repeat(60));

for (let i = 0; i < LEVELS.length; i++) {
  const level = LEVELS[i];
  const levelNum = i + 1;
  const filePath = path.join(EMOJI_DIR, level.emoji + '.png');

  if (!fs.existsSync(filePath)) {
    console.log(
      pad(levelNum, colW[0]) + ' | ' +
      pad(level.emoji, colW[1]) + ' | ' +
      pad(level.name, colW[2]) + ' | ' +
      pad(level.quantizeThreshold, colW[3]) + ' | ' +
      pad('N/A', colW[4]) + ' | FILE NOT FOUND'
    );
    continue;
  }

  try {
    const buf = fs.readFileSync(filePath);

    // Check if it's a real PNG
    if (buf[0] !== 137 || buf[1] !== 80) {
      console.log(
        pad(levelNum, colW[0]) + ' | ' +
        pad(level.emoji, colW[1]) + ' | ' +
        pad(level.name, colW[2]) + ' | ' +
        pad(level.quantizeThreshold, colW[3]) + ' | ' +
        pad('ERR', colW[4]) + ' | ' + buf.toString('ascii').slice(0, 60)
      );
      continue;
    }

    const { width, height, pixels } = decodePNG(buf);

    // Downsample from actual size to 18x18
    const downsampled = downsample(pixels, width, height, GRID_SIZE);

    // Quantize
    const { palette } = quantizeColors(downsampled, level.quantizeThreshold);

    // Sort palette by pixel count descending
    palette.sort((a, b) => b.count - a.count);

    const colorDetails = palette.map(c => `${c.hex}:${c.count}`).join('  ');

    console.log(
      pad(levelNum, colW[0]) + ' | ' +
      pad(level.emoji, colW[1]) + ' | ' +
      pad(level.name, colW[2]) + ' | ' +
      pad(level.quantizeThreshold, colW[3]) + ' | ' +
      pad(palette.length, colW[4]) + ' | ' +
      colorDetails
    );
  } catch (e) {
    console.log(
      pad(levelNum, colW[0]) + ' | ' +
      pad(level.emoji, colW[1]) + ' | ' +
      pad(level.name, colW[2]) + ' | ' +
      pad(level.quantizeThreshold, colW[3]) + ' | ' +
      pad('ERR', colW[4]) + ' | ERROR: ' + e.message
    );
  }
}
