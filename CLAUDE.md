# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Emoji Flow — a one-tap action-puzzle game where the board IS an emoji. A 72×72 Twemoji PNG is downsampled to 18×18 pixels, each becoming a colored cube. Players launch orbiting shooters to clear matching cubes. Built for play.nitzan.games.

GDD: `docs/emoji_flow_gdd.docx` · Design spec: `docs/superpowers/specs/2026-04-06-emoji-flow-prototype-design.md`

## Development

- Open `index.html` in a browser to run the game (no build step required)
- No bundler, no npm — vanilla JS + Phaser 3 loaded from `lib/phaser.min.js`
- JS files loaded via `<script>` tags in order: prng → levels → pixel-extract → game-logic → game-scene → main

## Architecture

- **Pure JS layer** (no Phaser dependency): `prng.js`, `levels.js`, `pixel-extract.js`, `game-logic.js`
- **Phaser layer**: `game-scene.js` (GameScene), `main.js` (TitleScene + Phaser config)
- Game logic is pure functions operating on a `GameState` object; Phaser only handles rendering, tweens, and input
- Board extraction pipeline: load 72×72 PNG → downsample to 18×18 → quantize colors → produces `board` (Uint8Array) + `palette` (hex colors)
- Orbit mechanic: shooter travels clockwise around 4 board edges, firing inward at nearest matching cube per column/row

## Key Files

- `js/levels.js` — curated level list (emoji codepoints, ammo buffer, quantize threshold) + constants (GRID_SIZE=18, NUM_COLUMNS=4, NUM_WAIT_SLOTS=5)
- `js/pixel-extract.js` — `downsample()`, `quantizeColors()`, `extractBoard()` pipeline
- `js/game-logic.js` — `createGameState()`, `computeOrbit()`, `applyOrbit()`, `launchFromColumn/WaitSlot()`, `checkWinLose()`, `calcStars()`
- `js/game-scene.js` — Phaser GameScene: board rendering, orbit animation, input, win/lose screens
- `js/main.js` — TitleScene + Phaser config (1080×1920, Scale.FIT)

## Platform Constraints (play.nitzan.games)

- Runs in sandboxed iframe: `allow-scripts allow-pointer-lock allow-same-origin`
- No network requests — game must be fully self-contained
- localStorage keys prefixed with `emoji-flow:`
- Must have `meta.json` and `index.html` at project root
