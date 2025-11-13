// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

// Farklı export şekillerine karşı korumalı çözüm:
const monacoPluginFn =
  typeof monacoEditorPlugin === 'function'
    ? monacoEditorPlugin
    : typeof monacoEditorPlugin.default === 'function'
      ? monacoEditorPlugin.default
      : null

export default defineConfig({
  plugins: [
    react(),
    ...(monacoPluginFn
      ? [
          monacoPluginFn({
            languageWorkers: [
              'editorWorkerService',
              'json',
              'css',
              'html',
              'typescript',
            ],
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
