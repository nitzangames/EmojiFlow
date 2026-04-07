# Emoji Flow Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Emoji Flow prototype — an 18×18 pixel-art puzzle game where Twemoji PNGs are downsampled into colored boards and players launch orbiting shooters to clear them.

**Architecture:** Pure JS game logic (PRNG, pixel extraction, orbit computation, win/lose) loaded first, then a Phaser 3 scene layer handles rendering at 1080×1920 portrait with Scale.FIT. No bundler — vanilla JS via script tags.

**Tech Stack:** Phaser 3.x (vanilla JS, loaded from `lib/phaser.min.js`), Twemoji 72×72 PNGs, HTML5 Canvas for pixel extraction

---

### Task 1: Project Scaffolding

**Files:**
- Create: `meta.json`
- Create: `index.html`
- Create: `js/main.js`

- [ ] **Step 1: Create meta.json**

```json
{
  "slug": "emoji-flow",
  "title": "Emoji Flow",
  "description": "Clear the emoji board by launching color-matched orbiting shooters.",
  "tags": ["puzzle", "action"],
  "author": "Nitzan Wilnai",
  "thumbnail": "thumbnail.png"
}
```

- [ ] **Step 2: Download Phaser 3**

```bash
mkdir -p lib
curl -L -o lib/phaser.min.js "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"
```

Verify: `ls -la lib/phaser.min.js` — should be ~1MB.

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Emoji Flow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a1a; }
  </style>
</head>
<body>
  <script src="lib/phaser.min.js"></script>
  <script src="js/prng.js"></script>
  <script src="js/levels.js"></script>
  <script src="js/pixel-extract.js"></script>
  <script src="js/game-logic.js"></script>
  <script src="js/game-scene.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create js/main.js with minimal Phaser boot**

```js
const config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 1920,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [],
};

const game = new Phaser.Game(config);
```

- [ ] **Step 5: Create empty stub files so index.html loads without errors**

Create these files with minimal content:

`js/prng.js`:
```js
// Mulberry32 PRNG — will be implemented in Task 2
```

`js/levels.js`:
```js
// Level definitions — will be implemented in Task 3
```

`js/pixel-extract.js`:
```js
// Pixel extraction pipeline — will be implemented in Task 4
```

`js/game-logic.js`:
```js
// Game logic — will be implemented in Task 5
```

`js/game-scene.js`:
```js
// Game scene — will be implemented in Task 6
```

- [ ] **Step 6: Test in browser**

Open `index.html` in browser. Should see a black canvas centered on screen with no console errors.

- [ ] **Step 7: Commit**

```bash
git add meta.json index.html lib/phaser.min.js js/
git commit -m "feat: scaffold project with Phaser 3 boot"
```

---

### Task 2: Mulberry32 PRNG

**Files:**
- Create: `js/prng.js`

- [ ] **Step 1: Implement Mulberry32**

```js
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Shuffle array in place using seeded RNG
function seededShuffle(arr, rng) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
```

- [ ] **Step 2: Verify in browser console**

Open `index.html`, open dev console, run:
```js
var rng = mulberry32(42);
console.log(rng(), rng(), rng());
// Should produce same 3 numbers every time with seed 42
var rng2 = mulberry32(42);
console.log(rng2() === 0.20997602399438620); // first value check
```

- [ ] **Step 3: Commit**

```bash
git add js/prng.js
git commit -m "feat: add Mulberry32 seeded PRNG and seededShuffle"
```

---

### Task 3: Level Definitions

**Files:**
- Create: `js/levels.js`

- [ ] **Step 1: Create curated level list**

Define 20 levels to start (enough for prototype testing). Ordered by expected color complexity. Each entry has the Twemoji Unicode codepoint and a human-readable name. Include `ammoBuffer` (fraction of extra ammo) and `quantizeThreshold` (RGB distance for color merging).

```js
var LEVELS = [
  // Band 1: 2-3 colors (levels 1-10)
  { emoji: '1f534', name: 'Red Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e0', name: 'Orange Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e1', name: 'Yellow Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e2', name: 'Green Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f535', name: 'Blue Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e3', name: 'Purple Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2b50', name: 'Star', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2764-fe0f', name: 'Red Heart', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f49b', name: 'Yellow Heart', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f499', name: 'Blue Heart', ammoBuffer: 0.20, quantizeThreshold: 35 },

  // Band 2: 3-4 colors (levels 11-20)
  { emoji: '1f34e', name: 'Red Apple', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f34a', name: 'Tangerine', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f33b', name: 'Sunflower', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f525', name: 'Fire', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f4a7', name: 'Droplet', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f31f', name: 'Glowing Star', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f33a', name: 'Hibiscus', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f352', name: 'Cherries', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f353', name: 'Strawberry', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f438', name: 'Frog', ammoBuffer: 0.10, quantizeThreshold: 25 },
];

var GRID_SIZE = 18;
var NUM_COLUMNS = 4;
var NUM_WAIT_SLOTS = 5;
```

- [ ] **Step 2: Commit**

```bash
git add js/levels.js
git commit -m "feat: add curated level list with 20 levels"
```

---

### Task 4: Pixel Extraction Pipeline

**Files:**
- Create: `js/pixel-extract.js`

This is the core pipeline: load a 72×72 Twemoji PNG → downsample to 18×18 → quantize colors → return board + palette.

