import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/datasets.html'),
        models: resolve(__dirname, 'src/models.html'),
      },
      preserveEntrySignatures: 'strict',
      output: {
        manualChunks: {
          'datasets-index': ['./src/js/datasets-index.js'],
          'models-index': ['./src/js/models-index.js'],
          'rainfall': ['./src/js/rainfall.js'],
          'precision-recall': ['./src/js/precision-recall.js'],
          'teachable-machine': ['./src/js/teachable-machine.js'],
          'sigmoid-predict': ['./src/js/sigmoidPredict.js'],
          'rough-annotations': ['./src/js/roughAnnotations.js'],
        },
      },
    },
  },
  server: {
    port: 1234,
    open: '/datasets.html',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept-Encoding',
    },
    mimeTypes: {
      '.bin': 'application/octet-stream',
      '.json': 'application/json',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept-Encoding',
    },
    mimeTypes: {
      '.bin': 'application/octet-stream',
      '.json': 'application/json',
    },
  },
});