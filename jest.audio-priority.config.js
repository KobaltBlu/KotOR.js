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
    '<rootDir>/src/audio/AudioEngine.AmbientVolume.test.ts',
    '<rootDir>/src/audio/AudioEngine.AreaMusic.test.ts',
    '<rootDir>/src/audio/DialogMusic.test.ts',
    '<rootDir>/src/audio/ModuleArea.music.test.ts',
    '<rootDir>/src/audio/MGTrackFollowerSounds.test.ts',
    '<rootDir>/src/audio/MGTrackFollowerAudio.test.ts',
    '<rootDir>/src/audio/ModuleMiniGame.music.test.ts',
    '<rootDir>/src/module/ModuleMiniGame.swoop-steer.test.ts',
    '<rootDir>/src/module/ModuleMiniGame.turret-m12ab.test.ts',
    '<rootDir>/src/nwscript/NWScriptVectorStack.test.ts',
    '<rootDir>/src/audio/AudioEmitter.Continuous.test.ts',
    '<rootDir>/src/audio/ModuleSound.audio.test.ts',
    '<rootDir>/src/engine/pathfinding/get-obstruction-factor.test.ts',
  ],
  verbose: true,
};