- [ ] **Step 1: Implement downsample function**

```js
// Downsample 72x72 image data to 18x18 by averaging 4x4 blocks
// imageData: ImageData from canvas.getContext('2d').getImageData()
// Returns: { pixels: [{r,g,b,a}, ...], width: 18, height: 18 }
function downsample(imageData, srcSize, dstSize) {
  var blockSize = srcSize / dstSize;
  var pixels = [];
  for (var dy = 0; dy < dstSize; dy++) {
    for (var dx = 0; dx < dstSize; dx++) {
      var rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      var count = 0;
      for (var by = 0; by < blockSize; by++) {
        for (var bx = 0; bx < blockSize; bx++) {
          var sx = dx * blockSize + bx;
          var sy = dy * blockSize + by;
          var idx = (sy * srcSize + sx) * 4;
          rSum += imageData.data[idx];
          gSum += imageData.data[idx + 1];
          bSum += imageData.data[idx + 2];
          aSum += imageData.data[idx + 3];
          count++;
        }
      }
      pixels.push({
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count),
        a: Math.round(aSum / count),
      });
    }
  }
  return { pixels: pixels, width: dstSize, height: dstSize };
}
```

- [ ] **Step 2: Implement color quantization**

```js
// Euclidean RGB distance
function colorDistance(c1, c2) {
  var dr = c1.r - c2.r;
  var dg = c1.g - c2.g;
  var db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Quantize colors: merge nearby colors into clusters
// pixels: array of {r,g,b,a} from downsample
// threshold: max RGB distance to merge
// Returns: { palette: [{r,g,b,hex}], assignments: Uint8Array }
//   assignments[i] = colorIndex for pixel i, or 255 if transparent
function quantizeColors(pixels, threshold) {
  var ALPHA_CUTOFF = 128;
  var clusters = []; // [{r,g,b,count}]
  var assignments = new Uint8Array(pixels.length);

  for (var i = 0; i < pixels.length; i++) {
    var p = pixels[i];
    if (p.a < ALPHA_CUTOFF) {
      assignments[i] = 255;
      continue;
    }
    // Find nearest existing cluster
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var c = 0; c < clusters.length; c++) {
      var d = colorDistance(p, clusters[c]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = c;
      }
    }
    if (bestIdx >= 0 && bestDist < threshold) {
      // Merge into existing cluster (running average)
      var cl = clusters[bestIdx];
      var n = cl.count + 1;
      cl.r = Math.round((cl.r * cl.count + p.r) / n);
      cl.g = Math.round((cl.g * cl.count + p.g) / n);
      cl.b = Math.round((cl.b * cl.count + p.b) / n);
      cl.count = n;
      assignments[i] = bestIdx;
    } else {
      // New cluster
      assignments[i] = clusters.length;
      clusters.push({ r: p.r, g: p.g, b: p.b, count: 1 });
    }
  }

  // Build palette with hex strings
  var palette = clusters.map(function(cl) {
    var hex = '#' +
      ((1 << 24) + (cl.r << 16) + (cl.g << 8) + cl.b)
        .toString(16).slice(1);
    return { r: cl.r, g: cl.g, b: cl.b, hex: hex };
  });

  return { palette: palette, assignments: assignments };
}
```

- [ ] **Step 3: Implement the full extraction pipeline**

```js
// Extract board data from a loaded Phaser texture
// scene: Phaser scene (for creating temp canvas)
// textureKey: string key of the loaded 72x72 emoji texture
// quantizeThreshold: RGB distance threshold for color merging
// Returns: { board: Uint8Array(324), palette: [{r,g,b,hex}] }
function extractBoard(scene, textureKey, quantizeThreshold) {
  var srcSize = 72;
  var dstSize = GRID_SIZE; // 18

  // Draw texture to offscreen canvas to read pixels
  var canvas = document.createElement('canvas');
  canvas.width = srcSize;
  canvas.height = srcSize;
  var ctx = canvas.getContext('2d');

  var texture = scene.textures.get(textureKey);
  var source = texture.getSourceImage();
  ctx.drawImage(source, 0, 0, srcSize, srcSize);

  var imageData = ctx.getImageData(0, 0, srcSize, srcSize);
  var downsampled = downsample(imageData, srcSize, dstSize);
  var quantized = quantizeColors(downsampled.pixels, quantizeThreshold);

  return {
    board: quantized.assignments,
    palette: quantized.palette,
  };
}
```

- [ ] **Step 4: Test in browser**

This requires an emoji PNG to be present. We'll do a visual test after Task 5 when we download emoji assets. For now, verify no syntax errors by loading `index.html` and checking the console.

- [ ] **Step 5: Commit**

```bash
git add js/pixel-extract.js
git commit -m "feat: add pixel extraction pipeline (downsample + quantize)"
```

---

### Task 5: Download Twemoji Assets

**Files:**
- Create: `emoji/` directory with PNG files

- [ ] **Step 1: Create emoji directory and download PNGs for all 20 levels**

```bash
mkdir -p emoji
```

Download each emoji PNG used in `js/levels.js`. Twemoji assets are hosted at `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/`.

