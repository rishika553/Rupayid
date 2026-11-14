import { defineConfig } from 'vitest/config';
import path from 'node:path';

// esbuild's automatic JSX transform supports component tests without another plugin.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@rupayaid/ui': path.resolve(__dirname, '../packages/ui'),
      '@rupayaid/types': path.resolve(__dirname, '../packages/types'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    css: false,
  },
});
