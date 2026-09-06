import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: (window.location.search.includes('canvas') ? Phaser.CANVAS : Phaser.AUTO) as number,
  parent: 'app',
  backgroundColor: '#05060e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, GameScene],
});

// 调试钩子：浏览器控制台 / 自动化测试可通过 __BIP.game 访问场景
(window as unknown as { __BIP: { game: Phaser.Game } }).__BIP = { game };
