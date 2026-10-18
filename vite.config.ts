/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the large charting library out of the app entry so it caches
        // separately (the ~1.2 MB single chunk is the worst case otherwise).
        manualChunks: {
          recharts: ['recharts'],
          vendor: ['react', 'react-dom', 'clsx', 'lucide-react', 'tailwind-merge', 'topojson-client'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
