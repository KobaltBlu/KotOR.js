/**
 * @jest-environment node
 *
 * Retail K1 parity for minigame hit handling (swkotor.exe):
 *  - OnHitBullet(1) default (0x0066c190): no script re-entry, TargetType mask, no invuln gate
 *  - Dead bit before OnDeath (0x0066e7a0) — scripted OnDeath runs once
 *  - CSWMiniPlayer::Load acceleration derivation (0x006702f0)
 *  - CSWMiniPlayer::Control auto-acceleration (0x0066d640)
 *  - DoFollowerHitCheck (0x0066eda0) trigger / bump paths
 *
 * Run: npx jest src/tests/engine/module/minigame/MiniGame.retail-hits.test.ts --coverage=false
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as THREE from 'three';
import { MiniGameType } from '@engine/enums/engine/MiniGameType';
import { ScriptHook } from '@core/enums/module/ScriptHook';

const mockMiniGame: any = { type: 1, bumpPlaneNormal: undefined, lastFollowerHit: undefined };

jest.mock('@engine/runtime/GameState', () => ({
  GameState: { GameKey: 'KOTOR', module: { area: { miniGame: null as any } } },
}));
jest.mock('@engine/runtime/context', () => ({
  getDefaultRuntimeContext: () => ({ getModule: () => ({ area: { miniGame: mockMiniGame } }) }),
}));
jest.mock('@engine/module/GameObject', () => ({
  GameObject: class {
    scripts: Record<string, any> = {};
    container: any;
    sphere: any;
    constructor(){}
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
jest.mock('@engine/module/minigame/MiniGameGunBank', () => ({ MiniGameGunBank: class {} }));
jest.mock('@engine/module/minigame/MiniGameTrack', () => ({ MiniGameTrack: class { static normalizeName(n: any){ return n; } } }));
jest.mock('@engine/module/minigame/MiniGameObjectArray', () => ({
  MiniGameObjectArray: { register: jest.fn(), unregister: jest.fn() },
}));
jest.mock('@engine/module/minigame/MGTrackFollowerSounds', () => ({ MGTrackFollowerSounds: class {} }));
jest.mock('@engine/module/minigame/MGTrackFollowerAudio', () => ({ MGTrackFollowerAudio: class {} }));
jest.mock('@engine/module/minigame/MGHitCheck', () => ({ hitCheckPart: jest.fn() }));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@engine/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));
jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: class {} }));
jest.mock('@engine/module/minigame/MiniGame', () => ({ MiniGame: { PLAYER_JUMP_SPEED: 12 } }));
jest.mock('@engine/audio/AudioEngine', () => ({ AudioEngine: { GetAudioEngine: (): any => null } }));
jest.mock('@engine/audio/AudioEmitter', () => ({ AudioEmitter: class {} }));
jest.mock('@engine/module/serialization/MiniGameEnemySerializer', () => ({ miniGameEnemySerializer: {} }));

import { MiniGamePlayer } from '@engine/module/minigame/MiniGamePlayer';
import { MiniGameEnemy } from '@engine/module/minigame/MiniGameEnemy';
import { MiniGameGunBullet } from '@engine/module/minigame/MiniGameGunBullet';
import { MiniGamePlayerSerializer } from '@engine/module/serialization/MiniGamePlayerSerializer';
import { createBulletHitInfo } from '@engine/module/minigame/MGBulletHit';

function makePlayer(): MiniGamePlayer {
  const p = Object.create(MiniGamePlayer.prototype) as MiniGamePlayer;
  p.scripts = {};
  p.alive = true;
  p.deadBit = false;
  p.hit_points = 10;
  p.max_hps = 10;
  p.invince = 0;
  p.invince_period = 1;
  p.lastHPChange = 0;
  p.lastBulletHit = createBulletHitInfo();
  p.models = [];
  p.gunBanks = [];
  p.speed = 50;
  p.speed_min = 10;
  p.speed_max = 50;
  p.accelPerSec = 20;
  p.skipAccelNextFrame = false;
  p.running = false;
  p.trackAnimRate = 0;
  (p as any).track = {};
  (p as any).playAnimation = jest.fn();
  return p;
}

function makeEnemy(): MiniGameEnemy {
  const e = Object.create(MiniGameEnemy.prototype) as MiniGameEnemy;
  e.scripts = {};
  e.alive = true;
  e.deadBit = false;
  e.hit_points = 5;
  e.max_hps = 5;
  e.lastHPChange = 0;
  e.lastBulletHit = createBulletHitInfo();
  e.models = [];
  e.gunBanks = [];
  (e as any).playAnimation = jest.fn();
  return e;
}

describe('OnHitBullet default (SWMG_OnBulletHit) — C1', () => {
  it('skipScript=true does not re-run the OnHitBullet script', () => {
    const p = makePlayer();
    const run = jest.fn();
    p.scripts[ScriptHook.MGPlayerOnHitBullet] = { run } as any;
    p.lastBulletHit.damage = 3;
    p.lastBulletHit.targetType = 1;
    p.onHitBullet(undefined, true);
    expect(run).not.toHaveBeenCalled();
    expect(p.hit_points).toBe(7);
  });

  it('script path runs the script and applies no damage', () => {
    const p = makePlayer();
    const run = jest.fn();
    p.scripts[ScriptHook.MGPlayerOnHitBullet] = { run } as any;
    p.lastBulletHit.damage = 3;
    p.lastBulletHit.targetType = 1;
    p.onHitBullet(undefined, false);
    expect(run).toHaveBeenCalledTimes(1);
    expect(p.hit_points).toBe(10);
  });

  it('damage is gated by TargetType mask, not by invulnerability', () => {
    const p = makePlayer();
    p.invince = 5;
    p.lastBulletHit.damage = 4;
    p.lastBulletHit.targetType = 2; // enemy-only bullet
    p.onHitBullet(undefined, true);
    expect(p.hit_points).toBe(10);
    p.lastBulletHit.targetType = 3;
    p.onHitBullet(undefined, true);
    expect(p.hit_points).toBe(6);
  });

  it('enemy default applies damage for ENEMY target type', () => {
    const e = makeEnemy();
    e.lastBulletHit.damage = 2;
    e.lastBulletHit.targetType = 2;
    e.onHitBullet(undefined, true);
    expect(e.hit_points).toBe(3);
    e.lastBulletHit.targetType = 1;
    e.onHitBullet(undefined, true);
    expect(e.hit_points).toBe(3);
  });
});

describe('Dead bit before OnDeath — H1', () => {
  it('scripted OnDeath runs once across repeated lethal damage', () => {
    const p = makePlayer();
    const run = jest.fn();
    p.scripts[ScriptHook.MGPlayerOnDeath] = { run } as any;
    p.hit_points = 1;
    for(let i = 0; i < 3; i++){
      p.lastHPChange = -5;
      p.applyQueuedHitPoints();
    }
    expect(run).toHaveBeenCalledTimes(1);
    expect(p.deadBit).toBe(true);
    expect(p.alive).toBe(true);
  });

  it('die(true) (SWMG_OnDeath) still runs the default teardown after the dead bit', () => {
    const e = makeEnemy();
    const run = jest.fn();
    e.scripts[ScriptHook.MGEnemyOnDeath] = { run } as any;
    (e as any).stopTrack = jest.fn();
    (e as any).trackFollowerAudio = { playDeathSound: jest.fn(async () => {}) };
    (e as any).disposeFollower = jest.fn();
    mockMiniGame.removeEnemy = jest.fn();
    e.die(false);
    expect(run).toHaveBeenCalledTimes(1);
    e.die(true);
    expect(e.alive).toBe(false);
  });
});

describe('Player acceleration — H2', () => {
  it('derives acceleration from Accel_Secs as retail Load does', () => {
    expect(MiniGamePlayerSerializer.deriveAcceleration(10, 50, 2)).toBe(20);
    expect(MiniGamePlayerSerializer.deriveAcceleration(10, 50, 0)).toBe(40);
    expect(MiniGamePlayerSerializer.deriveAcceleration(10, 50, -1)).toBeUndefined();
    expect(MiniGamePlayerSerializer.deriveAcceleration(60, 50, 2)).toBeUndefined();
  });

  it('auto-accelerates toward max, decelerates above it, and skips one frame after a bump', () => {
    const p = makePlayer();
    p.speed = 10;
    p.applyAutoAcceleration(0.5);
    expect(p.speed).toBe(20);
    p.applyAutoAcceleration(10);
    expect(p.speed).toBe(50);

    p.speed = 80;
    p.applyAutoAcceleration(1);
    expect(p.speed).toBe(60);

    p.speed = 10;
    p.skipAccelNextFrame = true;
    p.applyAutoAcceleration(1);
    expect(p.speed).toBe(10);
    expect(p.skipAccelNextFrame).toBe(false);
    p.applyAutoAcceleration(1);
    expect(p.speed).toBe(30);
  });
});

describe('DoFollowerHitCheck — H3', () => {
  function makeBumpPlayer(){
    const p = makePlayer();
    const model = new THREE.Object3D();
    model.position.set(0, 0, 0);
    p.models = [model as any];
    p.sphere_radius = 1;
    p.bump_damage = 2;
    p.playerOffset = new THREE.Vector3();
    (p as any).container = new THREE.Object3D();
    (p as any).hitModelSegFrom = new THREE.Vector3(0, -2, 0);
    (p as any).hitModelSegReady = true;
    (p as any).keepInTunnel = jest.fn();
    (p as any).applySwoopTunnelOffset = jest.fn();
    (p as any).syncWorldSphereAndAudio = jest.fn();
    p.onHitFollower = jest.fn() as any;
    return p;
  }

  function makeBumpEnemy(trigger: boolean, x = 0.5){
    const cur = new THREE.Vector3(x, 0, 0);
    return {
      isTrigger: trigger,
      models: [{}],
      sphere_radius: 1,
      invince: 0,
      invince_period: 2,
      bump_damage: 3,
      getHitModelWorld: (out: THREE.Vector3) => out.copy(cur),
      getPreviousHitModelWorld: (out: THREE.Vector3) => out.copy(cur),
      hit: jest.fn(),
      adjustHitPoints: jest.fn(),
      onHitFollower: jest.fn(),
      lastFollowerHit: undefined as any,
    };
  }

  beforeEach(() => {
    mockMiniGame.type = MiniGameType.SWOOPRACE;
    mockMiniGame.bumpPlaneNormal = (_q: THREE.Quaternion, out: THREE.Vector3) => out.set(0, 0, 1);
  });

  it('swept sphere test hits when the relative path passes within rSum', () => {
    expect(MiniGamePlayer.sphereIntersectSegment(
      new THREE.Vector3(-5, 0.5, 0), new THREE.Vector3(5, 0.5, 0), 1)).toBe(true);
    expect(MiniGamePlayer.sphereIntersectSegment(
      new THREE.Vector3(-5, 3, 0), new THREE.Vector3(5, 3, 0), 1)).toBe(false);
    // No relative motion → no hit (retail 1e-9 guard).
    expect(MiniGamePlayer.sphereIntersectSegment(
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 1)).toBe(false);
  });

  it('trigger enemy fires OnHitFollower on both sides with no push or damage', () => {
    const p = makeBumpPlayer();
    const enemy = makeBumpEnemy(true);
    const pushed = p.doFollowerHitCheck([enemy as any], false, true);
    expect(pushed).toBe(0);
    expect(p.onHitFollower).toHaveBeenCalledWith(enemy as any);
    expect(enemy.onHitFollower).toHaveBeenCalledWith(p);
    expect(enemy.adjustHitPoints).not.toHaveBeenCalled();
    expect(p.playerOffset.x).toBe(0);
  });

  it('non-trigger enemy is skipped unless DoBumping is set', () => {
    const p = makeBumpPlayer();
    const enemy = makeBumpEnemy(false);
    expect(p.doFollowerHitCheck([enemy as any], false, true)).toBe(0);
    expect(enemy.onHitFollower).not.toHaveBeenCalled();
  });

  it('bump pushes the player out, damages both sides and resets speed; no one-shot latch', () => {
    const p = makeBumpPlayer();
    const enemy = makeBumpEnemy(false);
    p.speed = 50;
    const pushed = p.doFollowerHitCheck([enemy as any], true, true);
    expect(pushed).toBe(1);
    // Enemy at x=0.5 → player pushed toward −x to rSum + 0.1 from the enemy.
    expect(p.playerOffset.x).toBeCloseTo(0.5 - 2.1, 5);
    expect(enemy.hit).toHaveBeenCalledTimes(1);
    expect(enemy.adjustHitPoints).toHaveBeenCalledWith(-2, 0);
    expect(enemy.invince).toBe(2);
    expect(p.speed).toBe(p.speed_min);
    expect(p.hit_points).toBe(10 - 3);
    expect(p.skipAccelNextFrame).toBe(true);
    expect(p.onHitFollower).toHaveBeenCalledTimes(1);
    expect(enemy.onHitFollower).toHaveBeenCalledTimes(1);

    // Later contact (invulnerability expired) fires again.
    p.invince = 0;
    enemy.invince = 0;
    p.doFollowerHitCheck([enemy as any], true, true);
    expect(enemy.onHitFollower).toHaveBeenCalledTimes(2);
    expect(enemy.adjustHitPoints).toHaveBeenCalledTimes(2);
  });

  it('later passes push but raise no events', () => {
    const p = makeBumpPlayer();
    const enemy = makeBumpEnemy(false);
    p.invince = 5;
    expect(p.doFollowerHitCheck([enemy as any], true, false)).toBe(1);
    expect(enemy.onHitFollower).not.toHaveBeenCalled();
    expect(enemy.adjustHitPoints).not.toHaveBeenCalled();
  });
});

describe('Swoop bank animation — M1', () => {
  it('full stick ramps through intermediate bank levels over ~0.25 s', () => {
    const p = makePlayer();
    p.bankMagnitude = 0;
    p.bankLevel = 0;
    p.bankDecayLatched = false;
    const levels: number[] = [];
    for(let i = 0; i < 20; i++){
      p.updateBankAnimation(1, 1 / 60);
      levels.push(p.bankLevel);
    }
    expect(levels[0]).toBeLessThan(10);
    expect(new Set(levels).size).toBeGreaterThan(3);
    expect(levels[levels.length - 1]).toBe(10);
  });
});

describe('Player fire / OnFire — M3', () => {
  it('fire() only fires gun banks; OnFire is left to the startfire event', () => {
    const p = makePlayer();
    const run = jest.fn();
    p.scripts[ScriptHook.MGPlayerOnFire] = { run } as any;
    const bankFire = jest.fn();
    p.gunBanks = [{ fire: bankFire } as any];
    p.fire();
    expect(bankFire).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('Bullet dispatch — M4', () => {
  function makeBullet(shooter: any){
    const b = Object.create(MiniGameGunBullet.prototype) as MiniGameGunBullet;
    b.owner = { owner: shooter } as any;
    b.hit = false;
    b.exploding = false;
    b.damage_amt = 2;
    b.target_type = 2;
    b.collision_sound = '';
    b.lastHitPoint = new THREE.Vector3();
    b.lastHitNormal = new THREE.Vector3();
    return b;
  }

  it('enemy bullets skip their own shooter but can hit another enemy', () => {
    const shooter = makeEnemy();
    const other = makeEnemy();
    mockMiniGame.player = undefined;
    mockMiniGame.enemies = [other, shooter];
    mockMiniGame.obstacles = [];
    mockMiniGame.recordBulletHit = jest.fn();
    const b = makeBullet(shooter);
    const hits = jest.fn((_t: any): boolean => true);
    (b as any).hitsFollower = hits;
    b.doHitCheck();
    expect(hits).not.toHaveBeenCalledWith(shooter);
    expect(other.hit_points).toBe(3);
    expect(other.lastBulletHit.shooter).toBe(shooter);
  });

  it('follower without a hitbullet part is never hit (no sphere fallback)', () => {
    const b = makeBullet(undefined);
    b.directionLine = new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    const target: any = { models: [{ nodes: new Map(), getObjectByName: () => undefined }], sphere: { containsPoint: () => true } };
    expect(b.hitsFollower(target)).toBe(false);
  });
});

describe('Gun bank OnFire from synthetic startfire', () => {
  it('starting the "fire" anim runs owner OnFire even when the MDL has no startfire key (K1 mgg_null)', async () => {
    const actual = jest.requireActual('@engine/module/minigame/MiniGameGunBank') as any;
    const { OdysseyModel3D } = jest.requireMock('@engine/render/three/odyssey') as any;
    const bank = Object.create(actual.MiniGameGunBank.prototype);
    const gun = Object.create(OdysseyModel3D.prototype);
    gun.odysseyAnimationMap = new Map([['fire', { events: [{ name: 'fire0' }] }]]);
    gun.playAnimation = jest.fn();
    const onFire = jest.fn();
    bank.owner = { onFire, lastBulletFired: { damage: 0, targetType: 0 } };
    bank.guns = [gun];
    bank.gunFireTimers = [0];
    bank.pendingFallbackFire = [false];
    bank.proto_bullet = { rate_of_fire: 1, damage_amt: 3, target_type: 2 };
    bank.disabled = false;
    bank.isPlayer = true;
    bank.fire();
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(bank.owner.lastBulletFired.damage).toBe(3);
    // Cooldown: no second OnFire until the rate timer expires.
    bank.fire();
    expect(onFire).toHaveBeenCalledTimes(1);
  });
});
