import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mediHomeApiPlugin } from './server/vitePlugin.mjs'

export default defineConfig({
  plugins: [react(), mediHomeApiPlugin()],
  // Keep Node-only AI packages out of the browser bundle.
  optimizeDeps: {
    exclude: ["@cursor/sdk", "tesseract.js"],
  },
  ssr: {
    external: ["@cursor/sdk", "tesseract.js"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Allow Cursor port-forward and temporary preview tunnels.
    allowedHosts: true,
  },
})
