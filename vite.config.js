import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @imgly/background-removal ships its own WASM bundle and must not be
    // pre-bundled by Vite — let it load as-is so onnxruntime-web can resolve
    // its WASM sibling files at runtime.
    exclude: ['@imgly/background-removal'],
  },
  server: {
    proxy: {
      // Forward all /api/* calls to the Express server in development
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
