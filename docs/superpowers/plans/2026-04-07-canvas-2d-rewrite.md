# Canvas 2D Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phaser 3 with pure canvas 2D rendering while keeping the exact same visual design, animations, and gameplay.

**Architecture:** Single `<canvas>` at 1080x1920 with CSS scaling. State machine (title/loading/playing/overlay) in main.js. Pure drawing functions in renderer.js. Minimal tween engine in tween.js. Game logic layer (prng, levels, game-logic, pixel-extract) stays unchanged except pixel-extract drops its Phaser dependency.

**Tech Stack:** Vanilla JS, Canvas 2D API, no frameworks

---

### Task 1: Tween Engine

**Files:**
- Create: `js/tween.js`

- [ ] **Step 1: Create tween.js with the tween system**

```js
var activeTweens = [];
var tweenIdCounter = 0;

function easingLinear(t) { return t; }
function easingBackIn(t) { return t * t * (2.7 * t - 1.7); }

var EASING = {
  linear: easingLinear,
  backIn: easingBackIn,
};

function tweenTo(target, props, duration, ease, onComplete) {
  var id = ++tweenIdCounter;
  var startValues = {};
  for (var key in props) {
    startValues[key] = target[key];
  }
  activeTweens.push({
    id: id,
    target: target,
    startValues: startValues,
    endValues: props,
    duration: duration,
    elapsed: 0,
    ease: EASING[ease] || easingLinear,
    onComplete: onComplete || null,
  });
  return id;
}

function updateTweens(dt) {
  var i = activeTweens.length;
  while (i--) {
    var tw = activeTweens[i];
    tw.elapsed += dt;
    var t = Math.min(tw.elapsed / tw.duration, 1);
    var eased = tw.ease(t);
    for (var key in tw.endValues) {
      tw.target[key] = tw.startValues[key] + (tw.endValues[key] - tw.startValues[key]) * eased;
    }
    if (t >= 1) {
      activeTweens.splice(i, 1);
      if (tw.onComplete) tw.onComplete();
    }
  }
}

function clearTweens() {
  activeTweens.length = 0;
}
```

- [ ] **Step 2: Verify file loads without errors**

Open browser console, confirm no syntax errors from tween.js loading.

- [ ] **Step 3: Commit**

```bash
git add js/tween.js
git commit -m "feat: add minimal tween engine for canvas rewrite"
```

---

### Task 2: Refactor pixel-extract.js

**Files:**
- Modify: `js/pixel-extract.js:82-103`

- [ ] **Step 1: Change extractBoard signature to accept HTMLImageElement**

Replace the `extractBoard` function:

```js
function extractBoard(image, quantizeThreshold) {
  var srcSize = 72;
  var dstSize = GRID_SIZE;

  var canvas = document.createElement('canvas');
  canvas.width = srcSize;
  canvas.height = srcSize;
  var ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, srcSize, srcSize);

  var imageData = ctx.getImageData(0, 0, srcSize, srcSize);
  var downsampled = downsample(imageData, srcSize, dstSize);
  var quantized = quantizeColors(downsampled.pixels, quantizeThreshold);

  return {
    board: quantized.assignments,
    palette: quantized.palette,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/pixel-extract.js
git commit -m "refactor: extractBoard takes HTMLImageElement instead of Phaser scene"
```

---

### Task 3: Renderer — Color Helpers and Layout Constants

**Files:**
- Create: `js/renderer.js`

- [ ] **Step 1: Create renderer.js with color helpers and layout constants**

```js
// Layout constants (same as Phaser version)
var CELL_SIZE = 40;
var TRACK_MARGIN = 55;
var TRACK_WIDTH = 52;
var BOARD_X = (1080 - GRID_SIZE * CELL_SIZE) / 2; // 180
var BOARD_Y = 200;
var BOARD_PX = GRID_SIZE * CELL_SIZE; // 720

// Wait slot layout
var WAIT_SLOT_W = 140;
var WAIT_SLOT_H = 100;
var WAIT_SLOT_RADIUS = 14;
var WAIT_SLOT_GAP = 12;

// Column layout
var COL_W = 180;
var COL_CARD_H = 110;
var COL_GAP = 8;
var COL_RADIUS = 16;
var COL_COL_GAP = 12;

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function lightenColor(hex, amount) {
  var c = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, c.r + amount),
    Math.min(255, c.g + amount),
    Math.min(255, c.b + amount)
  );
}

function darkenColor(hex, amount) {
  var c = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, c.r - amount),
    Math.max(0, c.g - amount),
    Math.max(0, c.b - amount)
  );
}

function hexToRgba(hex, alpha) {
  var c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
}
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer.js
git commit -m "feat: renderer.js with color helpers and layout constants"
```

