import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/students': 'http://127.0.0.1:8000',
      '/repos': 'http://127.0.0.1:8000',
      '/teams': 'http://127.0.0.1:8000',
      '/profile': 'http://127.0.0.1:8000',
      '/requests': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/groups': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
