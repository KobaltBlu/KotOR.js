/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require("./jest.config.js");

module.exports = {
  ...base,
  collectCoverageFrom: [
    "src/engine/pathfinding/**/*.ts",
    "src/engine/movement/**/*.ts",
    "src/actions/ActionForceFollowObject.ts",
    "src/actions/ActionFollowLeader.ts",
    "src/actions/ActionMoveToPoint.ts",
    "!src/engine/pathfinding/__harness__/**",
    "!src/tests/**",
  ],
  testMatch: [
    "<rootDir>/src/tests/engine/pathfinding/**/*.test.ts",
    "<rootDir>/src/tests/engine/movement/**/*.test.ts",
    "<rootDir>/src/tests/module/ModuleArea.walk-candidates.cache.test.ts",
    "<rootDir>/src/tests/actions/ActionFollowLeader.test.ts",
    "<rootDir>/src/tests/actions/ActionForceFollowObject.test.ts",
    "<rootDir>/src/tests/actions/ActionMoveToPoint*.test.ts",
  ],
};
