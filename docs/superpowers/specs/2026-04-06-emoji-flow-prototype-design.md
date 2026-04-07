# Emoji Flow — Prototype Design Spec

> Platform: play.nitzan.games · Engine: Phaser 3 (vanilla JS) · Resolution: 1080×1920 portrait

## Concept

Emoji Flow is a one-tap action-puzzle game where the board IS an emoji. A 72×72 Twemoji PNG is downsampled to 18×18 pixels — each pixel becomes a colored cube on the board. Players launch color-matched shooters that orbit the board, firing inward to clear matching cubes. The emoji "dissolves" as the player clears it.

Difficulty scales naturally: simple emoji (🔴, ⭐) have 2–3 colors, complex emoji (🦊, 🌈) have 6+.

## Core Mechanics

### The Board (18×18 fixed grid)

- Each level picks one Twemoji (72×72 PNG)
- Downsample to 18×18 by averaging each 4×4 block of source pixels
- Quantize the resulting colors to a reduced palette (snap nearby colors together)
- Each of the 324 cells holds one colored cube, or is empty (transparent pixels in the source)
- Cubes are static until cleared by a matching shooter

### Color Extraction Pipeline

1. Load the 72×72 Twemoji PNG onto an offscreen canvas
2. Read pixel data via `getImageData`
3. For each 4×4 block, compute the average RGBA
4. Discard fully transparent pixels (alpha < 128) → mark cell as empty
5. Quantize opaque colors: group colors within a configurable distance threshold (Euclidean RGB distance, starting at 30, tunable per difficulty) into clusters
6. Each cluster becomes a "color channel" with a representative hex color
7. Result: `board[row][col] = colorIndex` (or 255 for empty), plus a `palette[]` of hex colors

### The Orbit Mechanic

A launched shooter travels around all 4 edges of the board in one clockwise orbit:

1. **Bottom edge** — moves left→right, fires UP at the nearest matching cube in each column
2. **Right edge** — moves bottom→top, fires LEFT at the nearest matching cube in each row
3. **Top edge** — moves right→left, fires DOWN at the nearest matching cube in each column
4. **Left edge** — moves top→bottom, fires RIGHT at the nearest matching cube in each row

Per column/row: the shooter fires at the **first** matching cube it sees from that edge. One shot per column/row. If no match exists, it passes without firing. Each hit costs 1 ammo.

After completing the orbit:
- If ammo remains → shooter goes to a waiting slot
- If ammo = 0 → shooter is removed

### 4-Column Shooter Queue

Below the board are 4 columns, each a vertical stack of shooters. Shooters can be different colors within the same column.

- Top shooter in each column is visible with its emoji and ammo count
- Deeper shooters are partially visible / faded, with hidden ammo ("?")
- Tap a column to launch its top shooter onto the orbit track
- Cannot launch while another shooter is mid-orbit

### 5 Waiting Slots

Between the board and the shooter columns, 5 waiting slots hold shooters that completed an orbit with ammo remaining.

- Tap a waiting slot to re-launch that shooter for another orbit
- Slot shows emoji icon, color border, and remaining ammo count
- Empty slots shown as dark outlines

### Win / Lose

- **Win:** All non-empty cells on the board are cleared
- **Lose:** All shooters in columns are exhausted AND all waiting slots are empty AND cubes remain on the board
- No time pressure in prototype scope

### Star Rating

- 3 stars: clear board with ≥ 20% total ammo remaining
- 2 stars: clear board with any ammo remaining
- 1 star: clear board (all ammo used)

## Level Design

### Progression

Levels are ordered by emoji complexity (number of distinct colors after quantization):

| Level Band | Colors | Example Emoji | Notes |
|---|---|---|---|
| 1–10 | 2–3 | 🔴 🟡 ⭐ 💛 | Tutorial — simple shapes, few colors |
| 11–30 | 3–4 | 🍎 🌻 💧 🔥 | Introduces more color variety |
| 31–60 | 4–6 | 🐸 🦊 🌈 🎃 | Strategy required — juggling multiple colors |

### Level Generation

Levels are not procedurally random — each level maps to a specific emoji. A curated level list defines the order:

```js
const LEVELS = [
  { emoji: '1f534', name: 'Red Circle' },    // level 1 — 2 colors
  { emoji: '2b50', name: 'Star' },            // level 2 — 3 colors
  // ...
];
```

At runtime:
1. Look up the emoji codepoint for the level number
2. Load the 72×72 PNG, downsample to 18×18, quantize colors
3. Generate shooter queue: for each color, `ammo = cubeCount + buffer` (buffer = 5–25% extra, seeded by level number for consistency)
4. Distribute shooters across 4 columns in a shuffled order (seeded PRNG)
5. Validate solvability: total ammo per color ≥ cube count for that color

