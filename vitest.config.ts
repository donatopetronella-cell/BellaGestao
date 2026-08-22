import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      // `server-only` throws when resolved outside a React Server Component;
      // in tests the modules are imported directly.
      'server-only': path.resolve(process.cwd(), 'tests/stubs/server-only.ts'),
    },
  },
})
