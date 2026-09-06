/**
 * 微信小游戏入口。
 * 构建产物：npm run build:wx → dist-wx/game.js（连同 wechat/game.json、project.config.json
 * 一起用微信开发者工具打开）。
 */
import 'weapp-adapter'; // 提供 window/document/canvas/Image 等 DOM 垫片
import Phaser from 'phaser';
import { bootGame } from './boot';

const game = bootGame();

// 调试钩子
(globalThis as unknown as { __BIP: { game: Phaser.Game } }).__BIP = { game };
