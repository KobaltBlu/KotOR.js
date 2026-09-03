/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/src/tests/audio/**/*.test.ts',
    '<rootDir>/src/tests/module/ModuleMGPlayer.swoop-start.test.ts',
    '<rootDir>/src/tests/module/ModuleMiniGame.swoop-steer.test.ts',
    '<rootDir>/src/tests/module/ModuleMiniGame.swoop-render.test.ts',
    '<rootDir>/src/tests/module/ModuleMiniGame.turret-m12ab.test.ts',
    '<rootDir>/src/tests/engine/pathfinding/get-obstruction-factor.test.ts',
    '<rootDir>/src/tests/nwscript/compiler/NWScriptVectorStack.test.ts',
  ],
};