```bash
cd emoji
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f534.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f7e0.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f7e1.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f7e2.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f535.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f7e3.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2b50.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764-fe0f.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f49b.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f499.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34e.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34a.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f33b.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a7.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f31f.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f33a.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f352.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f353.png"
curl -L -O "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f438.png"
cd ..
```

- [ ] **Step 2: Verify all files downloaded**

```bash
ls -la emoji/
```

Should see 20 PNG files, each a few KB.

- [ ] **Step 3: Commit**

```bash
git add emoji/
git commit -m "feat: add Twemoji 72x72 PNGs for levels 1-20"
```

---

### Task 6: Game Logic

**Files:**
- Create: `js/game-logic.js`

- [ ] **Step 1: Implement createGameState**

```js
// Create initial game state from extracted board data and level config
// board: Uint8Array(324) from extractBoard
// palette: [{r,g,b,hex}] from extractBoard
// levelNumber: 1-based level index
// levelDef: entry from LEVELS array
function createGameState(board, palette, levelNumber, levelDef) {
  var rng = mulberry32(levelNumber * 7919);

  // Count cubes per color
  var cubeCounts = new Array(palette.length).fill(0);
  for (var i = 0; i < board.length; i++) {
    if (board[i] !== 255) {
      cubeCounts[board[i]]++;
    }
  }

  // Generate shooters: one per color, ammo = cubeCount + buffer
  var shooters = [];
  var totalAmmo = 0;
  for (var c = 0; c < palette.length; c++) {
    if (cubeCounts[c] === 0) continue;
    var ammo = Math.ceil(cubeCounts[c] * (1 + levelDef.ammoBuffer));
    shooters.push({ colorIndex: c, ammo: ammo });
    totalAmmo += ammo;
  }

  // Shuffle shooters
  seededShuffle(shooters, rng);

  // Deal into 4 columns round-robin
  var columns = [[], [], [], []];
  for (var s = 0; s < shooters.length; s++) {
    columns[s % NUM_COLUMNS].push(shooters[s]);
  }

  return {
    levelNumber: levelNumber,
    palette: palette,
    board: new Uint8Array(board), // copy
    columns: columns,
    waitSlots: [null, null, null, null, null],
    activeShooter: null,
    totalAmmo: totalAmmo,
    ammoUsed: 0,
    status: 'playing',
  };
}
```

- [ ] **Step 2: Implement computeOrbit**

```js
// Compute all shots a shooter takes during one clockwise orbit
// board: Uint8Array(324), 18x18 grid
// colorIndex: the shooter's color
// Returns: array of { edge, pos, row, col } for each hit
//   edge: 0=bottom, 1=right, 2=top, 3=left
//   pos: position along that edge (column or row index)
//   row, col: the board cell that gets hit
function computeOrbit(board, colorIndex) {
  var size = GRID_SIZE; // 18
  var hits = [];

  // Edge 0: Bottom — move L→R, fire UP each column
  for (var col = 0; col < size; col++) {
    for (var row = size - 1; row >= 0; row--) {
      if (board[row * size + col] === colorIndex) {
        hits.push({ edge: 0, pos: col, row: row, col: col });
        break;
      }
    }
  }

  // Edge 1: Right — move B→T, fire LEFT each row
  for (var row = size - 1; row >= 0; row--) {
    for (var col = size - 1; col >= 0; col--) {
      if (board[row * size + col] === colorIndex) {
        hits.push({ edge: 1, pos: size - 1 - row, row: row, col: col });
        break;
      }
    }
  }

  // Edge 2: Top — move R→L, fire DOWN each column
  for (var col = size - 1; col >= 0; col--) {
    for (var row = 0; row < size; row++) {
      if (board[row * size + col] === colorIndex) {
        hits.push({ edge: 2, pos: size - 1 - col, row: row, col: col });
        break;
      }
    }
  }

  // Edge 3: Left — move T→B, fire RIGHT each row
  for (var row = 0; row < size; row++) {
    for (var col = 0; col < size; col++) {
      if (board[row * size + col] === colorIndex) {
        hits.push({ edge: 3, pos: row, row: row, col: col });
        break;
      }
    }
  }

  return hits;
}
```

- [ ] **Step 3: Implement applyOrbit**

```js
// Apply orbit hits to game state
// state: GameState
// hits: array from computeOrbit
// shooter: { colorIndex, ammo }
// Returns: { hitsApplied: [{row,col}], shooterDest: 'wait'|'removed' }
function applyOrbit(state, hits, shooter) {
  var applied = [];
  for (var i = 0; i < hits.length; i++) {
    if (shooter.ammo <= 0) break;
    var h = hits[i];
    // Verify cell still has the matching color (not already cleared)
    if (state.board[h.row * GRID_SIZE + h.col] === shooter.colorIndex) {
      state.board[h.row * GRID_SIZE + h.col] = 255; // clear
      shooter.ammo--;
      state.ammoUsed++;
      applied.push({ row: h.row, col: h.col });
    }
  }

  // Route shooter after orbit
  var dest;
  if (shooter.ammo > 0) {
    // Try to place in a wait slot
    var placed = false;
    for (var s = 0; s < NUM_WAIT_SLOTS; s++) {
      if (state.waitSlots[s] === null) {
        state.waitSlots[s] = shooter;
        placed = true;
        break;
      }
    }
    dest = placed ? 'wait' : 'removed'; // if no slot available, shooter is lost
  } else {
    dest = 'removed';
  }

  state.activeShooter = null;
  return { hitsApplied: applied, shooterDest: dest };
}
```

