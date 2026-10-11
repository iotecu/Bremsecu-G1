import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode === 'screen-test' ? [{
      name: 'bremsecu-screen-test-entry',
      transformIndexHtml: {
        order: 'pre' as const,
        handler(html: string) {
          return html
            .replace('/src/main.tsx', '/src/screen-test/main.tsx')
            .replace('<title>BREMSECU G1</title>', '<title>BREMSECU — EKRAN TESTİ</title>');
        },
      },
    }] : []),
  ],
  build: {
    outDir: mode === 'screen-test' ? 'dist-screen-test' : 'dist',
    emptyOutDir: true,
  },
}));
