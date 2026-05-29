/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    "^.+\\.ts?$": ["ts-jest", {
      tsconfig: {
        types: ['jest', 'node'],
        lib: ['ES2021'],
      },
      isolatedModules: true,
    }],
  },
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/tests/',
    'test_rim\\.test\\.ts$',
    'test_gff\\.test\\.ts$',
    'test_erf\\.test\\.ts$',
    'editorFindReferences\\.test\\.ts$',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
