import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const bypassHtml = (req) => {
  if (req.headers.accept?.includes('text/html')) {
    return '/index.html'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Forward current and future API routes to the Express backend.
      '/analyze': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/api': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/advisory': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/chat': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/classes': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/health': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/history': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/market': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/schemes': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/users': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
      '/weather': { target: 'http://localhost:8000', changeOrigin: true, bypass: bypassHtml },
    },
  },
  preview: {
    port: 3000,
  },
})
