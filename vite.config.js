import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// in dev the api runs separately on 8787, so forward /api there.
// in prod express serves the built files and the api from one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'node',
  },
})
