// 将微信小游戏配置文件复制到构建产物目录
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const out = resolve(root, 'dist-wx');
mkdirSync(out, { recursive: true });
copyFileSync(resolve(root, 'wechat/game.json'), resolve(out, 'game.json'));
copyFileSync(resolve(root, 'wechat/project.config.json'), resolve(out, 'project.config.json'));
console.log('[wx] game.json / project.config.json -> dist-wx/');
