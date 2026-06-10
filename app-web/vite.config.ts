import UnoCSS from '@unocss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '..',
  plugins: [react(), UnoCSS()],
  server: {
    port: 5173,
    proxy: {
      '/sale': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
