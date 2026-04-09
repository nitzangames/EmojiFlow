// Layout constants — board fills nearly full width
var CELL_SIZE = 29;
var TRACK_MARGIN = 55;
var TRACK_WIDTH = 76;
var BOARD_PX = GRID_SIZE * CELL_SIZE; // 792
var BOARD_X = (1080 - BOARD_PX) / 2;  // 144
var BOARD_Y = 280;

// Wait slot layout
var WAIT_SLOT_W = 186;
var WAIT_SLOT_H = 140;
var WAIT_SLOT_RADIUS = 14;
var WAIT_SLOT_GAP = 10;

// Column layout
var COL_W = 190;
var COL_CARD_H = 142;
var COL_GAP = 12;
var COL_RADIUS = 16;
var COL_COL_GAP = 10;

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

function isLightColor(hex) {
  var c = hexToRgb(hex);
  var luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
  return luminance > 150;
}

function contrastText(hex) {
  return isLightColor(hex) ? '#000000' : '#ffffff';
}

function hexToRgba(hex, alpha) {
  var c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
}

// --- Background ---

function drawBackground(ctx) {
  ctx.fillStyle = '#1a1a3e';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = 'rgba(42,32,80,0.3)';
  ctx.fillRect(0, 0, 1080, 1920);
}

// --- HUD ---

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
  var trackTop = BOARD_Y - TRACK_MARGIN - TRACK_WIDTH / 2 - 6;
  ctx.fillText(levelDef.name.toUpperCase(), 540, (90 + trackTop) / 2);
  ctx.letterSpacing = '0px';
}

// --- Track ---

function drawTrack(ctx) {
  var bx = BOARD_X;
  var by = BOARD_Y;
  var bw = BOARD_PX;
  var bh = BOARD_PX;
  var margin = TRACK_MARGIN;
  var tw = TRACK_WIDTH;

  // Layer 0: Bright outer border
  var outerPad = margin + tw / 2 + 10;
  ctx.save();
  ctx.shadowColor = 'rgba(100,120,220,0.4)';
  ctx.shadowBlur = 30;
  ctx.strokeStyle = '#7080dd';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(bx - outerPad, by - outerPad, bw + outerPad * 2, bh + outerPad * 2, outerPad);
  ctx.stroke();
  ctx.restore();

  // Layer 1: Outer glow fill
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

// --- Board ---

function drawBoard(ctx, state, clearingCells) {
  // Board background
  ctx.fillStyle = '#141425';
  ctx.beginPath();
  ctx.roundRect(BOARD_X - 4, BOARD_Y - 4, BOARD_PX + 8, BOARD_PX + 8, 6);
  ctx.fill();

  for (var row = 0; row < GRID_SIZE; row++) {
    for (var col = 0; col < GRID_SIZE; col++) {
      var ci = state.board[row * GRID_SIZE + col];
      if (ci === 255) continue;

      // Check if this cell is being animated
      var clearing = null;
      if (clearingCells) {
        for (var a = 0; a < clearingCells.length; a++) {
          if (clearingCells[a].row === row && clearingCells[a].col === col) {
            clearing = clearingCells[a];
            break;
          }
        }
      }
      if (clearing) continue;

      var color = state.palette[ci];
      var x = BOARD_X + col * CELL_SIZE;
      var y = BOARD_Y + row * CELL_SIZE;

      // Bottom shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 2, CELL_SIZE - 2, CELL_SIZE - 2, 3);
      ctx.fill();

      // Cell
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 3);
      ctx.fill();
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
      ctx.beginPath();
      ctx.roundRect(x - s / 2, y - s / 2, s, s, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Shrinking cube
    if (cell.alpha > 0 && cell.scale > 0) {
      ctx.save();
      ctx.globalAlpha = cell.alpha;
      ctx.translate(x, y);
      ctx.scale(cell.scale, cell.scale);
      ctx.fillStyle = cell.colorHex;
      ctx.beginPath();
      ctx.roundRect(-s / 2, -s / 2, s, s, 3);
      ctx.fill();
      ctx.restore();
    }
  }
}

// --- Gradient Swatch ---

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

// --- Dashed Rounded Rect ---

function drawDashedRoundedRect(ctx, x, y, w, h, r, color, dashLen, gapLen) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.setLineDash([dashLen, gapLen]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// --- Wait Slots ---

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
      ctx.lineWidth = 3;
      ctx.stroke();

      // Gradient swatch
      drawGradientCircle(ctx, centerX, centerY - 20, 30, color.hex);

      // Ammo label
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('\u00D7' + shooter.ammo, centerX, centerY + 44);

      // Hit rect
      hitRects.push({ x: sx, y: slotY, w: WAIT_SLOT_W, h: WAIT_SLOT_H, type: 'wait', index: i });
    } else {
      // Empty slot — brighter
      ctx.fillStyle = 'rgba(30,30,70,0.5)';
      ctx.beginPath();
      ctx.roundRect(sx, slotY, WAIT_SLOT_W, WAIT_SLOT_H, WAIT_SLOT_RADIUS);
      ctx.fill();
      drawDashedRoundedRect(ctx, sx, slotY, WAIT_SLOT_W, WAIT_SLOT_H, WAIT_SLOT_RADIUS, '#555588', 8, 6);

      // Empty swatch circle
      ctx.strokeStyle = '#555588';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20, 30, 0, Math.PI * 2);
      ctx.stroke();

      // Dash label
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#555588';
      ctx.fillText('\u2014', centerX, centerY + 44);
    }
  }

  // "WAITING" label
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a4a7e';
  ctx.letterSpacing = '4px';
  ctx.fillText('WAITING', 540, slotY + WAIT_SLOT_H + 25);
  ctx.letterSpacing = '0px';
}

