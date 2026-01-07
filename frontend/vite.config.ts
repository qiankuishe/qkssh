import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: '../public',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3131',
        changeOrigin: true,
        ws: true
      },
      '/health': {
        target: 'http://localhost:3131',
        changeOrigin: true
      }
    }
  }
})
