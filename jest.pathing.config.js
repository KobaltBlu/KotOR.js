/** @type {import('ts-jest').JestConfigWithTsJest} **/
const base = require("./jest.config.js");

module.exports = {
  ...base,
  // Focused pathing checkpoint + over-time suite (and related pathfinding tests).
  testMatch: [
    "<rootDir>/src/tests/pathing-checkpoints.test.ts",
    "<rootDir>/src/tests/bump-friends.test.ts",
    "<rootDir>/src/tests/can-path-to.test.ts",
    "<rootDir>/src/tests/clear-line-of-sight.cache.test.ts",
    "<rootDir>/src/tests/compute-away-vector.test.ts",
    "<rootDir>/src/tests/count-visible-to-players.test.ts",
    "<rootDir>/src/tests/drive-update-location.test.ts",
    "<rootDir>/src/tests/follow-leader-sm.test.ts",
    "<rootDir>/src/tests/force-push-quick-walk.test.ts",
    "<rootDir>/src/tests/get-is-creature-bumpable.test.ts",
    "<rootDir>/src/tests/get-obstruction-factor.test.ts",
    "<rootDir>/src/tests/mobility-feat.test.ts",
    "<rootDir>/src/tests/no-creatures-on-line.test.ts",
    "<rootDir>/src/tests/no-non-walk-polys.test.ts",
    "<rootDir>/src/tests/party-follow-path.test.ts",
    "<rootDir>/src/tests/plot-grid-path.test.ts",
    "<rootDir>/src/tests/plot-path.test.ts",
    "<rootDir>/src/tests/plot-path-around-creature.test.ts",
    "<rootDir>/src/tests/pth-edge-block.test.ts",
    "<rootDir>/src/tests/smooth-corner-optimize.test.ts",
    "<rootDir>/src/tests/smooth-select-nodes.test.ts",
    "<rootDir>/src/tests/test-direct-line.detailed-clear.test.ts",
    "<rootDir>/src/tests/walk-hit-info.test.ts",
    "<rootDir>/src/tests/walk-update-location.hex.test.ts",
    "<rootDir>/src/tests/ActionFollowLeader.test.ts",
    "<rootDir>/src/tests/ActionForceFollowObject.test.ts",
    "<rootDir>/src/tests/ActionMoveToPoint.live-repath.test.ts",
  ],
  collectCoverageFrom: [
    "src/engine/pathfinding/**/*.ts",
    "src/actions/ActionForceFollowObject.ts",
    "src/actions/ActionFollowLeader.ts",
    "src/actions/ActionMoveToPoint.ts",
    "!src/engine/pathfinding/__harness__/**",
    "!src/tests/**",
  ],
};
