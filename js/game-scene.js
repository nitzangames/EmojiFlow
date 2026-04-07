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

    this.cellSize = 54;
    var boardPixels = GRID_SIZE * this.cellSize;
    this.boardX = (1080 - boardPixels) / 2;
    this.boardY = 100;

    this.drawHUD(levelNum);
    this.drawBoard();
    this.drawWaitSlots();
    this.drawColumns();
  },

  drawHUD: function(levelNum) {
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

    this.boardGraphics = this.add.graphics();
    this.boardGraphics.fillStyle(0x111122, 1);
    this.boardGraphics.fillRoundedRect(
      this.boardX - 8, this.boardY - 8,
      GRID_SIZE * this.cellSize + 16, GRID_SIZE * this.cellSize + 16,
      8
    );

    this.boardGraphics.lineStyle(4, 0x4fc3f7, 0.5);
    this.boardGraphics.strokeRoundedRect(
      this.boardX - 12, this.boardY - 12,
      GRID_SIZE * this.cellSize + 24, GRID_SIZE * this.cellSize + 24,
      10
    );

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
      (function(scene, idx) {
        card.on('pointerdown', function() { scene.onWaitSlotTap(idx); });
      })(this, i);

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
        card.label.setColor(color.hex);
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

      for (var s = 0; s < 3; s++) {
        var cy = colY + s * (cardH + gap);
        var bg = this.add.rectangle(cx + colW / 2, cy + cardH / 2, colW, cardH, 0x111122);
        bg.setStrokeStyle(2, 0x333355);
        bg.setInteractive();
        bg.setData('colIndex', c);
        bg.setData('stackIndex', s);
        if (s === 0) {
          (function(scene, colIdx) {
            bg.on('pointerdown', function() { scene.onColumnTap(colIdx); });
          })(this, c);
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
            card.label.setColor(color.hex);
            card.bg.setAlpha(1);
          } else {
            card.label.setText('?');
            card.label.setColor('#888888');
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
    var margin = 30;
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
    var margin = 30;
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
    var shooterSprite = this.add.circle(startPos.x, startPos.y, 20, colorInt);
    shooterSprite.setStrokeStyle(3, 0xffffff);
    shooterSprite.setDepth(10);

    var ammoLabel = this.add.text(startPos.x, startPos.y, shooter.ammo.toString(), {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
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
        targets: [shooterSprite, ammoLabel],
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
              // Brief pause on hit for visual feedback
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

  updateBoard: function() {
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
      fontSize: '120px', fontFamily: 'Arial', color: '#f9a825',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(540, 920, 'Level Complete!', {
      fontSize: '64px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    var nextBtn = this.add.rectangle(540, 1080, 400, 100, 0x4fc3f7).setDepth(21);
    nextBtn.setInteractive();
    this.add.text(540, 1080, 'Next Level', {
      fontSize: '42px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
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
});
