import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'vct-builder-app.onrender.com',
      'credential-design-tools.openpropertyassociation.ca',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/hash': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
})
