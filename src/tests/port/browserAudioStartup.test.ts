import { describe, expect, jest, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function fixture(state?: string, probeState = 'suspended') {
  const close = jest.fn(async () => {});
  const probe = jest.fn(() => ({ state: probeState, close }));
  const engines = state ? [{ audioCtx: { state } }] : [];
  const source = fs.readFileSync(path.resolve(__dirname, '../../apps/game/states/AppState.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const imports: Record<string, any> = {
    '@/apps/game/KotOR': { AudioEngine: { engines }, GameEngineType: { KOTOR: 1 } },
    '@/apps/launcher/context/Launcher': {},
    '@/enums/ApplicationEnvironment': { ApplicationEnvironment: { BROWSER: 0, ELECTRON: 1 } },
    '@/apps/game/GameInitializer': {},
    '@/apps/common/seo/applyProfileSeo': {},
    '@/apps/common/seo/profileSeo': {},
  };
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', 'window', compiled)((id: string) => {
    if (!(id in imports)) throw new Error(`Unexpected dependency: ${id}`);
    return imports[id];
  }, module, module.exports, { AudioContext: probe });
  const app = module.exports.AppState;
  app.env = 0; app.directoryLocated = true;
  return { app, probe, close, engines };
}

describe('browser audio startup gating', () => {
  test('does not reopen Begin for a running engine even if a fresh probe would suspend', () => {
    const { app, probe } = fixture('running');
    expect(app.shouldDeferForAudioUnlock()).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });
  test('still requires unlocking an existing suspended engine', () => {
    const { app, probe } = fixture('suspended', 'running');
    expect(app.shouldDeferForAudioUnlock()).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });
  test('tracks the real suspended-to-running transition', () => {
    const { app, engines } = fixture('suspended');
    expect(app.shouldDeferForAudioUnlock()).toBe(true);
    engines[0].audioCtx.state = 'running';
    expect(app.shouldDeferForAudioUnlock()).toBe(false);
  });
  test('probes and closes a context before the engine exists', () => {
    const { app, probe, close } = fixture();
    expect(app.shouldDeferForAudioUnlock()).toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
  test('does not probe in Electron', () => {
    const { app, probe } = fixture(); app.env = 1;
    expect(app.shouldDeferForAudioUnlock()).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });
});
