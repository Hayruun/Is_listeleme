import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { boardApiPlugin } from './src/server/boardApiPlugin';

// Uygulama hem `npm run dev` hem de `npm run preview` altinda ortak
// public/data/board.json dosyasina yazabilsin diye boardApiPlugin eklendi.
export default defineConfig({
  base: './',
  plugins: [react(), boardApiPlugin()],
  server: { port: 5173 },
});
