/**
 * @jest-environment node
 *
 * Retail K1 parity for MiniGame load / start (swkotor.exe):
 *  - CSWMiniGame::Load (0x006723d0) Type 1/2 and DOF bit-mask validation
 *  - OnCreate order: player, enemies, obstacles
 *  - K1 Go (0x006714e0) does not touch FORFEIT_SWOOPRACE
 *
 * Run: npx jest src/tests/engine/module/minigame/MiniGame.retail-load.test.ts --coverage=false
 */
import { describe, expect, it, jest } from '@jest/globals';
import { MiniGameType } from '@engine/enums/engine/MiniGameType';

const setGlobalBoolean = jest.fn();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameKey: 'KOTOR',
    GlobalVariableManager: { SetGlobalBoolean: (...a: any[]) => setGlobalBoolean(...a) },
  },
}));
jest.mock('@engine/audio/AudioEngine', () => ({ AudioEngine: { GetAudioEngine: () => ({}) } }));
jest.mock('@engine/audio/AudioLoader', () => ({ AudioLoader: {} }));
jest.mock('@engine/audio/AmbientAudioEmitter', () => ({ AmbientAudioEmitter: class {} }));
jest.mock('@engine/module/minigame/MiniGameEnemy', () => ({ MiniGameEnemy: class {} }));
jest.mock('@engine/module/minigame/MiniGameTrack', () => ({ MiniGameTrack: class {} }));
jest.mock('@engine/module/minigame/MiniGameObjectArray', () => ({ MiniGameObjectArray: class {} }));
jest.mock('@core/resource/GFFObject', () => ({ GFFObject: { FromStruct: () => ({}) } }));
jest.mock('@core/resource/GFFStruct', () => ({ GFFStruct: class {} }));
jest.mock('@engine/render/MotionBlurController', () => ({ MotionBlurController: class {} }));
jest.mock('@engine/runtime/context', () => ({
  getDefaultRuntimeContext: (): any => ({ createMiniGamePlayer: (): any => undefined, getModule: (): any => undefined }),
}));

import { MiniGame } from '@engine/module/minigame/MiniGame';

function fakeStruct(fields: Record<string, number>){
  return {
    hasField: (k: string) => k in fields,
    getFieldByLabel: (k: string) => ({
      getValue: () => fields[k],
      getChildStructs: () => [{}],
    }),
  } as any;
}

describe('MiniGame load validation (L1)', () => {
  function loadType(fields: Record<string, number>): MiniGame | undefined {
    try{
      return new MiniGame(fakeStruct(fields));
    }catch{
      return undefined;
    }
  }

  it('accepts only Type 1 or 2 and DOF values within bits 0..2', () => {
    const bad = loadType({ Type: 3, DOF: 9 });
    expect(bad).toBeDefined();
    expect(bad!.type).toBe(0);
    expect(bad!.dof).toBe(0);

    const ok = loadType({ Type: 2, DOF: 5 });
    expect(ok).toBeDefined();
    expect(ok!.type).toBe(MiniGameType.TURRET);
    expect(ok!.dof).toBe(5);
  });
});

describe('OnCreate order and Go (L2, L7)', () => {
  it('runs player OnCreate first, then enemies in order, then obstacles', () => {
    const order: string[] = [];
    const mg = Object.create(MiniGame.prototype) as MiniGame;
    mg.player = { onCreate: () => order.push('player') } as any;
    mg.enemies = [
      { onCreate: () => order.push('enemy0') },
      { onCreate: () => order.push('enemy1') },
    ] as any;
    mg.obstacles = [{ onCreate: () => order.push('obstacle0') }] as any;
    (mg as any).go = jest.fn();
    mg.initMiniGameObjects();
    expect(order).toEqual(['player', 'enemy0', 'enemy1', 'obstacle0']);
  });

  it('K1 Go does not clear FORFEIT_SWOOPRACE', () => {
    const mg = Object.create(MiniGame.prototype) as MiniGame;
    mg.type = MiniGameType.SWOOPRACE;
    mg.player = { go: jest.fn() } as any;
    mg.enemies = [];
    (mg as any).playMusic = jest.fn();
    setGlobalBoolean.mockClear();
    mg.go();
    expect(setGlobalBoolean).not.toHaveBeenCalled();
  });
});
