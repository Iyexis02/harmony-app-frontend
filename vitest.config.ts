import { resolve } from 'node:path';

export default {
  test: {
    // jsdom is required for the @testing-library/react renderHook tests. It is a
    // superset of node for the fetch-mocking suites, so they run under it too.
    environment: 'jsdom',
    // formErrors.test.ts uses describe/it/expect without importing them; the rest
    // import explicitly, which is still fine when globals are enabled.
    globals: true,
    // Polyfills a localStorage that jsdom omits in this setup (see vitest.setup.ts).
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
};
