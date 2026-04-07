# Game Developer Guide

Instructions for building and deploying HTML5 games to play.nitzan.games.

## Game Structure

Create a folder under `games/<your-slug>/` with at minimum:

```
games/my-game/
  meta.json        # required — game metadata
  index.html       # required — game entry point (must be this exact name)
  thumbnail.png    # required — referenced by meta.json
  (any other JS/CSS/asset files)
```

### meta.json

```json
{
  "slug": "my-game",
  "title": "My Game",
  "description": "A short description of the game.",
  "tags": ["arcade", "puzzle"],
  "author": "Your Name",
  "thumbnail": "thumbnail.png"
}
```

- **slug** — URL-safe identifier (lowercase, hyphens). This becomes the URL: `play.nitzan.games/play/my-game`
- **title** — display name shown on the platform
- **description** — short description for the game card
- **tags** — array of category tags
- **author** — author name
- **thumbnail** — filename of the thumbnail image in the same folder (PNG recommended, used on the home page grid)

### index.html

This is the game entry point. All game code, styles, and assets must be reachable from this file. You can inline everything in a single HTML file or reference other files in the same folder.

## Sandbox Constraints

Games run inside a sandboxed iframe with these permissions:

```
sandbox="allow-scripts allow-pointer-lock allow-same-origin"
allow="gamepad; fullscreen"
```

### What works

- JavaScript (full access)
- Canvas / WebGL
- Pointer lock (for mouse-capture games)
- Gamepad API
- Fullscreen API
- **localStorage** — available for saving game state (scores, settings, progress)
- Audio (Web Audio API, `<audio>` elements)
- RequestAnimationFrame

### What does NOT work

- No network requests (fetch, XHR, WebSocket) — games must be fully self-contained
- No access to the parent page's DOM, cookies, or state
- No popups or navigation outside the iframe
- No clipboard access

### localStorage Convention

All games share the same storage origin. **You must prefix all localStorage keys with your game slug** to avoid collisions:

```js
// Good
localStorage.setItem('my-game:highscore', score);
localStorage.getItem('my-game:settings');

// Bad — will collide with other games
localStorage.setItem('highscore', score);
```

## Design Guidelines

- Games should be responsive and work at any viewport size (the iframe fills the available space)
- Target both desktop (keyboard/mouse) and mobile (touch) if possible
- Use a canvas-based approach for best performance
- Keep total asset size reasonable (the entire folder gets zipped and uploaded)

## Deploying

From the repository root:

```bash
./scripts/deploy-game.sh games/my-game
```

This requires `DEPLOY_KEY` to be set as an environment variable or defined in `.env.local` at the repo root.

The script will:
1. Validate that `meta.json` and `index.html` exist
2. Zip the folder contents
3. Upload to the deploy API
4. Report success or failure

Redeploying the same slug overwrites the previous version (deletes old files, uploads new ones, upserts the database row).

## Example

See `games/tic-tac-toe/` for a complete working example — single-file canvas game with AI opponent, difficulty modes, and localStorage-persisted stats.
