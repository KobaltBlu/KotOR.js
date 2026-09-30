const fs = require('fs');

const tests = [
  'src/tests/managers/CutsceneManager.dialog.test.ts',
  'src/tests/managers/CutsceneManager.end-dialog.test.ts',
  'src/tests/managers/CutsceneManager.computer.test.ts',
  'src/tests/managers/CutsceneManager.gaps.test.ts',
  'src/tests/managers/CutsceneManager.stunt-camera.test.ts',
];

for (const f of tests) {
  let s = fs.readFileSync(f, 'utf8');
  // Remove SetEngineMode/RestoreEnginePlayMode from GameState mock
  s = s.replace(/\n\s*SetEngineMode: jest\.fn\(\),/g, '');
  s = s.replace(/\n\s*RestoreEnginePlayMode: jest\.fn\(\),/g, '');

  const mockBlock = `jest.mock('@/engine/EngineModeController', () => ({
  EngineModeController: {
    SetEngineMode: jest.fn(),
    RestoreEnginePlayMode: jest.fn(),
  },
}));
`;
  if (!s.includes("jest.mock('@/engine/EngineModeController'")) {
    // Insert after first jest.mock('@/GameState' ...) block ends - after first }));
    const idx = s.indexOf("jest.mock('@/GameState'");
    if (idx >= 0) {
      const end = s.indexOf('}));', idx);
      if (end >= 0) {
        s = s.slice(0, end + 4) + '\n\n' + mockBlock + s.slice(end + 4);
      }
    }
  }
  fs.writeFileSync(f, s);
  console.log('test:', f);
}
