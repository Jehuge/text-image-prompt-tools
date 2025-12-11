import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true, // 允许外部访问
    hmr: {
      clientPort: 3000, // 确保 HMR WebSocket 使用正确的端口
    },
  },
});