---

### Task 4: Renderer — Background, HUD, Track

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Add drawBackground**

Append to renderer.js:

```js
function drawBackground(ctx) {
  ctx.fillStyle = '#1a1a3e';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = 'rgba(42,32,80,0.3)';
  ctx.fillRect(0, 0, 1080, 1920);
}
```

- [ ] **Step 2: Add drawHUD**

```js
function drawHUD(ctx, levelNum, levelDef, totalStars) {
  // Settings gear
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(80, 60, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2699\uFE0F', 80, 60);

  // Level pill with gradient
  ctx.save();
  ctx.shadowColor = 'rgba(238,90,36,0.4)';
  ctx.shadowBlur = 10;
  var pillGrad = ctx.createLinearGradient(390, 30, 690, 30);
  pillGrad.addColorStop(0, '#ff6b6b');
  pillGrad.addColorStop(1, '#ee5a24');
  ctx.beginPath();
  ctx.roundRect(390, 30, 300, 60, 30);
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('Level ' + levelNum, 540, 60);

  // Star counter pill
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.roundRect(880, 35, 150, 50, 25);
  ctx.fill();
  ctx.font = '28px Arial';
  ctx.fillText('\u2B50', 925, 60);
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('' + totalStars, 950, 60);

  // Level name
  ctx.textAlign = 'center';
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.letterSpacing = '4px';
  ctx.fillText(levelDef.name.toUpperCase(), 540, 110);
  ctx.letterSpacing = '0px';
}
```

- [ ] **Step 3: Add drawTrack**

```js
function drawTrack(ctx) {
  var bx = BOARD_X;
  var by = BOARD_Y;
  var bw = BOARD_PX;
  var bh = BOARD_PX;
  var margin = TRACK_MARGIN;
  var tw = TRACK_WIDTH;

  // Layer 1: Outer glow
  var glowPad = margin + tw / 2 + 6;
  ctx.fillStyle = 'rgba(96,112,204,0.6)';
  ctx.beginPath();
  ctx.roundRect(bx - glowPad, by - glowPad, bw + glowPad * 2, bh + glowPad * 2, glowPad);
  ctx.fill();

  // Layer 2: Outer wall
  var wallPad = margin + tw / 2 + 2;
  ctx.fillStyle = '#4a50a0';
  ctx.beginPath();
  ctx.roundRect(bx - wallPad, by - wallPad, bw + wallPad * 2, bh + wallPad * 2, wallPad);
  ctx.fill();

  // Layer 3: Track channel
  var chanPad = margin + tw / 2;
  var chanGrad = ctx.createLinearGradient(0, by - chanPad, 0, by + bh + chanPad);
  chanGrad.addColorStop(0, '#2a3070');
  chanGrad.addColorStop(1, '#353d88');
  ctx.fillStyle = chanGrad;
  ctx.beginPath();
  ctx.roundRect(bx - chanPad, by - chanPad, bw + chanPad * 2, bh + chanPad * 2, chanPad);
  ctx.fill();

  // Layer 4: Inner wall
  var innerWallPad = margin - tw / 2 - 2;
  ctx.fillStyle = '#4a50a0';
  ctx.beginPath();
  ctx.roundRect(bx - innerWallPad, by - innerWallPad, bw + innerWallPad * 2, bh + innerWallPad * 2, Math.max(innerWallPad, 4));
  ctx.fill();

  // Layer 5: Board cutout
  var innerPad = margin - tw / 2 - 6;
  ctx.fillStyle = '#1a1a3e';
  ctx.beginPath();
  ctx.roundRect(bx - innerPad, by - innerPad, bw + innerPad * 2, bh + innerPad * 2, Math.max(innerPad, 2));
  ctx.fill();

  // Track lane guide
  ctx.strokeStyle = 'rgba(136,136,204,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx - margin, by - margin, bw + margin * 2, bh + margin * 2, margin);
  ctx.stroke();

  // Direction arrows
  ctx.fillStyle = 'rgba(136,136,204,0.6)';
  var arrowSize = 8;
  var i;
  // Bottom: L->R
  for (i = 0; i < 5; i++) {
    var ax = bx + (i + 1) * bw / 6;
    var ay = by + bh + margin;
    ctx.beginPath();
    ctx.moveTo(ax - arrowSize, ay - arrowSize / 2);
    ctx.lineTo(ax - arrowSize, ay + arrowSize / 2);
    ctx.lineTo(ax, ay);
    ctx.fill();
  }
  // Right: B->T
  for (i = 0; i < 5; i++) {
    var ax = bx + bw + margin;
    var ay = by + bh - (i + 1) * bh / 6;
    ctx.beginPath();
    ctx.moveTo(ax - arrowSize / 2, ay + arrowSize);
    ctx.lineTo(ax + arrowSize / 2, ay + arrowSize);
    ctx.lineTo(ax, ay);
    ctx.fill();
  }
  // Top: R->L
  for (i = 0; i < 5; i++) {
    var ax = bx + bw - (i + 1) * bw / 6;
    var ay = by - margin;
    ctx.beginPath();
    ctx.moveTo(ax + arrowSize, ay - arrowSize / 2);
    ctx.lineTo(ax + arrowSize, ay + arrowSize / 2);
    ctx.lineTo(ax, ay);
    ctx.fill();
  }
  // Left: T->B
  for (i = 0; i < 5; i++) {
    var ax = bx - margin;
    var ay = by + (i + 1) * bh / 6;
    ctx.beginPath();
    ctx.moveTo(ax - arrowSize / 2, ay - arrowSize);
    ctx.lineTo(ax + arrowSize / 2, ay - arrowSize);
    ctx.lineTo(ax, ay);
    ctx.fill();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js
git commit -m "feat: renderer drawBackground, drawHUD, drawTrack"
```

