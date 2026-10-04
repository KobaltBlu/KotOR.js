/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/src/tests/core/nwscript/compiler/NWScriptCompiler.retail.test.ts',
  ],
  testTimeout: 120000,
};