- [ ] **Step 4: Implement launch and win/lose functions**

```js
// Launch the top shooter from a column
// Returns: { shooter, hits } or null if column is empty or orbit active
function launchFromColumn(state, colIndex) {
  if (state.activeShooter !== null) return null;
  if (state.status !== 'playing') return null;
  var col = state.columns[colIndex];
  if (col.length === 0) return null;

  var shooter = col.shift(); // remove top
  state.activeShooter = shooter;
  var hits = computeOrbit(state.board, shooter.colorIndex);
  return { shooter: shooter, hits: hits };
}

// Launch a shooter from a wait slot
// Returns: { shooter, hits } or null if slot is empty or orbit active
function launchFromWaitSlot(state, slotIndex) {
  if (state.activeShooter !== null) return null;
  if (state.status !== 'playing') return null;
  var shooter = state.waitSlots[slotIndex];
  if (shooter === null) return null;

  state.waitSlots[slotIndex] = null;
  state.activeShooter = shooter;
  var hits = computeOrbit(state.board, shooter.colorIndex);
  return { shooter: shooter, hits: hits };
}

// Check if the game is won or lost
function checkWinLose(state) {
  // Win: no cubes remain
  var cubesRemain = false;
  for (var i = 0; i < state.board.length; i++) {
    if (state.board[i] !== 255) {
      cubesRemain = true;
      break;
    }
  }
  if (!cubesRemain) {
    state.status = 'won';
    return;
  }

  // Lose: no shooters available anywhere
  if (state.activeShooter !== null) return; // still orbiting

  var hasShooters = false;
  for (var c = 0; c < state.columns.length; c++) {
    if (state.columns[c].length > 0) { hasShooters = true; break; }
  }
  if (!hasShooters) {
    for (var s = 0; s < state.waitSlots.length; s++) {
      if (state.waitSlots[s] !== null) { hasShooters = true; break; }
    }
  }
  if (!hasShooters) {
    state.status = 'lost';
  }
}

// Calculate star rating
// Returns: 0 (not won), 1, 2, or 3
function calcStars(state) {
  if (state.status !== 'won') return 0;
  var ammoRemaining = state.totalAmmo - state.ammoUsed;
  var fraction = ammoRemaining / state.totalAmmo;
  if (fraction >= 0.20) return 3;
  if (ammoRemaining > 0) return 2;
  return 1;
}
```

- [ ] **Step 5: Test in browser console**

Open `index.html`, open dev console. The functions are global, so test:
```js
// Quick sanity check — create a tiny board manually
var testBoard = new Uint8Array(324).fill(255);
testBoard[0] = 0; testBoard[1] = 0; testBoard[18] = 1;
var hits = computeOrbit(testBoard, 0);
console.log('Hits for color 0:', hits); // should find cells [0,0] and [0,1]
```

- [ ] **Step 6: Commit**

```bash
git add js/game-logic.js
git commit -m "feat: add game logic (state, orbit, launch, win/lose, stars)"
```

---

### Task 7: Game Scene — Board Rendering

**Files:**
- Create: `js/game-scene.js`
- Modify: `js/main.js`

This task renders the board, waiting slots, and shooter columns. No orbit animation yet — just the static layout.

- [ ] **Step 1: Create GameScene with preload and create**

