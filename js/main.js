var config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 1920,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

var game = new Phaser.Game(config);
game.registry.set('levelNumber', 1);
