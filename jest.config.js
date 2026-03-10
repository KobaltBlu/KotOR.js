/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Style imports must come before the @/ alias so they are intercepted first.
    '\\.(css|scss|sass|less)$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
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
