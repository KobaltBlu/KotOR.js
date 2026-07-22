/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js src/module/ModuleMiniGame.swoop-steer.test.ts --coverage=false
 *
 * tat_m17mg-shaped lateral steer: ARE tunnels start 0; scripts open ±20;
 * UpdateAxis → AxisAcceleration → commit velocity delta → KeepInTunnel
 * (no clearAxisPhysics on clamp).
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

describe('ModuleMiniGame swoop lateral steer', () => {
  function makeSwoop(): {
    mg: ModuleMiniGame;
    keepInTunnel: (offset: THREE.Vector3) => void;
  } {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.type = MiniGameType.SWOOPRACE;
    mg.lateralAccel = 300;
    mg.movementPerSec = 100;
    mg.axisMode = 1;
    mg.useInertia = 1;
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
      playerOffset: new THREE.Vector3(),
      lateralForce: 0,
      tunnel: {
        pos: new THREE.Vector3(20, 0, 0),
        neg: new THREE.Vector3(-20, 0, 0),
      },
      tunnelInfinite: new THREE.Vector3(0, 0, 0),
      origin: new THREE.Vector3(0, 0, 0),
      rotate: () => {},
    } as any;

    const keepInTunnel = (offset: THREE.Vector3) => {
      const clampAxis = (
        value: number,
        infinite: number,
        origin: number,
        neg: number,
        pos: number
      ): number => {
        if(infinite === 0){
          const max = origin + pos;
          const min = origin + neg;
          if(value > max){ return max; }
          if(value < min){ return min; }
          return value;
        }
        return value;
      };
      const p = mg.player as any;
      offset.x = clampAxis(offset.x, p.tunnelInfinite.x, p.origin.x, p.tunnel.neg.x, p.tunnel.pos.x);
      offset.y = clampAxis(offset.y, p.tunnelInfinite.y, p.origin.y, p.tunnel.neg.y, p.tunnel.pos.y);
      offset.z = clampAxis(offset.z, p.tunnelInfinite.z, p.origin.z, p.tunnel.neg.z, p.tunnel.pos.z);
    };

    return { mg, keepInTunnel };
  }

  it('moves playerOffset.x under held right axis inside open tunnels', () => {
    const { mg, keepInTunnel } = makeSwoop();
    const dt = 1 / 30;

    for(let i = 0; i < 30; i++){
      mg.updateAxis(1, 0, 0, dt);
      // Retail: DoInertia would += physicsNext.acceleration here — must not touch offset.
      const offsetBeforeInertia = mg.player.playerOffset.x;
      mg.physicsNext.acceleration.x += 0.01;
      expect(mg.player.playerOffset.x).toBe(offsetBeforeInertia);

      mg.commitPhysicsToPlayer(dt);
      keepInTunnel(mg.player.playerOffset);
    }

    expect(mg.physicsNext.velocity.x).not.toBe(0);
    expect(mg.player.playerOffset.x).toBeGreaterThan(0);
    expect(mg.player.playerOffset.x).toBeLessThanOrEqual(20);
  });

  it('does not wipe axis physics when clamped at tunnel wall', () => {
    const { mg, keepInTunnel } = makeSwoop();
    const dt = 1 / 30;
    mg.player.playerOffset.x = 19.5;

    for(let i = 0; i < 10; i++){
      mg.updateAxis(1, 0, 0, dt);
      mg.commitPhysicsToPlayer(dt);
      keepInTunnel(mg.player.playerOffset);
    }

    expect(mg.player.playerOffset.x).toBe(20);
    expect(Math.abs(mg.physicsNext.velocity.x)).toBeGreaterThan(0);
    expect(mg.lastAxisInput.x).not.toBe(0);
  });

  it('zero ARE tunnels pin offset until scripts open them', () => {
    const { mg, keepInTunnel } = makeSwoop();
    (mg.player as any).tunnel.pos.set(0, 0, 0);
    (mg.player as any).tunnel.neg.set(0, 0, 0);
    const dt = 1 / 30;

    mg.updateAxis(1, 0, 0, dt);
    mg.commitPhysicsToPlayer(dt);
    keepInTunnel(mg.player.playerOffset);
    expect(mg.player.playerOffset.x).toBe(0);

    (mg.player as any).tunnel.pos.set(20, 0, 0);
    (mg.player as any).tunnel.neg.set(-20, 0, 0);
    for(let i = 0; i < 15; i++){
      mg.updateAxis(1, 0, 0, dt);
      mg.commitPhysicsToPlayer(dt);
      keepInTunnel(mg.player.playerOffset);
    }
    expect(mg.player.playerOffset.x).toBeGreaterThan(0);
  });
});
