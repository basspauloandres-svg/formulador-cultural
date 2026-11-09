const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/authenticated-persistence.spec.cjs',
  timeout: 145000,
  globalTimeout: 170000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.FC_E2E_URL || 'https://basspauloandres-svg.github.io/formulador-cultural/',
    browserName: 'chromium',
    screenshot: 'off',
    trace: 'off',
    video: 'off'
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ]
});
