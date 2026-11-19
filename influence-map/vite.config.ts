import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { peopleData } from './vite-plugin-people.ts';

// INFLUENCE_MAP_DATA points the viewer at another folder (e.g. a scratch copy for testing).
const dataDir = process.env.INFLUENCE_MAP_DATA
  ? path.resolve(process.env.INFLUENCE_MAP_DATA)
  : fileURLToPath(new URL('./data/people', import.meta.url));

export default defineConfig(({ mode }) => {
  if (mode === 'artifact') {
    // `npm run build:artifact`: the claude.ai phone page. One classic script (app.js)
    // plus app.css, which scripts/build-artifact.mjs inlines into page.html.
    return {
      plugins: [react()],
      build: {
        outDir: 'dist-artifact',
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
          input: 'src/main.tsx',
          output: {
            format: 'iife',
            entryFileNames: 'app.js',
            assetFileNames: 'app[extname]',
          },
        },
      },
    };
  }

  if (mode === 'web') {
    // `npm run build:web`: the public site. Static files with relative paths, so it can be
    // served from any folder (GitHub Pages serves it under /VITAL/); scripts/build-web.mjs
    // writes the public data next to it as data.json.
    return {
      plugins: [react()],
      base: './',
      build: { outDir: 'dist-web', emptyOutDir: true },
    };
  }

  return {
    plugins: [react(), peopleData(dataDir)],
    server: {
      // Local only: never listen on the network.
      host: '127.0.0.1',
      port: 5173,
      open: true,
    },
    preview: {
      host: '127.0.0.1',
    },
  };
});
