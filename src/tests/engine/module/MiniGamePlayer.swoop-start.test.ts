/**
 * @jest-environment node
 *
 * 211TEL race-start wiring: OnAccelerate for gear, OnBrake for TSL hop.
 * Run: npx jest --config jest.audio-priority.config.js src/module/MiniGamePlayer.swoop-start.test.ts --coverage=false
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MiniGameType } from '@engine/enums/engine/MiniGameType';
import { GameEngineType } from '@core/enums/engine/GameEngineType';
import { ScriptHook } from '@core/enums/module/ScriptHook';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameKey: 'TSL' as string,
    module: {
      area: {
        miniGame: null as any,
      },
    },
  },
}));

jest.mock('@engine/module/GameObject', () => ({
  GameObject: class {
    scripts: Record<string, any> = {};
  },
}));

jest.mock('@core/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@engine/render/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
}));
jest.mock('@core/utility/Utility', () => ({ Utility: {} }));
jest.mock('@engine/odyssey', () => ({
  OdysseyModel: class {},
  OdysseyModelAnimationManager: class {},
}));
jest.mock('@engine/loaders', () => ({ MDLLoader: {} }));
jest.mock('@engine/module/MiniGameGunBank', () => ({ MiniGameGunBank: class {} }));
jest.mock('@engine/module/MiniGameTrack', () => ({ MiniGameTrack: class {} }));
jest.mock('@engine/module/minigame/MiniGameObjectArray', () => ({
  MiniGameObjectArray: { register: jest.fn(), unregister: jest.fn() },
}));
jest.mock('@engine/module/minigame/MGTrackFollowerSounds', () => ({
  MGTrackFollowerSounds: class {},
}));
jest.mock('@engine/module/minigame/MGTrackFollowerAudio', () => ({
  MGTrackFollowerAudio: class {},
}));
jest.mock('@engine/module/minigame/MGHitCheck', () => ({ hitCheckPart: jest.fn() }));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@engine/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));

jest.mock('@engine/module/MiniGame', () => ({
  MiniGame: {
    PLAYER_JUMP_SPEED: 12,
  },
}));

import { GameState } from '@engine/runtime/GameState';
import { MiniGame } from '@engine/module/MiniGame';
import { MiniGamePlayer } from '@engine/module/MiniGamePlayer';

describe('211TEL swoop start script wiring', () => {
  let player: MiniGamePlayer;
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

    player = Object.create(MiniGamePlayer.prototype) as MiniGamePlayer;
    player.scripts = {};
  });

  it('onAccelerate runs OnAccelerate script', () => {
    const run = jest.fn();
    player.scripts[ScriptHook.MGPlayerOnAccelerate] = { run } as any;
    player.onAccelerate();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(player, 0);
  });

  it('jump prefers OnBrake over OnFire when OnBrake is bound (211TEL onjump)', () => {
    const onBrake = jest.fn();
    const onFire = jest.fn();
    player.scripts[ScriptHook.MGPlayerOnBrake] = { run: onBrake } as any;
    player.scripts[ScriptHook.MGPlayerOnFire] = { run: onFire } as any;
    player.jump();
    expect(onBrake).toHaveBeenCalledTimes(1);
    expect(onFire).not.toHaveBeenCalled();
  });

  it('jump falls back to OnFire when OnBrake is unbound', () => {
    const onFire = jest.fn();
    player.scripts[ScriptHook.MGPlayerOnFire] = { run: onFire } as any;
    player.jump();
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('jump applies PLAYER_JUMP_SPEED when no script sets jumpSpeed', () => {
    player.jump();
    expect(miniGame.jumpSpeed).toBe(MiniGame.PLAYER_JUMP_SPEED);
  });

  it('onBrake no-ops when script missing', () => {
    expect(() => player.onBrake()).not.toThrow();
  });
});

describe('MIN_RACE_GEAR global number catalog', () => {
  it('SetGlobalNumber persists when Number map has the key (countdown prerequisite)', () => {
    const { GlobalVariableManager } = require('@engine/managers/GlobalVariableManager');
    GlobalVariableManager.Globals.Number.clear();
    GlobalVariableManager.Globals.Number.set('min_race_gear', { name: 'MIN_RACE_GEAR', value: 0 });
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', -5);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(-5);
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', 0);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(0);
  });

  it('SetGlobalNumber is a no-op when key is absent from globalcat', () => {
    const { GlobalVariableManager } = require('@engine/managers/GlobalVariableManager');
    GlobalVariableManager.Globals.Number.clear();
    GlobalVariableManager.SetGlobalNumber('MIN_RACE_GEAR', -5);
    expect(GlobalVariableManager.GetGlobalNumber('MIN_RACE_GEAR')).toBe(0);
  });
});