```js
var GameScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function GameScene() {
    Phaser.Scene.call(this, { key: 'GameScene' });
    this.state = null;
    this.boardGraphics = null;
    this.cellSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.cubeSprites = []; // 2D array of Graphics rectangles
    this.waitSlotCards = [];
    this.columnCards = [];
    this.orbitActive = false;
  },

  preload: function() {
    // Load the emoji for the current level
    var levelNum = this.registry.get('levelNumber') || 1;
    var levelDef = LEVELS[levelNum - 1];
    this.load.image(levelDef.emoji, 'emoji/' + levelDef.emoji + '.png');
  },

  create: function() {
    var levelNum = this.registry.get('levelNumber') || 1;
    var levelDef = LEVELS[levelNum - 1];

    // Extract board from emoji
    var extracted = extractBoard(this, levelDef.emoji, levelDef.quantizeThreshold);
    this.state = createGameState(extracted.board, extracted.palette, levelNum, levelDef);

    // Layout constants
    this.cellSize = 54; // 18 * 54 = 972px, leaves margin in 1080 width
    var boardPixels = GRID_SIZE * this.cellSize;
    this.boardX = (1080 - boardPixels) / 2;
    this.boardY = 100; // top margin for HUD

    this.drawHUD(levelNum);
    this.drawBoard();
    this.drawWaitSlots();
    this.drawColumns();
  },

  drawHUD: function(levelNum) {
    // Level number
    this.add.text(540, 40, 'Level ' + levelNum, {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  },

  drawBoard: function() {
    var state = this.state;
    this.cubeSprites = [];

    // Board background
    this.boardGraphics = this.add.graphics();
    this.boardGraphics.fillStyle(0x111122, 1);
    this.boardGraphics.fillRoundedRect(
      this.boardX - 8, this.boardY - 8,
      GRID_SIZE * this.cellSize + 16, GRID_SIZE * this.cellSize + 16,
      8
    );

    // Draw orbit track border
    this.boardGraphics.lineStyle(4, 0x4fc3f7, 0.5);
    this.boardGraphics.strokeRoundedRect(
      this.boardX - 12, this.boardY - 12,
      GRID_SIZE * this.cellSize + 24, GRID_SIZE * this.cellSize + 24,
      10
    );

    // Draw cells
    for (var row = 0; row < GRID_SIZE; row++) {
      this.cubeSprites[row] = [];
      for (var col = 0; col < GRID_SIZE; col++) {
        var ci = state.board[row * GRID_SIZE + col];
        var x = this.boardX + col * this.cellSize;
        var y = this.boardY + row * this.cellSize;

        if (ci !== 255) {
          var color = state.palette[ci];
          var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
          var rect = this.add.rectangle(
            x + this.cellSize / 2, y + this.cellSize / 2,
            this.cellSize - 2, this.cellSize - 2,
            colorInt
          );
          rect.setData('row', row);
          rect.setData('col', col);
          this.cubeSprites[row][col] = rect;
        } else {
          this.cubeSprites[row][col] = null;
        }
      }
    }
  },

  drawWaitSlots: function() {
    var slotY = this.boardY + GRID_SIZE * this.cellSize + 40;
    var slotW = 140;
    var slotH = 100;
    var totalW = NUM_WAIT_SLOTS * slotW + (NUM_WAIT_SLOTS - 1) * 12;
    var startX = (1080 - totalW) / 2;

    this.waitSlotCards = [];
    for (var i = 0; i < NUM_WAIT_SLOTS; i++) {
      var sx = startX + i * (slotW + 12);
      var card = this.add.rectangle(sx + slotW / 2, slotY + slotH / 2, slotW, slotH, 0x111122);
      card.setStrokeStyle(3, 0x333355);
      card.setInteractive();
      card.setData('slotIndex', i);
      card.on('pointerdown', this.onWaitSlotTap, this);

      var label = this.add.text(sx + slotW / 2, slotY + slotH / 2, '', {
        fontSize: '28px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.waitSlotCards.push({ bg: card, label: label, x: sx, y: slotY, w: slotW, h: slotH });
    }

    this.add.text(540, slotY - 16, 'WAITING SLOTS', {
      fontSize: '22px', fontFamily: 'Arial', color: '#555577',
    }).setOrigin(0.5);

    this.waitSlotsY = slotY;
    this.updateWaitSlots();
  },

  updateWaitSlots: function() {
    for (var i = 0; i < NUM_WAIT_SLOTS; i++) {
      var card = this.waitSlotCards[i];
      var shooter = this.state.waitSlots[i];
      if (shooter) {
        var color = this.state.palette[shooter.colorIndex];
        var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
        card.bg.setStrokeStyle(3, colorInt);
        card.label.setText('×' + shooter.ammo);
        card.bg.setFillStyle(0x1a1a2e);
      } else {
        card.bg.setStrokeStyle(3, 0x333355);
        card.label.setText('');
        card.bg.setFillStyle(0x111122);
      }
    }
  },

  drawColumns: function() {
    var colY = this.waitSlotsY + 130;
    var colW = 200;
    var cardH = 80;
    var gap = 8;
    var totalW = NUM_COLUMNS * colW + (NUM_COLUMNS - 1) * 20;
    var startX = (1080 - totalW) / 2;

    this.columnCards = [];
    for (var c = 0; c < NUM_COLUMNS; c++) {
      var cx = startX + c * (colW + 20);
      var colCards = [];

      // Show up to 3 shooters per column
      for (var s = 0; s < 3; s++) {
        var cy = colY + s * (cardH + gap);
        var bg = this.add.rectangle(cx + colW / 2, cy + cardH / 2, colW, cardH, 0x111122);
        bg.setStrokeStyle(2, 0x333355);
        bg.setInteractive();
        bg.setData('colIndex', c);
        bg.setData('stackIndex', s);
        if (s === 0) {
          bg.on('pointerdown', this.onColumnTap, this);
        }

        var label = this.add.text(cx + colW / 2, cy + cardH / 2, '', {
          fontSize: '28px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        colCards.push({ bg: bg, label: label });
      }
      this.columnCards.push(colCards);
    }

    this.updateColumns();
  },

  updateColumns: function() {
    for (var c = 0; c < NUM_COLUMNS; c++) {
      var col = this.state.columns[c];
      for (var s = 0; s < 3; s++) {
        var card = this.columnCards[c][s];
        if (s < col.length) {
          var shooter = col[s];
          var color = this.state.palette[shooter.colorIndex];
          var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
          card.bg.setStrokeStyle(2, colorInt);
          card.bg.setFillStyle(0x1a1a2e);
          if (s === 0) {
            card.label.setText('×' + shooter.ammo);
            card.bg.setAlpha(1);
          } else {
            card.label.setText('?');
            card.bg.setAlpha(0.5);
          }
        } else {
          card.bg.setStrokeStyle(2, 0x333355);
          card.bg.setFillStyle(0x111122);
          card.label.setText('');
          card.bg.setAlpha(1);
        }
      }
    }
  },

  onColumnTap: function(pointer, localX, localY, event) {
    // Will be implemented in Task 8
  },

  onWaitSlotTap: function(pointer, localX, localY, event) {
    // Will be implemented in Task 8
  },
});
```

