import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis'
  },
  server: {
    port: 8301,
    allowedHosts: ['975b4bc7257b.apps-tunnel.monday.app']
  }
})