---

### Task 5: Renderer — Board, Gradient Swatch, Cards

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Add drawBoard**

```js
function drawBoard(ctx, state, clearingCells) {
  // Board background
  ctx.fillStyle = '#0e0e22';
  ctx.beginPath();
  ctx.roundRect(BOARD_X - 4, BOARD_Y - 4, BOARD_PX + 8, BOARD_PX + 8, 6);
  ctx.fill();

  for (var row = 0; row < GRID_SIZE; row++) {
    for (var col = 0; col < GRID_SIZE; col++) {
      var ci = state.board[row * GRID_SIZE + col];
      if (ci === 255) continue;

      // Check if this cell is being animated (cleared)
      var clearing = null;
      if (clearingCells) {
        for (var a = 0; a < clearingCells.length; a++) {
          if (clearingCells[a].row === row && clearingCells[a].col === col) {
            clearing = clearingCells[a];
            break;
          }
        }
      }
      if (clearing) continue; // drawn separately during animation

      var color = state.palette[ci];
      var x = BOARD_X + col * CELL_SIZE;
      var y = BOARD_Y + row * CELL_SIZE;

      // Bottom shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 1, y + 2, CELL_SIZE - 2, CELL_SIZE - 2);

      // Cell
      ctx.fillStyle = color.hex;
      ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }
}

function drawClearingCells(ctx, state, clearingCells) {
  for (var i = clearingCells.length - 1; i >= 0; i--) {
    var cell = clearingCells[i];
    var x = BOARD_X + cell.col * CELL_SIZE + CELL_SIZE / 2;
    var y = BOARD_Y + cell.row * CELL_SIZE + CELL_SIZE / 2;
    var s = CELL_SIZE - 2;

    // White flash
    if (cell.flashAlpha > 0) {
      ctx.globalAlpha = cell.flashAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }

    // Shrinking cube
    if (cell.alpha > 0 && cell.scale > 0) {
      ctx.save();
      ctx.globalAlpha = cell.alpha;
      ctx.translate(x, y);
      ctx.scale(cell.scale, cell.scale);
      ctx.fillStyle = cell.colorHex;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 2: Add drawGradientCircle helper**

```js
function drawGradientCircle(ctx, x, y, radius, hexColor) {
  var lighter = lightenColor(hexColor, 80);
  var darker = darkenColor(hexColor, 80);

  // Crescent shadow below
  ctx.beginPath();
  ctx.arc(x, y + 5, radius, 0, Math.PI * 2);
  ctx.fillStyle = darker;
  ctx.fill();

  // Main circle with vertical gradient
  var grad = ctx.createLinearGradient(x, y - radius, x, y + radius);
  grad.addColorStop(0, lighter);
  grad.addColorStop(1, hexColor);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}
