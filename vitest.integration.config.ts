import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Integration tests run against a REAL Supabase project (a dedicated TEST
// project — never production). They create + delete auth users and rows, so
// they self-skip unless SUPABASE_TEST_URL / _ANON_KEY / _SERVICE_ROLE_KEY are
// set (see tests/integration/README and the CI workflow). Pointed at distinct
// env names so they can never collide with the app's prod .env.local.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // RLS round-trips + user provisioning are slower than unit tests.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Shared DB state — don't run integration files in parallel against it.
    fileParallelism: false,
  },
})
