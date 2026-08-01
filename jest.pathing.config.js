/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require("./jest.config.js");

module.exports = {
  ...base,
  // Focused pathing checkpoint + over-time suite (and colocated pathfinding tests).
  testMatch: [
    "**/src/engine/pathfinding/pathing-checkpoints.test.ts",
    "**/src/engine/pathfinding/**/*.test.ts",
    "**/src/actions/ActionFollowLeader.test.ts",
    "**/src/actions/ActionForceFollowObject.test.ts",
    "**/src/actions/ActionMoveToPoint.live-repath.test.ts",
  ],
  collectCoverageFrom: [
    "src/engine/pathfinding/**/*.ts",
    "src/actions/ActionForceFollowObject.ts",
    "src/actions/ActionFollowLeader.ts",
    "src/actions/ActionMoveToPoint.ts",
    "!src/engine/pathfinding/**/*.test.ts",
    "!src/engine/pathfinding/__harness__/**",
  ],
};