```

- [ ] **Step 3: Add drawDashedRoundedRect helper**

```js
function drawDashedRoundedRect(ctx, x, y, w, h, r, color, dashLen, gapLen) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([dashLen, gapLen]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js
git commit -m "feat: renderer drawBoard, drawGradientCircle, drawDashedRoundedRect"
```

---

### Task 6: Renderer — Wait Slots and Columns

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Add drawWaitSlots**

```js
function getWaitSlotY() {
  return BOARD_Y + BOARD_PX + TRACK_MARGIN + TRACK_WIDTH / 2 + 30;
}

function drawWaitSlots(ctx, state, hitRects) {
  var slotY = getWaitSlotY();
  var totalW = NUM_WAIT_SLOTS * WAIT_SLOT_W + (NUM_WAIT_SLOTS - 1) * WAIT_SLOT_GAP;
  var startX = (1080 - totalW) / 2;

  for (var i = 0; i < NUM_WAIT_SLOTS; i++) {
    var sx = startX + i * (WAIT_SLOT_W + WAIT_SLOT_GAP);
    var centerX = sx + WAIT_SLOT_W / 2;
    var centerY = slotY + WAIT_SLOT_H / 2;
    var shooter = state.waitSlots[i];

    if (shooter) {
      var color = state.palette[shooter.colorIndex];

      // Card background with colored border
      var cardGrad = ctx.createLinearGradient(sx, slotY, sx + WAIT_SLOT_W, slotY + WAIT_SLOT_H);
      cardGrad.addColorStop(0, '#2a2a5e');
      cardGrad.addColorStop(1, '#1a1a40');
      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      ctx.roundRect(sx, slotY, WAIT_SLOT_W, WAIT_SLOT_H, WAIT_SLOT_RADIUS);
      ctx.fill();
      ctx.strokeStyle = color.hex;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gradient swatch
      drawGradientCircle(ctx, centerX, centerY - 8, 20, color.hex);

      // Ammo label
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color.hex;
      ctx.fillText('\u00D7' + shooter.ammo, centerX, centerY + 28);

      // Hit rect
      hitRects.push({ x: sx, y: slotY, w: WAIT_SLOT_W, h: WAIT_SLOT_H, type: 'wait', index: i });
    } else {
      // Empty slot — dashed border
      ctx.fillStyle = 'rgba(26,26,64,0.3)';
      ctx.beginPath();
      ctx.roundRect(sx, slotY, WAIT_SLOT_W, WAIT_SLOT_H, WAIT_SLOT_RADIUS);
      ctx.fill();
      drawDashedRoundedRect(ctx, sx, slotY, WAIT_SLOT_W, WAIT_SLOT_H, WAIT_SLOT_RADIUS, '#333355', 8, 6);

      // Empty swatch circle
      ctx.strokeStyle = '#333355';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 8, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Dash label
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#333355';
      ctx.fillText('\u2014', centerX, centerY + 28);
    }
  }

  // "WAITING" label
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a4a7e';
  ctx.letterSpacing = '4px';
  ctx.fillText('WAITING', 540, slotY + WAIT_SLOT_H + 10);
  ctx.letterSpacing = '0px';
}
```

- [ ] **Step 2: Add drawColumns**

```js
function getColumnsY() {
  return getWaitSlotY() + WAIT_SLOT_H + 50;
}

function drawColumns(ctx, state, hitRects) {
  var colY = getColumnsY();
  var totalW = NUM_COLUMNS * COL_W + (NUM_COLUMNS - 1) * COL_COL_GAP;
  var startX = (1080 - totalW) / 2;

  for (var c = 0; c < NUM_COLUMNS; c++) {
    var cx = startX + c * (COL_W + COL_COL_GAP);
    var col = state.columns[c];

    for (var s = 0; s < 3; s++) {
      var cy = colY + s * (COL_CARD_H + COL_GAP);
      var centerX = cx + COL_W / 2;
      var centerY = cy + COL_CARD_H / 2;

      if (s >= col.length) continue; // no shooter here

      var shooter = col[s];
      var color = state.palette[shooter.colorIndex];

      if (s === 0) {
        // Top shooter — fully visible
        var cardGrad = ctx.createLinearGradient(cx, cy, cx + COL_W, cy + COL_CARD_H);
        cardGrad.addColorStop(0, '#2a2a5e');
        cardGrad.addColorStop(1, '#1a1a40');
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = cardGrad;
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, COL_CARD_H, COL_RADIUS);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = color.hex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, COL_CARD_H, COL_RADIUS);
        ctx.stroke();

        drawGradientCircle(ctx, centerX, centerY - 16, 24, color.hex);

        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('\u00D7' + shooter.ammo, centerX, centerY + 32);

        hitRects.push({ x: cx, y: cy, w: COL_W, h: COL_CARD_H, type: 'column', index: c });

      } else if (s === 1) {
        // Second shooter — faded
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#222250';
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, COL_CARD_H, COL_RADIUS);
        ctx.fill();
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY - 16, 24, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();

        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.fillText('?', centerX, centerY + 32);
        ctx.globalAlpha = 1;

      } else {
        // Third shooter — clipped peeking effect
        var clipH = COL_CARD_H * 0.35;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, clipH, { upperLeft: COL_RADIUS, upperRight: COL_RADIUS, lowerLeft: 0, lowerRight: 0 });
        ctx.clip();
        ctx.fillStyle = '#222250';
        ctx.fillRect(cx, cy, COL_W, clipH);
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 2;
        // Draw top + sides only
        ctx.beginPath();
        ctx.moveTo(cx, cy + clipH);
        ctx.lineTo(cx, cy + COL_RADIUS);
        ctx.arcTo(cx, cy, cx + COL_RADIUS, cy, COL_RADIUS);
        ctx.lineTo(cx + COL_W - COL_RADIUS, cy);
        ctx.arcTo(cx + COL_W, cy, cx + COL_W, cy + COL_RADIUS, COL_RADIUS);
        ctx.lineTo(cx + COL_W, cy + clipH);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, cy + clipH * 0.5, 24, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add js/renderer.js
git commit -m "feat: renderer drawWaitSlots, drawColumns"
```

---

### Task 7: Renderer — Orbit Shooter, Win/Lose Overlays, Title Screen

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Add drawOrbitShooter**

```js
function drawOrbitShooter(ctx, x, y, colorHex, ammo) {
  var radius = TRACK_WIDTH / 2 - 6;

  // Glow
  ctx.save();
  ctx.shadowColor = hexToRgba(colorHex, 0.7);
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(colorHex, 0.3);
  ctx.fill();
  ctx.restore();

  // Main circle with gradient
  var grad = ctx.createLinearGradient(x, y - radius, x, y + radius);
  grad.addColorStop(0, lightenColor(colorHex, 40));
  grad.addColorStop(1, colorHex);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ammo label
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ammo.toString(), x, y);
}
```

- [ ] **Step 2: Add drawWinOverlay**

```js
function drawWinOverlay(ctx, stars, levelDef, emojiImage) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 1080, 1920);

  // Stars
  var starText = '';
  for (var i = 0; i < 3; i++) {
    starText += (i < stars) ? '\u2605' : '\u2606';
  }
  ctx.font = '120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd93d';
  ctx.fillText(starText, 540, 800);

  // "Level Complete!"
  ctx.font = 'bold 64px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Level Complete!', 540, 920);

  // Emoji image
  if (emojiImage) {
    ctx.drawImage(emojiImage, 540 - 72, 1000 - 72, 144, 144);
  }

  // Next Level button
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.roundRect(340, 1095, 400, 90, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText('Next Level', 540, 1140);

  return { x: 340, y: 1095, w: 400, h: 90 };
}
```

- [ ] **Step 3: Add drawLoseOverlay**

```js
function drawLoseOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('Out of Ammo!', 540, 860);

  // Retry button
  ctx.fillStyle = '#ee5a24';
  ctx.beginPath();
  ctx.roundRect(340, 955, 400, 90, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Try Again', 540, 1000);

  return { x: 340, y: 955, w: 400, h: 90 };
}
```

- [ ] **Step 4: Add drawTitleScreen**

```js
function drawTitleScreen(ctx, currentLevel, version) {
  drawBackground(ctx);

  // Decorative emoji (subtle background)
  var emojis = ['\uD83D\uDD34', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE1', '\uD83D\uDFE0', '\uD83D\uDFE3', '\u2B50', '\u2764\uFE0F'];
  ctx.globalAlpha = 0.06;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Use seeded positions so they're consistent
  var rng = mulberry32(42);
  for (var i = 0; i < 40; i++) {
    var x = 50 + rng() * 980;
    var y = 50 + rng() * 1820;
    ctx.fillText(emojis[i % emojis.length], x, y);
  }
  ctx.globalAlpha = 1;

  // Title
  ctx.font = 'bold 160px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('EMOJI', 540, 550);
  ctx.fillStyle = '#81c784';
  ctx.fillText('FLOW', 540, 730);

  // Subtitle
  ctx.font = '36px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Clear the pixels!', 540, 840);

  // Play button
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.roundRect(290, 990, 500, 120, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PLAY \u2014 Level ' + currentLevel, 540, 1050);

  // Version
  ctx.font = '24px Arial';
  ctx.fillStyle = '#4a4a7e';
  ctx.fillText(version, 540, 1800);

  return { x: 290, y: 990, w: 500, h: 120 };
}
```

- [ ] **Step 5: Commit**

```bash
git add js/renderer.js
git commit -m "feat: renderer orbit shooter, overlays, title screen"
```

---

### Task 8: Main.js — State Machine, Game Loop, Input, Image Loading

**Files:**
- Rewrite: `js/main.js`

- [ ] **Step 1: Write main.js**

```js
(function() {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var VERSION = 'v20';
  var gameState = 'title'; // title | loading | playing | overlay
  var overlayType = null;  // 'won' | 'lost'
  var state = null;        // GameState from game-logic.js
  var levelNum = 1;
  var levelDef = null;
  var emojiImage = null;
  var hitRects = [];
  var overlayBtnRect = null;
  var titleBtnRect = null;

  // Orbit animation state
  var orbitRunners = []; // active orbit animations
  var clearingCells = []; // cells being animated out

  var lastTime = 0;

  // --- Image Loading ---
  function loadLevel(num) {
    levelNum = num;
    levelDef = LEVELS[num - 1];
    gameState = 'loading';
    emojiImage = new Image();
    emojiImage.onload = function() {
      var extracted = extractBoard(emojiImage, levelDef.quantizeThreshold);
      state = createGameState(extracted.board, extracted.palette, levelNum, levelDef);
      orbitRunners = [];
      clearingCells = [];
      clearTweens();
      gameState = 'playing';
    };
    emojiImage.src = 'emoji/' + levelDef.emoji + '.png';
  }

  // --- Input ---
  function hitTest(gx, gy, rect) {
    return gx >= rect.x && gx <= rect.x + rect.w && gy >= rect.y && gy <= rect.y + rect.h;
  }

  canvas.addEventListener('pointerdown', function(e) {
    var rect = canvas.getBoundingClientRect();
    var gx = (e.clientX - rect.left) * (1080 / rect.width);
    var gy = (e.clientY - rect.top) * (1920 / rect.height);

    if (gameState === 'title') {
      if (titleBtnRect && hitTest(gx, gy, titleBtnRect)) {
        var current = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
        loadLevel(current);
      }
      return;
    }

    if (gameState === 'overlay') {
      if (overlayBtnRect && hitTest(gx, gy, overlayBtnRect)) {
        if (overlayType === 'won') {
          var next = levelNum + 1;
          if (next > LEVELS.length) next = 1;
          loadLevel(next);
        } else {
          loadLevel(levelNum);
        }
      }
      return;
    }

    if (gameState === 'playing') {
      for (var i = 0; i < hitRects.length; i++) {
        var hr = hitRects[i];
        if (hitTest(gx, gy, hr)) {
          if (hr.type === 'column') {
            onColumnTap(hr.index);
          } else if (hr.type === 'wait') {
            onWaitSlotTap(hr.index);
          }
          return;
        }
      }
    }
  });

  // --- Game Actions ---
  function onColumnTap(colIndex) {
    var result = launchFromColumn(state, colIndex);
    if (!result) return;
    runOrbit(result.shooter, result.hits);
  }

  function onWaitSlotTap(slotIndex) {
    var result = launchFromWaitSlot(state, slotIndex);
    if (!result) return;
    runOrbit(result.shooter, result.hits);
  }

  // --- Orbit Animation ---
  function getOrbitPosition(edge, pos) {
    var bx = BOARD_X, by = BOARD_Y, bw = BOARD_PX, bh = BOARD_PX;
    var step = CELL_SIZE, margin = TRACK_MARGIN;
    switch (edge) {
      case 0: return { x: bx + pos * step + step / 2, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh - pos * step - step / 2 };
      case 2: return { x: bx + bw - pos * step - step / 2, y: by - margin };
      case 3: return { x: bx - margin, y: by + pos * step + step / 2 };
    }
  }

  function getOrbitCorner(cornerIndex) {
    var bx = BOARD_X, by = BOARD_Y, bw = BOARD_PX, bh = BOARD_PX;
    var margin = TRACK_MARGIN;
    switch (cornerIndex) {
      case 0: return { x: bx - margin, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh + margin };
      case 2: return { x: bx + bw + margin, y: by - margin };
      case 3: return { x: bx - margin, y: by - margin };
    }
  }

  function runOrbit(shooter, hits) {
    var color = state.palette[shooter.colorIndex];
    var startPos = getOrbitCorner(0);

    var runner = {
      shooter: shooter,
      hits: hits,
      colorHex: color.hex,
      x: startPos.x,
      y: startPos.y,
      ammo: shooter.ammo,
      clearedDuringAnim: {},
      path: [],
      stepIndex: 0,
      moving: false,
    };

    // Build path
    for (var edge = 0; edge < 4; edge++) {
      var corner = getOrbitCorner(edge);
      runner.path.push({ pos: corner, hit: null });

      var edgeHits = hits.filter(function(h) { return h.edge === edge; });
      for (var p = 0; p < GRID_SIZE; p++) {
        var wp = getOrbitPosition(edge, p);
        var hitHere = null;
        for (var eh = 0; eh < edgeHits.length; eh++) {
          if (edgeHits[eh].pos === p) { hitHere = edgeHits[eh]; break; }
        }
        runner.path.push({ pos: wp, hit: hitHere });
      }
    }
    runner.path.push({ pos: getOrbitCorner(0), hit: null });

    orbitRunners.push(runner);
    advanceOrbit(runner);
  }

  function advanceOrbit(runner) {
    if (runner.stepIndex >= runner.path.length) {
      // Orbit complete
      applyOrbit(state, runner.hits, runner.shooter);
      var idx = orbitRunners.indexOf(runner);
      if (idx >= 0) orbitRunners.splice(idx, 1);
      checkWinLose(state);
      checkEndState();
      return;
    }

    var wp = runner.path[runner.stepIndex];
    runner.stepIndex++;
    runner.moving = true;

    tweenTo(runner, { x: wp.pos.x, y: wp.pos.y }, 30, 'linear', function() {
      runner.moving = false;
      if (wp.hit && runner.ammo > 0) {
        var cellKey = wp.hit.row + ',' + wp.hit.col;
        var cellIdx = wp.hit.row * GRID_SIZE + wp.hit.col;
        if (state.board[cellIdx] === runner.shooter.colorIndex && !runner.clearedDuringAnim[cellKey]) {
          // Clear this cube with animation
          var color = state.palette[state.board[cellIdx]];
          clearingCells.push({
            row: wp.hit.row,
            col: wp.hit.col,
            colorHex: color.hex,
            scale: 1,
            alpha: 1,
            flashAlpha: 1,
            elapsed: 0,
          });
          state.board[cellIdx] = 255;
          runner.clearedDuringAnim[cellKey] = true;
          runner.ammo--;
          // Pause 80ms then continue
          setTimeout(function() { advanceOrbit(runner); }, 80);
          return;
        }
      }
      advanceOrbit(runner);
    });
  }

  function checkEndState() {
    if (state.status === 'won') {
      var stars = calcStars(state);
      var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
      if (state.levelNumber >= currentLevel) {
        localStorage.setItem('emoji-flow:currentLevel', (state.levelNumber + 1).toString());
      }
      var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
      var prev = allStars[state.levelNumber] || 0;
      if (stars > prev) {
        allStars[state.levelNumber] = stars;
        localStorage.setItem('emoji-flow:stars', JSON.stringify(allStars));
      }
      overlayType = 'won';
      gameState = 'overlay';
    } else if (state.status === 'lost') {
      overlayType = 'lost';
      gameState = 'overlay';
    }
  }

  // --- Update ---
  function update(dt) {
    updateTweens(dt);

    // Update clearing cell animations
    for (var i = clearingCells.length - 1; i >= 0; i--) {
      var cell = clearingCells[i];
      cell.elapsed += dt;
      cell.flashAlpha = Math.max(0, 1 - cell.elapsed / 150);
      var t = Math.min(cell.elapsed / 200, 1);
      var eased = easingBackIn(t);
      cell.scale = 1 - eased;
      cell.alpha = 1 - t;
      if (cell.elapsed >= 200) {
        clearingCells.splice(i, 1);
      }
    }
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, 1080, 1920);

    if (gameState === 'title') {
      var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
      titleBtnRect = drawTitleScreen(ctx, currentLevel, VERSION);
      return;
    }

    if (gameState === 'loading') {
      drawBackground(ctx);
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Loading...', 540, 960);
      return;
    }

    // playing or overlay — draw the game board
    var totalStars = 0;
    var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
    for (var k in allStars) totalStars += allStars[k];

    hitRects = [];
    drawBackground(ctx);
    drawHUD(ctx, levelNum, levelDef, totalStars);
    drawTrack(ctx);
    drawBoard(ctx, state, clearingCells);
    drawClearingCells(ctx, state, clearingCells);
    drawWaitSlots(ctx, state, hitRects);
    drawColumns(ctx, state, hitRects);

    // Draw orbit shooters
    for (var i = 0; i < orbitRunners.length; i++) {
      var runner = orbitRunners[i];
      drawOrbitShooter(ctx, runner.x, runner.y, runner.colorHex, runner.ammo);
    }

    // Overlay
    if (gameState === 'overlay') {
      if (overlayType === 'won') {
        var stars = calcStars(state);
        overlayBtnRect = drawWinOverlay(ctx, stars, levelDef, emojiImage);
      } else {
        overlayBtnRect = drawLoseOverlay(ctx);
      }
    }
  }

  // --- Game Loop ---
  function gameLoop(timestamp) {
    var dt = lastTime ? timestamp - lastTime : 16;
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // --- Start ---
  requestAnimationFrame(gameLoop);
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: main.js state machine, game loop, input, orbit animation"
```

---

### Task 9: Update index.html, Remove Phaser

**Files:**
- Rewrite: `index.html`
- Delete: `js/game-scene.js`
- Delete: `lib/phaser.min.js` (optional — can keep for reference)

- [ ] **Step 1: Rewrite index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Emoji Flow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a1a; display: flex; align-items: center; justify-content: center; }
    canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <canvas id="game" width="1080" height="1920"></canvas>
  <script src="js/prng.js?v=20"></script>
  <script src="js/levels.js?v=20"></script>
  <script src="js/pixel-extract.js?v=20"></script>
  <script src="js/game-logic.js?v=20"></script>
  <script src="js/tween.js?v=20"></script>
  <script src="js/renderer.js?v=20"></script>
  <script src="js/main.js?v=20"></script>
</body>
</html>
```

- [ ] **Step 2: Delete game-scene.js**

```bash
rm js/game-scene.js
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git rm js/game-scene.js
git commit -m "feat: canvas 2D rewrite — remove Phaser, update index.html"
```

---

### Task 10: Smoke Test and Fix

**Files:**
- Possibly modify: `js/renderer.js`, `js/main.js`

- [ ] **Step 1: Open game in browser and verify**

Open `http://localhost:8899/?nocache=1` and check:
- Title screen renders with EMOJI FLOW title, play button, version v20
- Tap play → level loads, board renders with colored cubes
- Track renders with 5-layer depth and direction arrows
- Wait slots show with correct colors and ammo counts
- Column cards show with gradient swatches and ammo labels
- Tap a column → shooter orbits the track, clears matching cubes
- Win/lose overlays appear correctly
- Next Level / Try Again buttons work

- [ ] **Step 2: Fix any rendering or interaction issues found**

Address any bugs discovered during smoke testing.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: canvas 2D smoke test fixes"
```