- [ ] **Step 2: Update main.js to register GameScene**

```js
var config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 1920,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

var game = new Phaser.Game(config);
game.registry.set('levelNumber', 1);
```

- [ ] **Step 3: Test in browser**

Open `index.html`. Should see:
- "Level 1" text at the top
- 18×18 grid of colored cells (the red circle emoji downsampled)
- 5 empty waiting slot rectangles
- 4 columns of shooter cards with colors and ammo counts

- [ ] **Step 4: Commit**

```bash
git add js/game-scene.js js/main.js
git commit -m "feat: add GameScene with board, wait slots, and column rendering"
```

---

### Task 8: Orbit Animation & Input

**Files:**
- Modify: `js/game-scene.js`

- [ ] **Step 1: Implement onColumnTap handler**

Add to `GameScene`:

```js
  onColumnTap: function(pointer, localX, localY, event) {
    if (this.orbitActive) return;
    var colIndex = event.target ? event.target.getData('colIndex') : pointer.gameObject.getData('colIndex');
    // Use the gameObject from the event
    var go = pointer.gameObject || event.target;
    var ci = go.getData('colIndex');
    var result = launchFromColumn(this.state, ci);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },

  onWaitSlotTap: function(pointer, localX, localY, event) {
    if (this.orbitActive) return;
    var go = pointer.gameObject || event.target;
    var si = go.getData('slotIndex');
    var result = launchFromWaitSlot(this.state, si);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },
```

- [ ] **Step 2: Implement orbit path calculation**

Add to `GameScene`:

```js
  // Get the pixel position for a shooter at a given edge and position
  getOrbitPosition: function(edge, pos) {
    var margin = 30; // distance outside the board
    var bx = this.boardX;
    var by = this.boardY;
    var bw = GRID_SIZE * this.cellSize;
    var bh = GRID_SIZE * this.cellSize;
    var step = this.cellSize;

    switch (edge) {
      case 0: // Bottom: L→R
        return { x: bx + pos * step + step / 2, y: by + bh + margin };
      case 1: // Right: B→T
        return { x: bx + bw + margin, y: by + bh - pos * step - step / 2 };
      case 2: // Top: R→L
        return { x: bx + bw - pos * step - step / 2, y: by - margin };
      case 3: // Left: T→B
        return { x: bx - margin, y: by + pos * step + step / 2 };
    }
  },

  // Get corner positions for smooth orbit path
  getOrbitCorner: function(cornerIndex) {
    var margin = 30;
    var bx = this.boardX;
    var by = this.boardY;
    var bw = GRID_SIZE * this.cellSize;
    var bh = GRID_SIZE * this.cellSize;

    switch (cornerIndex) {
      case 0: return { x: bx - margin, y: by + bh + margin };       // bottom-left (start)
      case 1: return { x: bx + bw + margin, y: by + bh + margin };  // bottom-right
      case 2: return { x: bx + bw + margin, y: by - margin };       // top-right
      case 3: return { x: bx - margin, y: by - margin };            // top-left
    }
  },
```

- [ ] **Step 3: Implement runOrbit — the main orbit animation sequence**

Add to `GameScene`:

```js
  runOrbit: function(shooter, hits) {
    this.orbitActive = true;
    this.updateColumns();
    this.updateWaitSlots();

    var color = this.state.palette[shooter.colorIndex];
    var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;

    // Create shooter sprite (colored circle)
    var startPos = this.getOrbitCorner(0); // bottom-left
    var shooterSprite = this.add.circle(startPos.x, startPos.y, 20, colorInt);
    shooterSprite.setStrokeStyle(3, 0xffffff);
    shooterSprite.setDepth(10);

    // Ammo label on shooter
    var ammoLabel = this.add.text(startPos.x, startPos.y, shooter.ammo.toString(), {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // Build full path: corners + hit positions along each edge
    var path = [];
    var scene = this;

    // For each edge, build waypoints
    for (var edge = 0; edge < 4; edge++) {
      // Start of edge (corner)
      path.push({ pos: this.getOrbitCorner(edge), hits: [] });

      // Positions along this edge where hits happen
      var edgeHits = hits.filter(function(h) { return h.edge === edge; });

      // All positions along this edge (0 to GRID_SIZE-1)
      for (var p = 0; p < GRID_SIZE; p++) {
        var wp = this.getOrbitPosition(edge, p);
        var hitHere = null;
        for (var eh = 0; eh < edgeHits.length; eh++) {
          if (edgeHits[eh].pos === p) {
            hitHere = edgeHits[eh];
            break;
          }
        }
        path.push({ pos: wp, hit: hitHere });
      }
    }
    // Final corner (back to start)
    path.push({ pos: this.getOrbitCorner(0), hits: [] });

    // Track which cells we visually clear during animation
    // (state.board is not mutated until applyOrbit at the end)
    var clearedDuringAnim = {};

    // Animate through path
    var stepIndex = 0;
    var moveSpeed = 30; // ms per step
    var animAmmo = shooter.ammo; // local copy for animation display

    var doStep = function() {
      if (stepIndex >= path.length) {
        // Orbit complete — apply state changes and clean up
        var result = applyOrbit(scene.state, hits, shooter);
        shooterSprite.destroy();
        ammoLabel.destroy();
        checkWinLose(scene.state);
        scene.orbitActive = false;
        scene.updateBoard();
        scene.updateWaitSlots();
        scene.updateColumns();
        scene.checkEndState();
        return;
      }

      var wp = path[stepIndex];
      stepIndex++;

      scene.tweens.add({
        targets: [shooterSprite, ammoLabel],
        x: wp.pos.x,
        y: wp.pos.y,
        duration: moveSpeed,
        ease: 'Linear',
        onComplete: function() {
          if (wp.hit && animAmmo > 0) {
            var cellKey = wp.hit.row + ',' + wp.hit.col;
            var cellIdx = wp.hit.row * GRID_SIZE + wp.hit.col;
            // Check cell has matching color and hasn't been visually cleared already
            if (scene.state.board[cellIdx] === shooter.colorIndex && !clearedDuringAnim[cellKey]) {
              scene.clearCube(wp.hit.row, wp.hit.col);
              clearedDuringAnim[cellKey] = true;
              animAmmo--;
              ammoLabel.setText(animAmmo.toString());
            }
          }
          doStep();
        },
      });
    };

    doStep();
  },
```

