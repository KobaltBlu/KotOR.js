/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "^.+.ts?$": ["ts-jest",{}],
  },
  testMatch: ['**/*.test.ts'],
  // Exclude Vitest-only tests that use adapters not in this repo (holocron port)
  // Exclude editorFindReferences: pulls in GameState -> three/examples/jsm (no types in Node test env)
  testPathIgnorePatterns: [
    '/node_modules/',
    'test_rim\\.test\\.ts$',
    'test_gff\\.test\\.ts$',
    'test_erf\\.test\\.ts$',
    'editorFindReferences\\.test\\.ts$',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};