import Phaser from 'phaser';
import { bootGame } from './boot';

const game = bootGame();

// 调试钩子：浏览器控制台 / 自动化测试可通过 __BIP.game 访问场景
(window as unknown as { __BIP: { game: Phaser.Game } }).__BIP = { game };