- [ ] **Step 4: Implement clearCube and updateBoard**

Add to `GameScene`:

```js
  // Visual-only cube clear — does NOT mutate state.board.
  // State mutation happens in applyOrbit after the full animation completes.
  clearCube: function(row, col) {
    var sprite = this.cubeSprites[row][col];
    if (!sprite) return;
    // Scale-out + fade
    this.tweens.add({
      targets: sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: function() {
        sprite.destroy();
      },
    });
    this.cubeSprites[row][col] = null;
  },

  updateBoard: function() {
    // Sync visual state with game state after applyOrbit
    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var ci = this.state.board[row * GRID_SIZE + col];
        var sprite = this.cubeSprites[row][col];
        if (ci === 255 && sprite) {
          sprite.destroy();
          this.cubeSprites[row][col] = null;
        }
      }
    }
  },
```

- [ ] **Step 5: Implement checkEndState**

Add to `GameScene`:

```js
  checkEndState: function() {
    if (this.state.status === 'won') {
      this.showWinScreen();
    } else if (this.state.status === 'lost') {
      this.showLoseScreen();
    }
  },

  showWinScreen: function() {
    var stars = calcStars(this.state);

    // Save progress
    var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
    if (this.state.levelNumber >= currentLevel) {
      localStorage.setItem('emoji-flow:currentLevel', (this.state.levelNumber + 1).toString());
    }
    var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
    var prev = allStars[this.state.levelNumber] || 0;
    if (stars > prev) {
      allStars[this.state.levelNumber] = stars;
      localStorage.setItem('emoji-flow:stars', JSON.stringify(allStars));
    }

    // Overlay
    var overlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.7).setDepth(20);

    var starText = '';
    for (var i = 0; i < 3; i++) {
      starText += (i < stars) ? '★' : '☆';
    }
    this.add.text(540, 800, starText, {
      fontSize: '120px', fontFamily: 'Arial', color: '#f9a825',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(540, 920, 'Level Complete!', {
      fontSize: '64px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    var nextBtn = this.add.rectangle(540, 1080, 400, 100, 0x4fc3f7).setDepth(21);
    nextBtn.setInteractive();
    var nextLabel = this.add.text(540, 1080, 'Next Level', {
      fontSize: '42px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    var scene = this;
    nextBtn.on('pointerdown', function() {
      var next = scene.state.levelNumber + 1;
      if (next > LEVELS.length) next = 1; // wrap around
      scene.registry.set('levelNumber', next);
      scene.scene.restart();
    });
  },

  showLoseScreen: function() {
    var overlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.7).setDepth(20);

    this.add.text(540, 880, 'Out of Ammo!', {
      fontSize: '64px', fontFamily: 'Arial', color: '#ff5555', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    var retryBtn = this.add.rectangle(540, 1040, 400, 100, 0xc62828).setDepth(21);
    retryBtn.setInteractive();
    this.add.text(540, 1040, 'Try Again', {
      fontSize: '42px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    var scene = this;
    retryBtn.on('pointerdown', function() {
      scene.scene.restart();
    });
  },
```

- [ ] **Step 6: Fix onColumnTap and onWaitSlotTap to use simpler approach**

Replace the tap handlers written in Step 1 with cleaner versions:

```js
  onColumnTap: function(pointer) {
    if (this.orbitActive) return;
    var ci = pointer.gameObject.getData('colIndex');
    var result = launchFromColumn(this.state, ci);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },

  onWaitSlotTap: function(pointer) {
    if (this.orbitActive) return;
    var si = pointer.gameObject.getData('slotIndex');
    var result = launchFromWaitSlot(this.state, si);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },
```

- [ ] **Step 7: Test in browser**

Open `index.html`. Should be able to:
1. See the board with colored cells
2. Tap a shooter column → see the colored circle orbit the board
3. Watch cubes disappear as the shooter passes matching columns/rows
4. See the shooter land in a waiting slot if ammo remains
5. Tap a waiting slot to re-launch
6. See win/lose screens when appropriate

