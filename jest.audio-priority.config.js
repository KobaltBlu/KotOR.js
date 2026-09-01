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
    '<rootDir>/src/tests/AudioPriorityManager.test.ts',
    '<rootDir>/src/tests/AudioEngine.SetSoundMode.test.ts',
    '<rootDir>/src/tests/AudioEngine.Environment.test.ts',
    '<rootDir>/src/tests/AudioEngine.AmbientVolume.test.ts',
    '<rootDir>/src/tests/AudioEngine.AreaMusic.test.ts',
    '<rootDir>/src/tests/DialogMusic.test.ts',
    '<rootDir>/src/tests/ModuleArea.music.test.ts',
    '<rootDir>/src/tests/MGTrackFollowerSounds.test.ts',
    '<rootDir>/src/tests/MGTrackFollowerAudio.test.ts',
    '<rootDir>/src/tests/ModuleMiniGame.music.test.ts',
    '<rootDir>/src/tests/ModuleMiniGame.swoop-steer.test.ts',
    '<rootDir>/src/tests/ModuleMiniGame.swoop-render.test.ts',
    '<rootDir>/src/tests/ModuleMGPlayer.swoop-start.test.ts',
    '<rootDir>/src/tests/ModuleMiniGame.turret-m12ab.test.ts',
    '<rootDir>/src/tests/NWScriptVectorStack.test.ts',
    '<rootDir>/src/tests/AudioEmitter.Continuous.test.ts',
    '<rootDir>/src/tests/AudioEmitter.playStreamWave.test.ts',
    '<rootDir>/src/tests/ModuleSound.audio.test.ts',
    '<rootDir>/src/tests/get-obstruction-factor.test.ts',
  ],
  verbose: true,
};
