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
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};