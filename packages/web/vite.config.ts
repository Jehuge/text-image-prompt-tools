import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@text-image-prompt-tools/ui': resolve(__dirname, '../ui/src/index.ts'),
      '@text-image-prompt-tools/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@text-image-prompt-tools/ui', '@text-image-prompt-tools/core'],
  },
  server: {
    port: 3000,
    open: true,
    host: true, // 允许外部访问
    hmr: {
      clientPort: 3000, // 确保 HMR WebSocket 使用正确的端口
    },
  },
});

