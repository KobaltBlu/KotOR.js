/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    "^.+.ts?$": ["ts-jest", {
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  setupFiles: ['<rootDir>/src/tests/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/tests/game/item-upgrade-utils.test.ts',
    '<rootDir>/src/tests/module/ModuleItem-upgrades.test.ts',
  ],
  verbose: true,
};