// --- Columns ---

function getColumnsY() {
  return BOARD_Y + BOARD_PX + TRACK_MARGIN + TRACK_WIDTH / 2 + 120;
}

function drawTrackCounter(ctx, orbitingCount, maxShooters) {
  var y = BOARD_Y + BOARD_PX + TRACK_MARGIN + TRACK_WIDTH / 2 + 80;
  var isFull = orbitingCount >= maxShooters;
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isFull ? '#ff6b6b' : '#81c784';
  ctx.fillText(orbitingCount + ' / ' + maxShooters, 540, y);
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

      if (s >= col.length) continue;

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
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, COL_CARD_H, COL_RADIUS);
        ctx.stroke();

        drawGradientCircle(ctx, centerX, centerY - 20, 30, color.hex);

        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('\u00D7' + shooter.ammo, centerX, centerY + 44);

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
        ctx.arc(centerX, centerY - 20, 30, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();

        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.fillText('?', centerX, centerY + 44);
        ctx.globalAlpha = 1;

      } else {
        // Third shooter — clipped peeking effect
        var clipH = COL_CARD_H * 0.35;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.roundRect(cx, cy, COL_W, clipH, [COL_RADIUS, COL_RADIUS, 0, 0]);
        ctx.clip();
        ctx.fillStyle = '#222250';
        ctx.fillRect(cx, cy, COL_W, clipH);
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + clipH);
        ctx.lineTo(cx, cy + COL_RADIUS);
        ctx.arcTo(cx, cy, cx + COL_RADIUS, cy, COL_RADIUS);
        ctx.lineTo(cx + COL_W - COL_RADIUS, cy);
        ctx.arcTo(cx + COL_W, cy, cx + COL_W, cy + COL_RADIUS, COL_RADIUS);
        ctx.lineTo(cx + COL_W, cy + clipH);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, cy + clipH * 0.5, 30, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// --- Orbit Shooter ---

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
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = contrastText(colorHex);
  ctx.fillText(ammo.toString(), x, y);
}

// --- Bullets ---

function drawBullet(ctx, x, y, colorHex) {
  var radius = 8;
  ctx.save();
  ctx.shadowColor = hexToRgba(colorHex, 0.8);
  ctx.shadowBlur = 12;
  var grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, lightenColor(colorHex, 60));
  grad.addColorStop(1, colorHex);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

// --- Particles ---

function drawParticles(ctx, particles) {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.colorHex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Overlays ---

function drawWinOverlay(ctx, stars, levelDef, emojiImage) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 1080, 1920);

  var starText = '';
  for (var i = 0; i < 3; i++) {
    starText += (i < stars) ? '\u2605' : '\u2606';
  }
  ctx.font = '120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd93d';
  ctx.fillText(starText, 540, 680);

  ctx.font = 'bold 64px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Level Complete!', 540, 830);

  if (emojiImage) {
    ctx.drawImage(emojiImage, 540 - 72, 960 - 72, 144, 144);
  }

  // Next Level button
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.roundRect(340, 1120, 400, 90, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText('Next Level', 540, 1165);

  return { x: 340, y: 1120, w: 400, h: 90 };
}

function drawLoseOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('Out of Ammo!', 540, 860);

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

// --- Title Screen ---

function drawTitleScreen(ctx, currentLevel, version) {
  drawBackground(ctx);

  // Decorative emoji
  var emojis = ['\uD83D\uDD34', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE1', '\uD83D\uDFE0', '\uD83D\uDFE3', '\u2B50', '\u2764\uFE0F'];
  ctx.globalAlpha = 0.06;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
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

  // Reset button
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(390, 1150, 300, 60, 12);
  ctx.fill();
  ctx.font = '28px Arial';
  ctx.fillStyle = '#666688';
  ctx.fillText('Reset Progress', 540, 1180);

  // Version
  ctx.font = '24px Arial';
  ctx.fillStyle = '#4a4a7e';
  ctx.fillText(version, 540, 1800);

  return { play: { x: 290, y: 990, w: 500, h: 120 }, reset: { x: 390, y: 1150, w: 300, h: 60 } };
}
