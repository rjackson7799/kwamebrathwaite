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
  },
})
