import { describe, expect, jest, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function compileMenu(name: string) {
  const filename = path.resolve(__dirname, '../../game/kotor/menu', name + '.ts');
  const source = fs.readFileSync(filename, 'utf8');
  expect(source).not.toMatch(/^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)/m);
  const parsed = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  expect((parsed.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
  return parsed.outputText;
}

describe('ported K1 menu syntax', () => {
  test.each([
    'CharGenAbilities', 'CharGenCustomPanel', 'CharGenMain', 'CharGenQuickOrCustom',
    'InGameAreaTransition', 'InGameBark', 'InGameComputer', 'InGameDialog',
    'InGameOverlay', 'MainMenu', 'MenuEquipment', 'MenuInventory', 'MenuJournal',
    'MenuPartySelection', 'MenuQuestItem', 'MenuSaveLoad', 'MenuStore', 'MenuTop',
  ])('%s parses without merge markers or syntax errors', (name) => {
    compileMenu(name);
  });
});

function makeBark() {
  const pending: Array<(value: any) => void> = [];
  const emitter = {
    stop: jest.fn(),
    playStreamWave: jest.fn(() => new Promise<any>((resolve) => pending.push(resolve))),
  };
  class BarkBase {
    show() {}
    close() {}
    gameStringParse(text: string) { return text; }
  }
  const imports: Record<string, any> = {
    '@/enums/engine/EngineMode': { EngineMode: { INGAME: 1 } },
    '@/gui': { GameMenu: BarkBase },
    three: { Vector3: class { y = 12; } },
    '@/GameState': { GameState: {
      CutsceneManager: { audioEmitter: emitter },
      ResolutionManager: { getViewportWidth: () => 640, getViewportHeight: () => 480 },
    } },
    '@/enums': { DLGNodeType: { ENTRY: 0 } },
    '@/resource/DLGNode': { DLGNode: class {} },
  };
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', compileMenu('InGameBark'))((id: string) => {
    if (!(id in imports)) throw new Error(`Unexpected bark dependency: ${id}`);
    return imports[id];
  }, module, module.exports);
  const menu = new module.exports.InGameBark();
  menu.LBL_BARKTEXT = { setText: jest.fn(), text: { geometry: { boundingBox: { getSize: jest.fn() } } } };
  menu.tGuiPanel = { extent: { width: 200, height: 50 }, resizeControl: jest.fn(), widget: { position: {} } };
  const entry = (text: string) => ({ text, getVoiceResRef: () => text, loadLIP: jest.fn(async () => true), resetLIP: jest.fn() });
  return { menu, pending, emitter, entry };
}

describe('ported bark audio cancellation', () => {
  test('ignores audio that resolves after a newer bark replaced it', async () => {
    const { menu, pending, entry } = makeBark();
    const first = entry('first');
    const second = entry('second');
    menu.bark(first);
    menu.bark(second);
    const staleAudio = { onended: undefined as any };
    pending[0](staleAudio);
    await Promise.resolve();
    expect(menu.audioNode).toBeUndefined();
    expect(staleAudio.onended).toBeUndefined();
    const currentAudio = { onended: undefined as any };
    pending[1](currentAudio);
    await Promise.resolve();
    expect(menu.audioNode).toBe(currentAudio);
    expect(currentAudio.onended).toEqual(expect.any(Function));
    expect(first.resetLIP).toHaveBeenCalled();
  });

  test('closing invalidates pending audio and resets the current LIP', async () => {
    const { menu, pending, emitter, entry } = makeBark();
    const current = entry('pending');
    menu.bark(current);
    menu.close();
    pending[0]({ onended: undefined as any });
    await Promise.resolve();
    expect(menu.audioNode).toBeUndefined();
    expect(menu.currentEntry).toBeUndefined();
    expect(current.resetLIP).toHaveBeenCalled();
    expect(emitter.stop).toHaveBeenCalled();
  });
});
