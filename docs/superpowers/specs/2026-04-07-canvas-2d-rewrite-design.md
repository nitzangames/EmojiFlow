# Canvas 2D Rewrite — Design Spec

**Date:** 2026-04-07  
**Goal:** Replace Phaser 3 with pure canvas 2D rendering. Same visual design, same animations, native gradients/shadows, no framework dependency.

## File Structure (after rewrite)

```
js/
  prng.js          — unchanged
  levels.js        — unchanged
  game-logic.js    — unchanged
  pixel-extract.js — minor refactor: extractBoard(image, threshold) takes HTMLImageElement
  tween.js         — NEW: minimal tween engine
  renderer.js      — NEW: all canvas 2D drawing (replaces game-scene.js)
  main.js          — REWRITE: state machine, canvas setup, input, image loading
```

**Deleted:** `game-scene.js`, `lib/phaser.min.js`

## Canvas Setup

- Single `<canvas>` element, 1080x1920 logical pixels
- CSS scaling to fit viewport: `object-fit: contain` centered in body
- `requestAnimationFrame` game loop calling `update(dt)` then `render(ctx)`

### Coordinate Translation (Input)

```
canvasRect = canvas.getBoundingClientRect()
scaleX = 1080 / canvasRect.width
scaleY = 1920 / canvasRect.height
gameX = (event.clientX - canvasRect.left) * scaleX
gameY = (event.clientY - canvasRect.top) * scaleY
```

## State Machine (main.js)

Four states: `title`, `loading`, `playing`, `overlay` (win/lose).

- **title** — draws title screen, listens for play button tap → transitions to `loading`
- **loading** — loads emoji PNG via `new Image()`, on load calls `extractBoard()` + `createGameState()` → transitions to `playing`
- **playing** — runs game loop, draws board/track/HUD/cards, handles column/wait-slot taps
- **overlay** — draws game board underneath + semi-transparent overlay + win/lose UI. Taps on buttons → transition to `loading` (next/retry) or `title`

## Tween Engine (tween.js)

Minimal system ticked by the game loop.

```js
// API
var tweenId = tweenTo(target, props, duration, ease, onComplete)
// target: any object with numeric properties
// props: { x: 500, y: 200, alpha: 0 }
// duration: ms
// ease: 'linear' | 'backIn'
// onComplete: callback

function updateTweens(dt) // called each frame
function clearTweens()    // kill all active tweens
```

Internally: array of active tweens, each storing start values, end values, elapsed time. Easing functions: `linear` (t), `backIn` (t * t * (2.7 * t - 1.7)).

## Renderer (renderer.js)

Collection of pure drawing functions. Each takes `ctx` + game state + layout constants. No mutable state of its own.

### Layout Constants

Same values as current Phaser implementation:

```js
var CELL_SIZE = 40;
var TRACK_MARGIN = 55;
var TRACK_WIDTH = 52;
var BOARD_X = (1080 - GRID_SIZE * CELL_SIZE) / 2;  // 180
var BOARD_Y = 200;
var BOARD_PX = GRID_SIZE * CELL_SIZE;               // 720
```

### Drawing Functions

```js
drawBackground(ctx)
drawHUD(ctx, levelNum, levelDef, totalStars)
drawTrack(ctx)
drawBoard(ctx, state, clearingCells)
drawWaitSlots(ctx, state)
drawColumns(ctx, state)
drawOrbitShooter(ctx, x, y, radius, colorHex, ammo)
drawWinOverlay(ctx, stars, levelDef)
drawLoseOverlay(ctx)
drawTitleScreen(ctx, currentLevel, version)
```

### Gradient Swatch Helper

```js
function drawGradientCircle(ctx, x, y, radius, hexColor) {
  var lighter = lightenColor(hexColor, 80);
  var darker = darkenColor(hexColor, 80);
  // Crescent shadow
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

### Rounded Rect Cards with Gradient Fill

```js
function drawCard(ctx, x, y, w, h, r, fillGradient, strokeColor, shadowColor) {
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fillGradient; // can be gradient or solid
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
```

### Level Pill with Gradient

```js
// Native linear gradient: left red → right orange
var grad = ctx.createLinearGradient(390, 30, 690, 30);
grad.addColorStop(0, '#ff6b6b');
grad.addColorStop(1, '#ee5a24');
// Shadow glow
ctx.shadowColor = 'rgba(238,90,36,0.4)';
ctx.shadowBlur = 10;
ctx.beginPath();
ctx.roundRect(390, 30, 300, 60, 30);
ctx.fillStyle = grad;
ctx.fill();
```

## Input Handling (main.js)

Single `pointerdown` listener on canvas. Hit-test logic:

```js
function handleTap(gameX, gameY) {
  if (gameState === 'overlay') {
    // hit-test overlay buttons (stored as {x,y,w,h} rects)
    return;
  }
  if (gameState === 'title') {
    // hit-test play button
    return;
  }
  // playing state:
  // 1. hit-test column cards (top card only per column)
  // 2. hit-test wait slot cards
  // Store button/card rects in a hitRects array, updated each frame
}
```

Hit rects are plain `{x, y, w, h}` objects stored in an array, rebuilt each render frame.

## Orbit Animation

Same structure as current implementation:

1. Build path: corner → edge positions → corner → ... for all 4 edges
2. Step through path points, tweening shooter circle from point to point (30ms per step)
3. On hit: flash white rect at cube position, scale+fade the cube out, pause 80ms, decrement ammo label
4. On complete: call `applyOrbit()`, `checkWinLose()`, redraw board

Shooter on track: gradient circle + white 2px stroke + glow (`shadowBlur`).

### Cube Clear Animation

Tracked as array of `{ row, col, scale, alpha, flashAlpha, elapsed }` objects. Each frame:
- `flashAlpha` fades 1→0 over 150ms (white overlay)
- `scale` shrinks 1→0 over 200ms with back-in ease
- `alpha` fades 1→0 over 200ms
- When elapsed > 200ms, remove from array

## pixel-extract.js Refactor

Change `extractBoard` signature:

```js
// Before:
function extractBoard(scene, textureKey, quantizeThreshold)
// After:
function extractBoard(image, quantizeThreshold)
```

Replace the Phaser texture lookup:
```js
// Before:
var texture = scene.textures.get(textureKey);
var source = texture.getSourceImage();
ctx.drawImage(source, 0, 0, srcSize, srcSize);
// After:
ctx.drawImage(image, 0, 0, srcSize, srcSize);
```

`downsample()` and `quantizeColors()` are unchanged.

## What Does NOT Change

- `prng.js` — no changes
- `levels.js` — no changes  
- `game-logic.js` — no changes (createGameState, computeOrbit, applyOrbit, launchFromColumn, launchFromWaitSlot, checkWinLose, calcStars)
- All game constants (GRID_SIZE=18, NUM_COLUMNS=4, NUM_WAIT_SLOTS=5)
- localStorage keys and persistence logic
- Visual layout, colors, sizes, spacing
- `meta.json`

## index.html Changes

```html
<body>
  <canvas id="game" width="1080" height="1920"></canvas>
  <script src="js/prng.js?v=20"></script>
  <script src="js/levels.js?v=20"></script>
  <script src="js/pixel-extract.js?v=20"></script>
  <script src="js/game-logic.js?v=20"></script>
  <script src="js/tween.js?v=20"></script>
  <script src="js/renderer.js?v=20"></script>
  <script src="js/main.js?v=20"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a1a; display: flex; align-items: center; justify-content: center; }
    canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</body>
```

Phaser script tag removed. `game-scene.js` removed.