### Ammo Buffer & Difficulty

- Easy levels: 20–25% ammo buffer (plenty of extra shots)
- Medium levels: 10–20% buffer
- Hard levels: 5–10% buffer (tight ammo economy)

### Shooter Column Distribution

Shooters are dealt into 4 columns round-robin in a shuffled order. The shuffle seed is derived from the level number so the layout is deterministic.

## Architecture

### File Structure

```
emoji-flow/
  meta.json              — platform metadata (slug, title, etc.)
  index.html             — entry point, loads scripts in order
  lib/phaser.min.js      — Phaser 3 runtime
  emoji/                 — Twemoji 72×72 PNGs (only the ones used in levels)
  js/prng.js             — Mulberry32 seeded PRNG
  js/levels.js           — curated level list (emoji codepoints + config)
  js/pixel-extract.js    — downsample + quantize pipeline
  js/game-logic.js       — pure state: orbit, shoot, win/lose, star rating
  js/game-scene.js       — Phaser scene: board rendering, orbit animation, input
  js/main.js             — Phaser config, boot, title screen
```

### Separation of Concerns

- **Pure JS layer** (`prng.js`, `levels.js`, `pixel-extract.js`, `game-logic.js`): no Phaser dependency. Handles level data, color extraction, and all game state mutations.
- **Phaser layer** (`game-scene.js`, `main.js`): rendering, tweens, input handling. Calls into logic functions and animates the results.

### Game State

```js
GameState = {
  levelNumber: Number,
  palette: [{ hex, r, g, b }],       // extracted color channels
  board: Uint8Array(324),             // 18×18, value = colorIndex or 255 (empty)
  columns: [                          // 4 shooter columns
    [{ colorIndex, ammo }, ...],      // index 0 = top
    ...
  ],
  waitSlots: Array(5),                // (ShooterDef | null)[5]
  activeShooter: null,                // shooter currently orbiting (or null)
  score: Number,
  status: 'playing' | 'won' | 'lost'
}
```

### Logic Functions

- `extractBoard(imageData, gridSize)` → `{ board: Uint8Array, palette: Color[] }`
- `generateShooters(board, palette, levelNumber)` → `{ columns: ShooterDef[][] }`
- `computeOrbit(board, shooter)` → `OrbitEvent[]` — list of `{ edge, position, hitRow, hitCol }` for animation
- `applyOrbit(state, orbitEvents)` → mutates board, decrements ammo, routes shooter to wait slot or removes
- `launchFromColumn(state, colIndex)` → sets activeShooter, returns orbit events
- `launchFromWaitSlot(state, slotIndex)` → same but from waiting slot
- `checkWinLose(state)` → updates status
- `calcStars(state)` → 1, 2, or 3

### Rendering (1080×1920)

- Phaser canvas: 1080×1920 with `Phaser.Scale.FIT` + `CENTER_BOTH`
- Board: centered in upper portion, each cell = 1080/18 = 60px square, colored with the extracted palette hex
- Orbit track: drawn as a path around the board edge using Phaser Graphics
- Shooter animation: Phaser tween along the orbit path, with hit effects (scale-out + particle) at each matching cube
- Waiting slots: row of 5 cards, 150px wide, between board and columns
- Shooter columns: 4 columns, each ~200px wide, stacked vertically
- Cube clear effect: tween scale 1→0 + alpha 1→0 over 200ms, optional particle burst

### Input

- Tap a shooter column → launches top shooter (if no active orbit)
- Tap a waiting slot → re-launches that shooter
- Tap anywhere else → no action (no accidental launches)

## Screens

### Title Screen
- Game title "Emoji Flow"
- Play button → starts at current level (persisted in localStorage)
- Simple background — could show a random emoji grid as decoration

### Gameplay Screen
- Full layout as designed: HUD bar, board with orbit track, waiting slots, 4 shooter columns

### Win Screen
- Star rating display (1–3 stars)
- "Next Level" button
- Shows the completed emoji image

### Lose Screen
- "Try Again" button
- Shows remaining cubes highlighted

## Persistence

All localStorage keys prefixed with `emoji-flow:`:
- `emoji-flow:currentLevel` — highest unlocked level
- `emoji-flow:stars` — JSON object mapping level number → star count

## Platform Constraints

- Runs in sandboxed iframe on play.nitzan.games
- No network requests — all assets bundled in folder
- No bundler — vanilla JS loaded via script tags
- Twemoji PNGs included locally in `emoji/` folder

## Out of Scope (Future Phases)

- Power-ups (bomb, rainbow, speed boost, reshuffle, extra time)
- Time-pressure levels
- Level select screen
- Shop / IAP / ads
- SFX and music
- Daily challenges / streak system
- Settings / pause menus
- Levels beyond 60
