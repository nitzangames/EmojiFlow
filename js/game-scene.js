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
    this.orbitActive = false;
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
