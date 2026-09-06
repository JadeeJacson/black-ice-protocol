import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

/** 浏览器与微信小游戏共用的启动逻辑（入口分别在 main.ts / wx-main.ts） */
export function bootGame(): Phaser.Game {
  const isWx = !!(globalThis as { wx?: unknown }).wx;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    // 微信环境由 weapp-adapter 提供 body，无 #app 元素
    parent: isWx ? undefined : 'app',
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
  return game;
}