- [ ] **Step 8: Commit**

```bash
git add js/game-scene.js
git commit -m "feat: add orbit animation, input handling, win/lose screens"
```

---

### Task 9: Title Screen

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add TitleScene to main.js**

Replace the contents of `js/main.js`:

```js
var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function TitleScene() {
    Phaser.Scene.call(this, { key: 'TitleScene' });
  },

  create: function() {
    // Background
    this.add.rectangle(540, 960, 1080, 1920, 0x0a0a1a);

    // Title
    this.add.text(540, 600, 'EMOJI', {
      fontSize: '140px', fontFamily: 'Arial', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(540, 760, 'FLOW', {
      fontSize: '140px', fontFamily: 'Arial', color: '#81c784', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Current level
    var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');

    // Play button
    var playBtn = this.add.rectangle(540, 1050, 500, 120, 0x4fc3f7, 1);
    playBtn.setStrokeStyle(4, 0xffffff);
    playBtn.setInteractive();

    this.add.text(540, 1050, 'PLAY — Level ' + currentLevel, {
      fontSize: '48px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    var scene = this;
    playBtn.on('pointerdown', function() {
      scene.registry.set('levelNumber', currentLevel);
      scene.scene.start('GameScene');
    });

    // Decorative emoji grid (subtle background)
    var emojis = ['🔴', '🟢', '🔵', '🟡', '🟠', '🟣', '⭐', '❤️'];
    for (var i = 0; i < 30; i++) {
      var x = Phaser.Math.Between(50, 1030);
      var y = Phaser.Math.Between(50, 1870);
      this.add.text(x, y, emojis[i % emojis.length], {
        fontSize: '48px',
      }).setAlpha(0.08);
    }
  },
});

var config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 1920,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, GameScene],
};

var game = new Phaser.Game(config);
```

- [ ] **Step 2: Test in browser**

Open `index.html`. Should see:
1. Title screen with "EMOJI FLOW" and "PLAY — Level 1" button
2. Tapping Play transitions to the game
3. After winning, next level increments
4. Returning to title shows updated level number

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add title screen with level persistence"
```

---

### Task 10: Polish & Bug Fixes

**Files:**
- Modify: `js/game-scene.js`

- [ ] **Step 1: Add orbit speed variation based on hits**

In `runOrbit`, the orbit currently moves at a constant 30ms per step. Make it pause slightly longer on hit cells for visual clarity:

In the `doStep` function inside `runOrbit`, change the `onComplete` callback:

```js
          onComplete: function() {
            if (wp.hit && shooter.ammo > 0) {
              var cellIdx = wp.hit.row * GRID_SIZE + wp.hit.col;
              if (scene.state.board[cellIdx] === shooter.colorIndex) {
                scene.clearCube(wp.hit.row, wp.hit.col);
                shooter.ammo--;
                ammoLabel.setText(shooter.ammo.toString());
                // Brief pause on hit for visual feedback
                scene.time.delayedCall(80, doStep);
                return;
              }
            }
            doStep();
          },
```

- [ ] **Step 2: Add a subtle flash on hit cubes**

In `clearCube`, add a white flash before the scale-out:

```js
  clearCube: function(row, col) {
    var sprite = this.cubeSprites[row][col];
    if (!sprite) return;

    // White flash
    var flash = this.add.rectangle(sprite.x, sprite.y, this.cellSize, this.cellSize, 0xffffff);
    flash.setDepth(5);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: function() { flash.destroy(); },
    });

    // Scale-out + fade (visual only — state mutated by applyOrbit)
    this.tweens.add({
      targets: sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: function() {
        sprite.destroy();
      },
    });
    this.cubeSprites[row][col] = null;
  },
```

- [ ] **Step 3: Add color swatch to shooter columns and wait slots**

In `updateColumns`, add a colored square swatch next to the ammo text for the top shooter:

Replace the top-shooter branch in `updateColumns`:
```js
          if (s === 0) {
            card.label.setText('×' + shooter.ammo);
            card.label.setColor(color.hex);
            card.bg.setAlpha(1);
          } else {
            card.label.setText('?');
            card.label.setColor('#888888');
            card.bg.setAlpha(0.5);
          }
```

In `updateWaitSlots`, color the ammo text:
```js
      if (shooter) {
        var color = this.state.palette[shooter.colorIndex];
        var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
        card.bg.setStrokeStyle(3, colorInt);
        card.label.setText('×' + shooter.ammo);
        card.label.setColor(color.hex);
        card.bg.setFillStyle(0x1a1a2e);
      } else {
        card.bg.setStrokeStyle(3, 0x333355);
        card.label.setText('');
        card.bg.setFillStyle(0x111122);
      }
```

- [ ] **Step 4: Test full gameplay loop**

1. Open `index.html`
2. Play through Level 1 (Red Circle — should be simple, 2-3 colors)
3. Verify orbit animation looks smooth
4. Verify cubes flash white and shrink when hit
5. Verify shooters go to wait slots and can be re-launched
6. Win the level, see stars, proceed to Level 2
7. Lose a level (exhaust all shooters), see retry screen

- [ ] **Step 5: Commit**

```bash
git add js/game-scene.js
git commit -m "feat: add orbit hit feedback (flash, pause) and colored shooter labels"
```
