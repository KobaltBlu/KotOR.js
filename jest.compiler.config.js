/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/src/tests/core/nwscript/compiler/NWScriptCompiler.oracle.test.ts',
  ],
  testTimeout: 120000,
};
