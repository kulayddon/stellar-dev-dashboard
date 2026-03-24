import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
    // Prefer .ts over .js so imports of 'stellar' and 'store' resolve to the TS files
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
})
