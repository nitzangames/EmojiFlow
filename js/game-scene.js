var GameScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function GameScene() {
    Phaser.Scene.call(this, { key: 'GameScene' });
    this.state = null;
    this.boardGraphics = null;
    this.cellSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.cubeSprites = [];
    this.waitSlotCards = [];
    this.columnCards = [];
    this.columnSwatches = []; // color circle sprites per column
    this.orbitCount = 0;
  },

  preload: function() {
    var levelNum = this.registry.get('levelNumber') || 1;
    var levelDef = LEVELS[levelNum - 1];
    this.load.image(levelDef.emoji, 'emoji/' + levelDef.emoji + '.png');
  },

  create: function() {
    var levelNum = this.registry.get('levelNumber') || 1;
    var levelDef = LEVELS[levelNum - 1];

    var extracted = extractBoard(this, levelDef.emoji, levelDef.quantizeThreshold);
    this.state = createGameState(extracted.board, extracted.palette, levelNum, levelDef);

    this.cellSize = 40;
    this.trackMargin = 55;
    this.trackWidth = 52;
    var boardPixels = GRID_SIZE * this.cellSize;
    this.boardX = (1080 - boardPixels) / 2;
    this.boardY = 200;

    // Background gradient (approximate with rectangles)
    this.add.rectangle(540, 960, 1080, 1920, 0x1a1a3e);
    this.add.rectangle(540, 960, 1080, 1920, 0x2a2050, 0.3);

    this.drawHUD(levelNum, levelDef);
    this.drawBoard();
    this.drawWaitSlots();
    this.drawColumns();
  },

  drawHUD: function(levelNum, levelDef) {
    // Settings icon — larger
    var gearG = this.add.graphics();
    gearG.fillStyle(0xffffff, 0.1);
    gearG.fillCircle(80, 60, 32);
    this.add.text(80, 60, '⚙️', { fontSize: '32px' }).setOrigin(0.5);

    // Level pill — rounded, larger
    var pillG = this.add.graphics();
    pillG.fillStyle(0xee5a24, 1);
    pillG.fillRoundedRect(390, 30, 300, 60, 30);
    this.add.text(540, 60, 'Level ' + levelNum, {
      fontSize: '36px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Star counter — rounded pill
    var starG = this.add.graphics();
    starG.fillStyle(0xffffff, 0.1);
    starG.fillRoundedRect(880, 35, 150, 50, 25);
    this.add.text(925, 60, '⭐', { fontSize: '28px' }).setOrigin(0.5);
    var totalStars = 0;
    var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
    for (var k in allStars) totalStars += allStars[k];
    this.add.text(965, 60, '' + totalStars, {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Level name
    this.add.text(540, 110, levelDef.name.toUpperCase(), {
      fontSize: '24px', fontFamily: 'Arial', color: '#ffffff', letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.5);
  },

  drawTrack: function() {
    var margin = this.trackMargin;
    var trackWidth = this.trackWidth;
    var bx = this.boardX;
    var by = this.boardY;
    var bw = GRID_SIZE * this.cellSize;
    var bh = GRID_SIZE * this.cellSize;

    var g = this.add.graphics();

    // Layer 1: Outer glow border
    var glowX = bx - margin - trackWidth / 2 - 6;
    var glowY = by - margin - trackWidth / 2 - 6;
    var glowW = bw + (margin + trackWidth / 2 + 6) * 2;
    var glowH = bh + (margin + trackWidth / 2 + 6) * 2;
    var glowR = margin + trackWidth / 2 + 6;
    g.fillStyle(0x6070cc, 0.6);
    g.fillRoundedRect(glowX, glowY, glowW, glowH, glowR);

    // Layer 2: Outer track wall
    var wallX = bx - margin - trackWidth / 2 - 2;
    var wallY = by - margin - trackWidth / 2 - 2;
    var wallW = bw + (margin + trackWidth / 2 + 2) * 2;
    var wallH = bh + (margin + trackWidth / 2 + 2) * 2;
    var wallR = margin + trackWidth / 2 + 2;
    g.fillStyle(0x4a50a0, 1);
    g.fillRoundedRect(wallX, wallY, wallW, wallH, wallR);

    // Layer 3: Track channel (lighter blue)
    var outerX = bx - margin - trackWidth / 2;
    var outerY = by - margin - trackWidth / 2;
    var outerW = bw + margin * 2 + trackWidth;
    var outerH = bh + margin * 2 + trackWidth;
    var cornerR = margin + trackWidth / 2;
    g.fillStyle(0x2a3070, 1);
    g.fillRoundedRect(outerX, outerY, outerW, outerH, cornerR);

    // Layer 4: Inner track wall
    var innerWallX = bx - margin + trackWidth / 2 + 2;
    var innerWallY = by - margin + trackWidth / 2 + 2;
    var innerWallW = bw + (margin - trackWidth / 2 - 2) * 2;
    var innerWallH = bh + (margin - trackWidth / 2 - 2) * 2;
    var innerWallR = Math.max(margin - trackWidth / 2 - 2, 4);
    g.fillStyle(0x4a50a0, 1);
    g.fillRoundedRect(innerWallX, innerWallY, innerWallW, innerWallH, innerWallR);

    // Layer 5: Cut out board area
    var innerX = bx - margin + trackWidth / 2 + 6;
    var innerY = by - margin + trackWidth / 2 + 6;
    var innerW = bw + (margin - trackWidth / 2 - 6) * 2;
    var innerH = bh + (margin - trackWidth / 2 - 6) * 2;
    var innerR = Math.max(margin - trackWidth / 2 - 6, 2);
    g.fillStyle(0x1a1a3e, 1);
    g.fillRoundedRect(innerX, innerY, innerW, innerH, innerR);

    // Track lane guide
    var guideX = bx - margin;
    var guideY = by - margin;
    var guideW = bw + margin * 2;
    var guideH = bh + margin * 2;
    g.lineStyle(1, 0x8888cc, 0.2);
    g.strokeRoundedRect(guideX, guideY, guideW, guideH, margin);

    // Direction arrows
    var arrowG = this.add.graphics();
    arrowG.fillStyle(0x8888cc, 0.6);
    var arrowSize = 8;

    // Bottom: L→R
    for (var i = 0; i < 5; i++) {
      var ax = bx + (i + 1) * bw / 6;
      var ay = by + bh + margin;
      arrowG.fillTriangle(ax - arrowSize, ay - arrowSize / 2, ax - arrowSize, ay + arrowSize / 2, ax, ay);
    }
    // Right: B→T
    for (var i = 0; i < 5; i++) {
      var ax = bx + bw + margin;
      var ay = by + bh - (i + 1) * bh / 6;
      arrowG.fillTriangle(ax - arrowSize / 2, ay + arrowSize, ax + arrowSize / 2, ay + arrowSize, ax, ay);
    }
    // Top: R→L
    for (var i = 0; i < 5; i++) {
      var ax = bx + bw - (i + 1) * bw / 6;
      var ay = by - margin;
      arrowG.fillTriangle(ax + arrowSize, ay - arrowSize / 2, ax + arrowSize, ay + arrowSize / 2, ax, ay);
    }
    // Left: T→B
    for (var i = 0; i < 5; i++) {
      var ax = bx - margin;
      var ay = by + (i + 1) * bh / 6;
      arrowG.fillTriangle(ax - arrowSize / 2, ay - arrowSize, ax + arrowSize / 2, ay - arrowSize, ax, ay);
    }
  },

  drawBoard: function() {
    var state = this.state;
    this.cubeSprites = [];

    this.drawTrack();

    // Board background — dark inset
    this.boardGraphics = this.add.graphics();
    this.boardGraphics.fillStyle(0x0e0e22, 1);
    this.boardGraphics.fillRoundedRect(
      this.boardX - 4, this.boardY - 4,
      GRID_SIZE * this.cellSize + 8, GRID_SIZE * this.cellSize + 8,
      6
    );

    // Draw cells with depth shadow
    for (var row = 0; row < GRID_SIZE; row++) {
      this.cubeSprites[row] = [];
      for (var col = 0; col < GRID_SIZE; col++) {
        var ci = state.board[row * GRID_SIZE + col];
        var x = this.boardX + col * this.cellSize;
        var y = this.boardY + row * this.cellSize;

        if (ci !== 255) {
          var color = state.palette[ci];
          var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;

          // Bottom shadow for depth
          var shadow = this.add.rectangle(
            x + this.cellSize / 2, y + this.cellSize / 2 + 1,
            this.cellSize - 2, this.cellSize - 2,
            0x000000, 0.25
          );
          shadow.setData('isShadow', true);

          var rect = this.add.rectangle(
            x + this.cellSize / 2, y + this.cellSize / 2,
            this.cellSize - 2, this.cellSize - 2,
            colorInt
          );
          rect.setData('row', row);
          rect.setData('col', col);
          rect.setData('shadow', shadow);
          this.cubeSprites[row][col] = rect;
        } else {
          this.cubeSprites[row][col] = null;
        }
      }
    }
  },

  // Helper: create a rounded rect card (Graphics + invisible hit area for interaction)
  makeRoundedCard: function(x, y, w, h, radius, fillColor, strokeColor) {
    var g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2, strokeColor, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
    // Invisible hit area for interaction
    var hitZone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
    return { graphics: g, hitZone: hitZone, x: x, y: y, w: w, h: h, radius: radius };
  },

  // Helper: redraw a rounded card with new colors
  updateRoundedCard: function(card, fillColor, strokeColor, alpha) {
    card.graphics.clear();
    card.graphics.setAlpha(alpha !== undefined ? alpha : 1);
    card.graphics.fillStyle(fillColor, 1);
    card.graphics.fillRoundedRect(card.x, card.y, card.w, card.h, card.radius);
    card.graphics.lineStyle(2, strokeColor, 1);
    card.graphics.strokeRoundedRect(card.x, card.y, card.w, card.h, card.radius);
  },

  drawWaitSlots: function() {
    var slotY = this.boardY + GRID_SIZE * this.cellSize + this.trackMargin + this.trackWidth / 2 + 30;
    var slotW = 140;
    var slotH = 100;
    var radius = 14;
    var totalW = NUM_WAIT_SLOTS * slotW + (NUM_WAIT_SLOTS - 1) * 12;
    var startX = (1080 - totalW) / 2;

    this.waitSlotCards = [];
    for (var i = 0; i < NUM_WAIT_SLOTS; i++) {
      var sx = startX + i * (slotW + 12);
      var centerX = sx + slotW / 2;
      var centerY = slotY + slotH / 2;

      var card = this.makeRoundedCard(sx, slotY, slotW, slotH, radius, 0x1a1a40, 0x333355);
      (function(scene, idx) {
        card.hitZone.on('pointerdown', function() { scene.onWaitSlotTap(idx); });
      })(this, i);

      // Color swatch circle — larger
      var swatch = this.add.circle(centerX, centerY - 8, 20, 0x1a1a40);
      swatch.setStrokeStyle(2, 0x333355);

      var label = this.add.text(centerX, centerY + 28, '', {
        fontSize: '24px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.waitSlotCards.push({ card: card, swatch: swatch, label: label, centerX: centerX, centerY: centerY });
    }

    this.add.text(540, slotY + slotH + 10, 'WAITING', {
      fontSize: '18px', fontFamily: 'Arial', color: '#4a4a7e', letterSpacing: 4,
    }).setOrigin(0.5);

    this.waitSlotsY = slotY;
    this.waitSlotH = slotH;
    this.updateWaitSlots();
  },

  // Draw a dashed rounded rect (for empty slots)
  drawDashedRoundedRect: function(g, x, y, w, h, radius, color, dashLen, gapLen) {
    g.lineStyle(2, color, 0.5);
    // Approximate with dashed lines on each edge (skip corners — they're arcs)
    var r = radius;
    // Top edge
    for (var px = x + r; px < x + w - r; px += dashLen + gapLen) {
      var endX = Math.min(px + dashLen, x + w - r);
      g.lineBetween(px, y, endX, y);
    }
    // Bottom edge
    for (var px = x + r; px < x + w - r; px += dashLen + gapLen) {
      var endX = Math.min(px + dashLen, x + w - r);
      g.lineBetween(px, y + h, endX, y + h);
    }
    // Left edge
    for (var py = y + r; py < y + h - r; py += dashLen + gapLen) {
      var endY = Math.min(py + dashLen, y + h - r);
      g.lineBetween(x, py, x, endY);
    }
    // Right edge
    for (var py = y + r; py < y + h - r; py += dashLen + gapLen) {
      var endY = Math.min(py + dashLen, y + h - r);
      g.lineBetween(x + w, py, x + w, endY);
    }
    // Corner arcs
    g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    g.strokePath();
    g.beginPath();
    g.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2, false);
    g.strokePath();
    g.beginPath();
    g.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5, false);
    g.strokePath();
    g.beginPath();
    g.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI, false);
    g.strokePath();
  },

  updateWaitSlots: function() {
    for (var i = 0; i < NUM_WAIT_SLOTS; i++) {
      var slot = this.waitSlotCards[i];
      var shooter = this.state.waitSlots[i];
      if (shooter) {
        var color = this.state.palette[shooter.colorIndex];
        var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
        this.updateRoundedCard(slot.card, 0x2a2a5e, colorInt);
        slot.swatch.setFillStyle(colorInt);
        slot.swatch.setStrokeStyle(0);
        slot.label.setText('×' + shooter.ammo);
        slot.label.setColor(color.hex);
      } else {
        // Empty slot — dashed border look
        var c = slot.card;
        c.graphics.clear();
        c.graphics.fillStyle(0x1a1a40, 0.3);
        c.graphics.fillRoundedRect(c.x, c.y, c.w, c.h, c.radius);
        this.drawDashedRoundedRect(c.graphics, c.x, c.y, c.w, c.h, c.radius, 0x333355, 8, 6);
        slot.swatch.setFillStyle(0x1a1a40, 0);
        slot.swatch.setStrokeStyle(2, 0x333355);
        slot.label.setText('');
      }
    }
  },

  drawColumns: function() {
    var colY = this.waitSlotsY + this.waitSlotH + 50;
    var colW = 220;
    var cardH = 100;
    var gap = 8;
    var radius = 16;
    var totalW = NUM_COLUMNS * colW + (NUM_COLUMNS - 1) * 16;
    var startX = (1080 - totalW) / 2;

    this.columnCards = [];
    this.columnSwatches = [];
    for (var c = 0; c < NUM_COLUMNS; c++) {
      var cx = startX + c * (colW + 16);
      var colCards = [];
      var colSwatches = [];

      for (var s = 0; s < 3; s++) {
        var cy = colY + s * (cardH + gap);
        var centerX = cx + colW / 2;
        var centerY = cy + cardH / 2;

        var card = this.makeRoundedCard(cx, cy, colW, cardH, radius, 0x1a1a40, 0x333355);
        if (s === 0) {
          (function(scene, colIdx) {
            card.hitZone.on('pointerdown', function() { scene.onColumnTap(colIdx); });
          })(this, c);
        }

        // Color swatch circle — larger, matches mockup
        var swatch = this.add.circle(centerX, centerY - 10, 24, 0x333355);

        var label = this.add.text(centerX, centerY + 28, '', {
          fontSize: '26px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        colCards.push({ card: card, label: label });
        colSwatches.push(swatch);
      }
      this.columnCards.push(colCards);
      this.columnSwatches.push(colSwatches);
    }

    this.updateColumns();
  },

  updateColumns: function() {
    for (var c = 0; c < NUM_COLUMNS; c++) {
      var col = this.state.columns[c];
      for (var s = 0; s < 3; s++) {
        var entry = this.columnCards[c][s];
        var swatch = this.columnSwatches[c][s];
        if (s < col.length) {
          var shooter = col[s];
          var color = this.state.palette[shooter.colorIndex];
          var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
          if (s === 0) {
            // Top shooter — fully visible
            this.updateRoundedCard(entry.card, 0x2a2a5e, colorInt, 1);
            swatch.setFillStyle(colorInt);
            swatch.setAlpha(1);
            entry.label.setText('×' + shooter.ammo);
            entry.label.setColor('#ffffff');
            entry.label.setAlpha(1);
          } else if (s === 1) {
            // Second shooter — faded
            this.updateRoundedCard(entry.card, 0x222250, 0x444466, 0.5);
            swatch.setFillStyle(colorInt);
            swatch.setAlpha(0.5);
            entry.label.setText('?');
            entry.label.setColor('#888888');
            entry.label.setAlpha(0.5);
          } else {
            // Third shooter — very faded, partially clipped look
            this.updateRoundedCard(entry.card, 0x222250, 0x444466, 0.25);
            swatch.setFillStyle(colorInt);
            swatch.setAlpha(0.3);
            entry.label.setText('?');
            entry.label.setColor('#666666');
            entry.label.setAlpha(0.25);
          }
        } else {
          // No shooter — hide completely
          entry.card.graphics.clear();
          entry.label.setText('');
          swatch.setFillStyle(0x1a1a40);
          swatch.setAlpha(0);
        }
      }
    }
  },

  onColumnTap: function(colIndex) {
    var result = launchFromColumn(this.state, colIndex);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },

  onWaitSlotTap: function(slotIndex) {
    var result = launchFromWaitSlot(this.state, slotIndex);
    if (!result) return;
    this.runOrbit(result.shooter, result.hits);
  },

  getOrbitPosition: function(edge, pos) {
    var margin = this.trackMargin;
    var bx = this.boardX;
    var by = this.boardY;
    var bw = GRID_SIZE * this.cellSize;
    var bh = GRID_SIZE * this.cellSize;
    var step = this.cellSize;

    switch (edge) {
      case 0: return { x: bx + pos * step + step / 2, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh - pos * step - step / 2 };
      case 2: return { x: bx + bw - pos * step - step / 2, y: by - margin };
      case 3: return { x: bx - margin, y: by + pos * step + step / 2 };
    }
  },

  getOrbitCorner: function(cornerIndex) {
    var margin = this.trackMargin;
    var bx = this.boardX;
    var by = this.boardY;
    var bw = GRID_SIZE * this.cellSize;
    var bh = GRID_SIZE * this.cellSize;

    switch (cornerIndex) {
      case 0: return { x: bx - margin, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh + margin };
      case 2: return { x: bx + bw + margin, y: by - margin };
      case 3: return { x: bx - margin, y: by - margin };
    }
  },

  runOrbit: function(shooter, hits) {
    this.orbitCount++;
    this.updateColumns();
    this.updateWaitSlots();

    var color = this.state.palette[shooter.colorIndex];
    var colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;

    var startPos = this.getOrbitCorner(0);
    var shooterRadius = this.trackWidth / 2 - 6;

    // Glow behind shooter
    var glow = this.add.circle(startPos.x, startPos.y, shooterRadius + 8, colorInt, 0.3);
    glow.setDepth(9);

    var shooterSprite = this.add.circle(startPos.x, startPos.y, shooterRadius, colorInt);
    shooterSprite.setStrokeStyle(2, 0xffffff);
    shooterSprite.setDepth(10);

    var ammoLabel = this.add.text(startPos.x, startPos.y, shooter.ammo.toString(), {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    var path = [];
    var scene = this;

    for (var edge = 0; edge < 4; edge++) {
      path.push({ pos: this.getOrbitCorner(edge), hits: [] });

      var edgeHits = hits.filter(function(h) { return h.edge === edge; });

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
    path.push({ pos: this.getOrbitCorner(0), hits: [] });

    var clearedDuringAnim = {};
    var stepIndex = 0;
    var moveSpeed = 30;
    var animAmmo = shooter.ammo;

    var doStep = function() {
      if (stepIndex >= path.length) {
        var result = applyOrbit(scene.state, hits, shooter);
        shooterSprite.destroy();
        ammoLabel.destroy();
        glow.destroy();
        scene.orbitCount--;
        checkWinLose(scene.state);
        scene.updateBoard();
        scene.updateWaitSlots();
        scene.updateColumns();
        scene.checkEndState();
        return;
      }

      var wp = path[stepIndex];
      stepIndex++;

      scene.tweens.add({
        targets: [shooterSprite, ammoLabel, glow],
        x: wp.pos.x,
        y: wp.pos.y,
        duration: moveSpeed,
        ease: 'Linear',
        onComplete: function() {
          if (wp.hit && animAmmo > 0) {
            var cellKey = wp.hit.row + ',' + wp.hit.col;
            var cellIdx = wp.hit.row * GRID_SIZE + wp.hit.col;
            if (scene.state.board[cellIdx] === shooter.colorIndex && !clearedDuringAnim[cellKey]) {
              scene.clearCube(wp.hit.row, wp.hit.col);
              clearedDuringAnim[cellKey] = true;
              animAmmo--;
              ammoLabel.setText(animAmmo.toString());
              scene.time.delayedCall(80, doStep);
              return;
            }
          }
          doStep();
        },
      });
    };

    doStep();
  },

  clearCube: function(row, col) {
    var sprite = this.cubeSprites[row][col];
    if (!sprite) return;

    // Destroy shadow
    var shadow = sprite.getData('shadow');
    if (shadow) shadow.destroy();

    // White flash
    var flash = this.add.rectangle(sprite.x, sprite.y, this.cellSize, this.cellSize, 0xffffff);
    flash.setDepth(5);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: function() { flash.destroy(); },
    });

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
    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var ci = this.state.board[row * GRID_SIZE + col];
        var sprite = this.cubeSprites[row][col];
        if (ci === 255 && sprite) {
          var shadow = sprite.getData('shadow');
          if (shadow) shadow.destroy();
          sprite.destroy();
          this.cubeSprites[row][col] = null;
        }
      }
    }
  },

  checkEndState: function() {
    if (this.state.status === 'won') {
      this.showWinScreen();
    } else if (this.state.status === 'lost') {
      this.showLoseScreen();
    }
  },

  showWinScreen: function() {
    var stars = calcStars(this.state);

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

    var overlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.7).setDepth(20);

    var starText = '';
    for (var i = 0; i < 3; i++) {
      starText += (i < stars) ? '★' : '☆';
    }
    this.add.text(540, 800, starText, {
      fontSize: '120px', fontFamily: 'Arial', color: '#ffd93d',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(540, 920, 'Level Complete!', {
      fontSize: '64px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    // Show the original emoji
    var levelDef = LEVELS[this.state.levelNumber - 1];
    var emojiImg = this.add.image(540, 1000, levelDef.emoji);
    emojiImg.setScale(2);
    emojiImg.setDepth(21);

    var nextBtn = this.add.rectangle(540, 1140, 400, 90, 0x4fc3f7).setDepth(21);
    nextBtn.setStrokeStyle(3, 0xffffff);
    nextBtn.setInteractive();
    this.add.text(540, 1140, 'Next Level', {
      fontSize: '40px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    var scene = this;
    nextBtn.on('pointerdown', function() {
      var next = scene.state.levelNumber + 1;
      if (next > LEVELS.length) next = 1;
      scene.registry.set('levelNumber', next);
      scene.scene.restart();
    });
  },

  showLoseScreen: function() {
    var overlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.7).setDepth(20);

    this.add.text(540, 860, 'Out of Ammo!', {
      fontSize: '64px', fontFamily: 'Arial', color: '#ff6b6b', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    var retryBtn = this.add.rectangle(540, 1000, 400, 90, 0xee5a24).setDepth(21);
    retryBtn.setStrokeStyle(3, 0xffffff);
    retryBtn.setInteractive();
    this.add.text(540, 1000, 'Try Again', {
      fontSize: '40px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    var scene = this;
    retryBtn.on('pointerdown', function() {
      scene.scene.restart();
    });
  },
});
