import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * 微信小游戏构建：单文件 CJS 产物 dist-wx/game.js
 * （小游戏主包上限 4MB，当前含 Phaser 约 1.5MB，余量充足）
 */
export default defineConfig({
  build: {
    outDir: 'dist-wx',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/wx-main.ts'),
      formats: ['cjs'],
      fileName: () => 'game.js',
    },
  },
});
