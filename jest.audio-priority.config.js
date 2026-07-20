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
  setupFiles: ['<rootDir>/src/tests/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/audio/AudioPriorityManager.test.ts',
    '<rootDir>/src/audio/AudioEngine.SetSoundMode.test.ts',
    '<rootDir>/src/audio/AudioEngine.Environment.test.ts',
    '<rootDir>/src/audio/MGTrackFollowerSounds.test.ts',
    '<rootDir>/src/audio/MGTrackFollowerAudio.test.ts',
    '<rootDir>/src/engine/pathfinding/get-obstruction-factor.test.ts',
  ],
  verbose: true,
};
