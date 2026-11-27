/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/src/tests/engine/audio/**/*.test.ts',
    '<rootDir>/src/tests/engine/module/minigame/MiniGamePlayer.swoop-start.test.ts',
    '<rootDir>/src/tests/engine/module/minigame/MiniGame.swoop-steer.test.ts',
    '<rootDir>/src/tests/engine/module/minigame/MiniGame.swoop-render.test.ts',
    '<rootDir>/src/tests/engine/module/minigame/MiniGame.turret-m12ab.test.ts',
    '<rootDir>/src/tests/engine/engine/pathfinding/get-obstruction-factor.test.ts',
    '<rootDir>/src/tests/core/nwscript/compiler/NWScriptVectorStack.test.ts',
  ],
};
