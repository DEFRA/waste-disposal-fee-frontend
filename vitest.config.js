import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    env: {
      ENTRA_ID_AUTHORITY: 'https://login.test/tenant-id',
      ENTRA_ID_CLIENT_ID: 'frontend-client-id',
      ENTRA_ID_CLIENT_SECRET: 'frontend-client-secret',
      ENTRA_ID_API_SCOPE: 'api://calculator-api/.default',
      // Tests that check audit events mock @defra/cdp-auditing
      CDP_AUDIT_ENABLED: 'false'
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        'vitest.config.js',
        '.sonarlint',
        'babel.config.cjs'
      ]
    }
  }
})
