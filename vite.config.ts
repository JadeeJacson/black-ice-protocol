import { defineConfig } from 'vite';

// base 使用相对路径，保证 GitHub Pages 子路径（/black-ice-protocol/）下可用
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
});
