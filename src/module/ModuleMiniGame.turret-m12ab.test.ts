/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js src/module/ModuleMiniGame.turret-m12ab.test.ts --coverage=false
 *
 * m12ab Ebon Hawk turret: degree tunnels, Z wrap, mouse AxisX=3/AxisY=1,
 * CameraRotate=1 attach under container; Escape pause stays overlay.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';
import { MiniGameType } from '@/enums/engine/MiniGameType';

jest.mock('@/GameState', () => ({
  GameState: {
    Module: {
      ModuleArea: {
        ModuleMGPlayer: class {},
      },
    },
    module: {
      area: {
        miniGame: {
          type: 2,
          getAttachType: () => 2,
        },
      },
    },
  },
}));

jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: { GetAudioEngine: () => ({}) },
}));

jest.mock('@/audio/AudioLoader', () => ({
  AudioLoader: { LoadMusic: async () => ({ buffer: new ArrayBuffer(0) }) },
}));

jest.mock('@/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {},
}));

jest.mock('@/module/ModuleMGEnemy', () => ({
  ModuleMGEnemy: class {},
}));

jest.mock('@/module/ModuleMGTrack', () => ({
  ModuleMGTrack: class {},
}));

jest.mock('@/module/minigame/MiniGameObjectArray', () => ({
  MiniGameObjectArray: class {},
}));

jest.mock('@/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@/resource/GFFStruct', () => ({ GFFStruct: class {} }));

import { ModuleMiniGame } from '@/module/ModuleMiniGame';

/** Mirror ModuleMGPlayer.keepInTunnel clamp/wrap (type 2). */
function keepInTunnel(
  offset: THREE.Vector3,
  origin: THREE.Vector3,
  tunnel: { pos: THREE.Vector3; neg: THREE.Vector3 },
  tunnelInfinite: THREE.Vector3,
){
  const clampAxis = (
    value: number,
    infinite: number,
    originAxis: number,
    neg: number,
    pos: number
  ): number => {
    if(infinite === 0){
      const max = originAxis + pos;
      const min = originAxis + neg;
      if(value > max){ return max; }
      if(value < min){ return min; }
      return value;
    }
    // Turret infinite: wrap degrees 0–360 (retail KeepInTunnel).
    if(value < 0){ return value + 360; }
    if(value >= 360){ return value - 360; }
    return value;
  };
  offset.x = clampAxis(offset.x, tunnelInfinite.x, origin.x, tunnel.neg.x, tunnel.pos.x);
  offset.y = clampAxis(offset.y, tunnelInfinite.y, origin.y, tunnel.neg.y, tunnel.pos.y);
  offset.z = clampAxis(offset.z, tunnelInfinite.z, origin.z, tunnel.neg.z, tunnel.pos.z);
}

describe('m12ab turret tunnels + mouse', () => {
  // ARE: Start_Offset=(7,0,0), TunnelXPos=45, TunnelXNeg=2, Y locked, Z infinite.
  const origin = new THREE.Vector3(7, 0, 0);
  const tunnel = {
    pos: new THREE.Vector3(45, 0, 9999),
    neg: new THREE.Vector3(2, 0, -9999),
  };
  const tunnelInfinite = new THREE.Vector3(0, 0, 1);

  function makeTurret(): ModuleMiniGame {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.type = MiniGameType.TURRET;
    mg.lateralAccel = 1200;
    mg.movementPerSec = 100;
    mg.axisMode = 1;
    mg.axisX = 3;
    mg.axisY = 1;
    mg.physicsPrev = {
      acceleration: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    };
    mg.physicsNext = {
      acceleration: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    };
    mg.lastAxisInput = new THREE.Vector3();
    mg.axisVelocity = new THREE.Vector3();
    mg.player = {
      playerOffset: new THREE.Vector3(7, 0, 0),
      keepInTunnel: (o: THREE.Vector3) => keepInTunnel(o, origin, tunnel, tunnelInfinite),
      applyTurretOffsetRotation: () => {},
    } as any;
    return mg;
  }

  it('clamps Start_Offset X into origin+tunnel range [9, 52]', () => {
    const offset = new THREE.Vector3(7, 0, 0);
    keepInTunnel(offset, origin, tunnel, tunnelInfinite);
    expect(offset.x).toBe(9);
    expect(offset.y).toBe(0);
  });

  it('clamps aim X to tunnel max origin+45', () => {
    const offset = new THREE.Vector3(100, 0, 0);
    keepInTunnel(offset, origin, tunnel, tunnelInfinite);
    expect(offset.x).toBe(52);
  });

  it('wraps infinite Z degrees for turret', () => {
    const offset = new THREE.Vector3(20, 0, -10);
    keepInTunnel(offset, origin, tunnel, tunnelInfinite);
    expect(offset.z).toBe(350);
    offset.z = 370;
    keepInTunnel(offset, origin, tunnel, tunnelInfinite);
    expect(offset.z).toBe(10);
  });

  it('locks Y when tunnel Y pos/neg are 0', () => {
    const offset = new THREE.Vector3(20, 5, 0);
    keepInTunnel(offset, origin, tunnel, tunnelInfinite);
    expect(offset.y).toBe(0);
  });

  it('UpdateMouse AxisX=3 AxisY=1 subtracts into Z then X velocity', () => {
    const mg = makeTurret();
    mg.updateMouse(1, 0.5, 0.1);
    // scale = movementPerSec * dt = 10; mx=10, my=5; axis 3→z-=10, axis 1→x-=5
    expect(mg.physicsNext.velocity.z).toBeCloseTo(-10);
    expect(mg.physicsNext.velocity.x).toBeCloseTo(-5);
    expect(mg.physicsNext.velocity.y).toBe(0);
  });

  it('commitPhysics applies velocity delta then KeepInTunnel for turret', () => {
    const mg = makeTurret();
    mg.physicsNext.velocity.set(5, 0, 0);
    mg.physicsPrev.velocity.set(0, 0, 0);
    mg.commitPhysicsToPlayer(1 / 30);
    expect(mg.player.playerOffset.x).toBe(12); // 7+5, already inside [9,52]
  });

  it('getAttachType is 2 for turret', () => {
    const mg = makeTurret();
    expect(mg.getAttachType()).toBe(2);
  });
});

describe('InGamePause overlay (minigame Escape)', () => {
  it('K1 and TSL InGamePause constructors set isOverlayGUI true', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.join(__dirname, '..');
    const k1 = fs.readFileSync(path.join(root, 'game/kotor/menu/InGamePause.ts'), 'utf8');
    const tsl = fs.readFileSync(path.join(root, 'game/tsl/menu/InGamePause.ts'), 'utf8');
    expect(k1).toMatch(/this\.isOverlayGUI = true/);
    expect(tsl).toMatch(/this\.isOverlayGUI = true/);
    expect(k1).not.toMatch(/this\.isOverlayGUI = false/);
    expect(tsl).not.toMatch(/this\.isOverlayGUI = false/);
  });
});
