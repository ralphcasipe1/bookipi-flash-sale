import UnoCSS from '@unocss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), UnoCSS()],
  server: {
    port: 5173,
  },
});
