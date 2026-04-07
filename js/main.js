var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function TitleScene() {
    Phaser.Scene.call(this, { key: 'TitleScene' });
  },

  create: function() {
    this.add.rectangle(540, 960, 1080, 1920, 0x0a0a1a);

    this.add.text(540, 1300, 'v5', {
      fontSize: '36px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(540, 600, 'EMOJI', {
      fontSize: '140px', fontFamily: 'Arial', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(540, 760, 'FLOW', {
      fontSize: '140px', fontFamily: 'Arial', color: '#81c784', fontStyle: 'bold',
    }).setOrigin(0.5);

    var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');

    var playBtn = this.add.rectangle(540, 1050, 500, 120, 0x4fc3f7, 1);
    playBtn.setStrokeStyle(4, 0xffffff);
    playBtn.setInteractive();

    this.add.text(540, 1050, 'PLAY \u2014 Level ' + currentLevel, {
      fontSize: '48px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    var scene = this;
    playBtn.on('pointerdown', function() {
      scene.registry.set('levelNumber', currentLevel);
      scene.scene.start('GameScene');
    });

    var emojis = ['\uD83D\uDD34', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE1', '\uD83D\uDFE0', '\uD83D\uDFE3', '\u2B50', '\u2764\uFE0F'];
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
  input: {
    activePointers: 1,
  },
  scene: [TitleScene, GameScene],
};

var game = new Phaser.Game(config);
