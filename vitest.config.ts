import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Lightweight harness for pure authz/lifecycle/validation logic. DB-backed RLS
// checks live in the manual + SQL probe matrix (see the plan), since they need
// a real Supabase connection.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration tests need a live Supabase connection and run via their own
    // config (vitest.integration.config.ts → `npm run test:integration`).
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
})
