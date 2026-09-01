/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+.ts?$': ['ts-jest', {
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  testMatch: [
    '<rootDir>/src/tests/NWScriptCompiler.retail.test.ts',
  ],
  verbose: true,
  testTimeout: 120000,
};
