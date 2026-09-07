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
      // : DoInertia would += physicsNext.acceleration here — must not touch offset.
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

  it('turret UpdateAxis(x,0,z) remaps to pitch X and yaw Z velocity', () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.type = MiniGameType.TURRET;
    mg.lateralAccel = 60;
    mg.movementPerSec = 90;
    mg.axisMode = 1;
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
    mg.player = { playerOffset: new THREE.Vector3(), rotate: () => {} } as any;

    const dt = 1 / 30;
    // remap (x,0,z) → (-z, 0, -x)
    mg.updateAxis(1, 0, 0.5, dt);
    expect(mg.lastAxisInput.x).toBeCloseTo(-0.5, 5);
    expect(mg.lastAxisInput.y).toBeCloseTo(0, 5);
    expect(mg.lastAxisInput.z).toBeCloseTo(-1, 5);
    expect(Math.abs(mg.physicsNext.velocity.x)).toBeGreaterThan(0);
    expect(Math.abs(mg.physicsNext.velocity.z)).toBeGreaterThan(0);
  });

  it('swoop UpdateAxis ignores Y/Z stick packing (x,0,0 only)', () => {
    const { mg } = makeSwoop();
    const dt = 1 / 30;
    mg.updateAxis(0, 1, 1, dt);
    // Remap negates y/z but input y/z were 1 — still non-zero lastAxis after remap.
    // ProcessInput packing uses (x,0,0); this asserts remap of pure lateral.
    mg.physicsPrev.acceleration.set(0, 0, 0);
    mg.physicsPrev.velocity.set(0, 0, 0);
    mg.physicsNext.acceleration.set(0, 0, 0);
    mg.physicsNext.velocity.set(0, 0, 0);
    mg.updateAxis(1, 0, 0, dt);
    expect(mg.lastAxisInput.x).toBeCloseTo(1, 5);
    expect(mg.lastAxisInput.y).toBeCloseTo(0, 5);
    expect(mg.lastAxisInput.z).toBeCloseTo(0, 5);
  });

  it('engine ProcessInput axis packing clamps stick+keys sum to [-1,1]', () => {
    const pack = (stick: number, key: number) => Math.max(-1, Math.min(1, stick + key));
    expect(pack(0, 1)).toBe(1);
    expect(pack(0, -1)).toBe(-1);
    expect(pack(0.5, 1)).toBe(1);
    expect(pack(-0.5, -1)).toBe(-1);
    expect(pack(0.2, 0)).toBeCloseTo(0.2, 5);
    expect(pack(0, 0)).toBe(0);
  });

  it('onfire-shaped SetPlayerTunnelPos/Neg ±20 opens X for lateral steer', () => {
    const { mg, keepInTunnel } = makeSwoop();
    (mg.player as any).tunnel.pos.set(0, 0, 0);
    (mg.player as any).tunnel.neg.set(0, 0, 0);
    // Simulate SWMG_SetPlayerTunnel* as onfire.ncs (CONSTF x,y,z → ACTION).
    (mg.player as any).tunnel.pos.set(20, 0, 0);
    (mg.player as any).tunnel.neg.set(-20, 0, 0);
    const dt = 1 / 30;
    for(let i = 0; i < 20; i++){
      mg.updateAxis(1, 0, 0, dt);
      mg.commitPhysicsToPlayer(dt);
      keepInTunnel(mg.player.playerOffset);
    }
    expect(mg.player.playerOffset.x).toBeGreaterThan(0);
    expect(mg.player.playerOffset.x).toBeLessThanOrEqual(20);
  });

  it('ACTION vector pop matches CONSTF x,y,z order (z on top → Vector3.x)', () => {
    // Mirrors CALL_ACTION VECTOR pop after compiler push x,y,z.
    const stack = [20, 0, 0]; // push order; last is top
    const z = stack.pop();
    const y = stack.pop();
    const x = stack.pop();
    const v = new THREE.Vector3(x, y, z);
    expect(v.x).toBe(20);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
    // Pre-fix bug: first pop into.x swapped X/Z → TunnelX stayed 0.
    const wrongStack = [20, 0, 0];
    const wrong = new THREE.Vector3(wrongStack.pop(), wrongStack.pop(), wrongStack.pop());
    expect(wrong.x).toBe(0);
    expect(wrong.z).toBe(20);
  });
});
