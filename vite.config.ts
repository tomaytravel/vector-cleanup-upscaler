import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/vector-cleanup-upscaler/',
  plugins: [react()],
});
