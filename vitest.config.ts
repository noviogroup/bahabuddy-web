import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    // Don't pick up the archived/legacy code the tsconfig already excludes.
    exclude: ['node_modules', 'dist', '.next', 'src/_archive'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/_archive/**',
        'src/lib/sanity/**', // CMS client — covered by E2E
        'src/lib/supabase/**', // Wraps env-bound clients
        'src/lib/stripe/**', // Wraps env-bound clients
      ],
    },
  },
});
