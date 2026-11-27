import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/loaders', () => ({ TextureLoader: {}, ResourceLoader: {} }));
jest.mock('@/KotOR', () => ({ ResourceTypes: {} }));
jest.mock('@/resource/ERFObject', () => ({ ERFObject: class {} }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: { GetStringById: (): undefined => undefined } }));
jest.mock('@/utility/GameFileSystem', () => ({
  GameFileSystem: {
    readFile: jest.fn(async () => new Uint8Array()),
    readdir: jest.fn(async () => []),
    exists: jest.fn(async () => false),
    writeFile: jest.fn(async () => true),
  },
}));

import { SaveGame } from '@/engine/SaveGame';
import { CurrentGame } from '@/engine/CurrentGame';
import { GameState } from '@/GameState';
import { GFFObject } from '@/resource/GFFObject';
import { GameFileSystem } from '@/utility/GameFileSystem';
import EngineLocation from '@/engine/EngineLocation';

const state = GameState as any;
const globals = () => ({
  Boolean: new Map<string, { name: string; value: boolean }>(),
  Location: new Map<string, { name: string; value: EngineLocation }>(),
  Number: new Map<string, { name: string; value: number }>(),
  String: new Map<string, { name: string; value: string }>(),
});

beforeEach(() => {
  state.GlobalVariableManager = { Globals: globals() };
  state.module = undefined;
  SaveGame.saves = [];
  SaveGame.NEXT_SAVE_ID = 1;
  SaveGame.base_directory = 'saves';
});

afterEach(() => jest.restoreAllMocks());

describe('save-state port: synthetic global GFF data', () => {
  test.each([0, 1, 7, 8, 9, 17])('round-trips %i booleans including a partial final byte', async (count) => {
    const expected = Array.from({ length: count }, (_, i) => i % 3 !== 1);
    expected.forEach((value, i) => state.GlobalVariableManager.Globals.Boolean.set(`flag_${i}`, { name: `flag_${i}`, value }));
    let exported: GFFObject;
    jest.spyOn(GFFObject.prototype, 'export').mockImplementation(async function(this: GFFObject) {
      exported = this;
      return this;
    });
    await SaveGame.ExportGlobalVars('synthetic-save');
    const bytes = exported!.RootNode.getFieldByLabel('ValBoolean').getVoid();
    expect(bytes.length).toBe(Math.ceil(count / 8));
    expected.forEach((value, i) => expect((bytes[Math.floor(i / 8)] >> (i % 8)) & 1).toBe(Number(value)));

    const binary = exported!.getExportBuffer();
    state.GlobalVariableManager.Globals = globals();
    expected.forEach((_, i) => state.GlobalVariableManager.Globals.Boolean.set(`flag_${i}`, { name: `flag_${i}`, value: false }));
    jest.spyOn(GameFileSystem, 'readFile').mockResolvedValue(binary);
    const save = new SaveGame();
    await save.loadGlobalVARS();
    expect(Array.from(state.GlobalVariableManager.Globals.Boolean.values(), (entry: any) => entry.value)).toEqual(expected);
  });

  test('round-trips more than 100 locations without a fixed-size buffer', async () => {
    for(let i = 0; i < 101; i++) {
      state.GlobalVariableManager.Globals.Location.set(`loc_${i}`, {
        name: `loc_${i}`, value: new EngineLocation(i, i + 0.5, -i, 1, 0, 0),
      });
    }
    state.GlobalVariableManager.Globals.Number.set('number', { name: 'number', value: 255 });
    state.GlobalVariableManager.Globals.String.set('string', { name: 'string', value: 'synthetic value' });
    let exported: GFFObject;
    jest.spyOn(GFFObject.prototype, 'export').mockImplementation(async function(this: GFFObject) {
      exported = this;
      return this;
    });
    await SaveGame.ExportGlobalVars('synthetic-save');
    expect(exported!.RootNode.getFieldByLabel('ValLocation').getVoid().length).toBe(101 * 24);
    const binary = exported!.getExportBuffer();
    state.GlobalVariableManager.Globals = globals();
    state.GlobalVariableManager.Globals.Number.set('number', { name: 'number', value: 0 });
    state.GlobalVariableManager.Globals.String.set('string', { name: 'string', value: '' });
    jest.spyOn(GameFileSystem, 'readFile').mockResolvedValue(binary);
    await new SaveGame().loadGlobalVARS();
    expect(state.GlobalVariableManager.Globals.Location.size).toBe(101);
    expect(state.GlobalVariableManager.Globals.Location.get('loc_100').value.position.toArray()).toEqual([100, 100.5, -100]);
    expect(state.GlobalVariableManager.Globals.Location.get('loc_100').value.rotation.toArray()).toEqual([1, 0, 0]);
    expect(state.GlobalVariableManager.Globals.Number.get('number').value).toBe(255);
    expect(state.GlobalVariableManager.Globals.String.get('string').value).toBe('synthetic value');
  });
});

describe('save-state port: discovery and metadata identity', () => {
  test('finds module saves case-insensitively and rejects a same-name non-save file', async () => {
    jest.spyOn(GameFileSystem, 'readdir').mockResolvedValue(['gameinprogress/End_M01AA.utc', 'gameinprogress/End_M01AA.SAV']);
    expect(await CurrentGame.GetSavedModuleFilename('end_m01aa')).toBe('gameinprogress/End_M01AA.SAV');
    expect(await CurrentGame.IsModuleSaved('END_M01AA')).toBe(true);
    expect(await CurrentGame.IsModuleSaved('missing')).toBe(false);
  });

  test('deduplicates save entries and preserves numeric save order', () => {
    const makeSave = (id: number) => {
      const save = new SaveGame();
      save.folderName = `${id.toString().padStart(6, '0')} - Game${id}`;
      return save;
    };
    const later = makeSave(5);
    const earlier = makeSave(2);
    const replacement = makeSave(5);
    SaveGame.AddSaveGame(later);
    SaveGame.AddSaveGame(earlier);
    SaveGame.AddSaveGame(replacement);
    expect(SaveGame.saves).toEqual([earlier, replacement]);
    expect(SaveGame.NEXT_SAVE_ID).toBe(6);
  });
});
