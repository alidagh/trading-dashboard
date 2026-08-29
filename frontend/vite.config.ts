import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The contracts package is compild to CommonJS for Nest, so dev has to pre-bundle it
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@trading-dashboard/contracts'],
  },
})
