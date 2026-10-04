/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require("./jest.config.js");

module.exports = {
  ...base,
  collectCoverageFrom: [
    "src/engine/pathfinding/**/*.ts",
    "src/engine/movement/**/*.ts",
    "src/engine/actions/ActionForceFollowObject.ts",
    "src/engine/actions/ActionFollowLeader.ts",
    "src/engine/actions/ActionMoveToPoint.ts",
    "!src/engine/pathfinding/__harness__/**",
    "!src/tests/**",
  ],
  testMatch: [
    "<rootDir>/src/tests/engine/engine/pathfinding/**/*.test.ts",
    "<rootDir>/src/tests/engine/engine/movement/**/*.test.ts",
    "<rootDir>/src/tests/engine/module/ModuleArea.walk-candidates.cache.test.ts",
    "<rootDir>/src/tests/engine/actions/ActionFollowLeader.test.ts",
    "<rootDir>/src/tests/engine/actions/ActionForceFollowObject.test.ts",
    "<rootDir>/src/tests/engine/actions/ActionMoveToPoint*.test.ts",
  ],
};
