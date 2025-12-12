// 此文件仅用于开发模式，生产构建使用 build.js 脚本
// 开发模式会直接使用 web 的开发服务器
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../web/src'),
      '@text-image-prompt-tools/ui': resolve(__dirname, '../ui/src/index.ts'),
      '@text-image-prompt-tools/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
});

