/**
 * @jest-environment node
 *
 * 211TEL race-start wiring: OnAccelerate for gear, OnBrake for TSL hop.
 * Run: npx jest --config jest.audio-priority.config.js src/module/ModuleMGPlayer.swoop-start.test.ts --coverage=false
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MiniGameType } from '@/enums/engine/MiniGameType';
import { GameEngineType } from '@/enums/engine/GameEngineType';
import { ModuleObjectScript } from '@/enums/module/ModuleObjectScript';

jest.mock('@/GameState', () => ({
  GameState: {
    GameKey: 'TSL' as string,
    module: {
      area: {
        miniGame: null as any,
      },
    },
  },
}));

jest.mock('@/module/ModuleObject', () => ({
  ModuleObject: class {
    scripts: Record<string, any> = {};
  },
}));

jest.mock('@/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
}));
jest.mock('@/utility/Utility', () => ({ Utility: {} }));
jest.mock('@/odyssey', () => ({
  OdysseyModel: class {},
  OdysseyModelAnimationManager: class {},
}));
jest.mock('@/loaders', () => ({ MDLLoader: {} }));
jest.mock('@/module/ModuleMGGunBank', () => ({ ModuleMGGunBank: class {} }));
jest.mock('@/module/ModuleMGTrack', () => ({ ModuleMGTrack: class {} }));
jest.mock('@/module/minigame/MiniGameObjectArray', () => ({
  MiniGameObjectArray: { register: jest.fn(), unregister: jest.fn() },
}));
jest.mock('@/module/minigame/MGTrackFollowerSounds', () => ({
  MGTrackFollowerSounds: class {},
}));
jest.mock('@/module/minigame/MGTrackFollowerAudio', () => ({
  MGTrackFollowerAudio: class {},
}));
jest.mock('@/module/minigame/MGHitCheck', () => ({ hitCheckPart: jest.fn() }));
jest.mock('@/engine/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));

jest.mock('@/module/ModuleMiniGame', () => ({
  ModuleMiniGame: {
    PLAYER_JUMP_SPEED: 12,
  },
}));

import { GameState } from '@/GameState';
import { ModuleMiniGame } from '@/module/ModuleMiniGame';
import { ModuleMGPlayer } from '@/module/ModuleMGPlayer';

describe('211TEL swoop start script wiring', () => {
  let player: ModuleMGPlayer;
  let miniGame: {
    type: MiniGameType;
    jumpSpeed: number;
    setJumpSpeed: (v: number) => void;
  };

  beforeEach(() => {
    miniGame = {
      type: MiniGameType.SWOOPRACE,
      jumpSpeed: 0,
      setJumpSpeed(v: number) {
        this.jumpSpeed = v;
      },
    };
    (GameState as any).GameKey = GameEngineType.TSL;
    (GameState as any).module.area.miniGame = miniGame;

    player = Object.create(ModuleMGPlayer.prototype) as ModuleMGPlayer;
    player.scripts = {};
  });

  it('onAccelerate runs OnAccelerate script', () => {
    const run = jest.fn();
    player.scripts[ModuleObjectScript.MGPlayerOnAccelerate] = { run } as any;
    player.onAccelerate();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(player, 0);
  });

  it('jump prefers OnBrake over OnFire when OnBrake is bound (211TEL onjump)', () => {
    const onBrake = jest.fn();
    const onFire = jest.fn();
    player.scripts[ModuleObjectScript.MGPlayerOnBrake] = { run: onBrake } as any;
    player.scripts[ModuleObjectScript.MGPlayerOnFire] = { run: onFire } as any;
    player.jump();
    expect(onBrake).toHaveBeenCalledTimes(1);
    expect(onFire).not.toHaveBeenCalled();
  });

  it('jump falls back to OnFire when OnBrake is unbound', () => {
    const onFire = jest.fn();
    player.scripts[ModuleObjectScript.MGPlayerOnFire] = { run: onFire } as any;
    player.jump();
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('jump applies PLAYER_JUMP_SPEED when no script sets jumpSpeed', () => {
    player.jump();
    expect(miniGame.jumpSpeed).toBe(ModuleMiniGame.PLAYER_JUMP_SPEED);
  });

  it('onBrake no-ops when script missing', () => {
    expect(() => player.onBrake()).not.toThrow();
  });
});

describe('MIN_RACE_GEAR global number catalog', () => {
  it('SetGlobalNumber persists when Number map has the key (countdown prerequisite)', () => {
    const { GlobalVariableManager } = require('@/managers/GlobalVariableManager');
    GlobalVariableManager.Globals.Number.clear();
    GlobalVariableManager.Globals.Number.set('min_race_gear', { name: 'MIN_RACE_GEAR', value: 0 });
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', -5);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(-5);
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', 0);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(0);
  });

  it('SetGlobalNumber is a no-op when key is absent from globalcat', () => {
    const { GlobalVariableManager } = require('@/managers/GlobalVariableManager');
    GlobalVariableManager.Globals.Number.clear();
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', -5);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(0);
  });
});
