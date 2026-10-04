/**
 * @jest-environment node
 *
 * Swoop obstacle / enemy scene attach — single SetPosition, track bind, no orphans.
 * Run: npx jest --config jest.audio-priority.config.js src/module/ModuleMiniGame.swoop-render.test.ts --coverage=false
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as THREE from 'three';

const creaturesGroup = new THREE.Group();
const scene = new THREE.Scene();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    scene,
    group: { creatures: creaturesGroup },
    Module: { ModuleArea: { ModuleMGPlayer: class {} } },
  },
}));

jest.mock('@engine/module/ModuleObject', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const THREE = require('three');
  return {
    ModuleObject: class {
      container = new THREE.Group();
      position = this.container.position;
      context = {};
      scripts: Record<string, unknown> = {};
      objectType = 0;
      model: unknown;
      initialized = false;
    },
  };
});

jest.mock('@engine/loaders', () => ({
  MDLLoader: {
    loader: {
      load: jest.fn(async () => ({})),
    },
  },
}));

jest.mock('@engine/render/three/odyssey', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const THREE = require('three');
  class FakeModel extends THREE.Object3D {
    odysseyAnimationMap = new Map();
    playAnimation = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    dispose = jest.fn();
  }
  return {
    OdysseyModel3D: Object.assign(FakeModel, {
      FromMDL: jest.fn(async () => new FakeModel()),
    }),
    OdysseyObject3D: class extends THREE.Object3D {},
  };
});

jest.mock('@engine/odyssey', () => ({
  OdysseyModel: class {},
  OdysseyModelAnimationManager: class {},
}));

jest.mock('@engine/module/minigame/MiniGameObjectArray', () => ({
  MiniGameObjectArray: {
    register: jest.fn(),
    unregister: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: { GetAudioEngine: () => ({}) },
}));
jest.mock('@engine/audio/AudioLoader', () => ({
  AudioLoader: { LoadMusic: async () => ({ buffer: new ArrayBuffer(0) }) },
}));
jest.mock('@engine/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {},
}));
jest.mock('@core/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@core/resource/GFFStruct', () => ({ GFFStruct: class {} }));

import { GameState } from '@engine/runtime/GameState';
import { ModuleMGObstacle } from '@engine/module/ModuleMGObstacle';
import { ModuleMiniGame } from '@engine/module/ModuleMiniGame';
import { ModuleMGTrack } from '@engine/module/ModuleMGTrack';

describe('swoop obstacle / enemy rendering attach', () => {
  beforeEach(() => {
    while(creaturesGroup.children.length){
      creaturesGroup.remove(creaturesGroup.children[0]);
    }
    while(scene.children.length){
      scene.remove(scene.children[0]);
    }
  });

  it('obstacle loadModel sets container to LYT pos once (model local origin)', async () => {
    const layoutPos = new THREE.Vector3(40, 80, 5);
    const obstacle = new ModuleMGObstacle(undefined as any, {
      name: 'mg_testpad',
      position: layoutPos.clone(),
    });

    await obstacle.loadModel();

    expect(obstacle.models.length).toBe(1);
    const model = obstacle.models[0];
    expect(model.position.x).toBe(0);
    expect(model.position.y).toBe(0);
    expect(model.position.z).toBe(0);
    expect(obstacle.position.x).toBe(40);
    expect(obstacle.position.y).toBe(80);
    expect(obstacle.position.z).toBe(5);
    // World = container only (not 2×).
    obstacle.container.updateMatrixWorld(true);
    const world = new THREE.Vector3();
    model.getWorldPosition(world);
    expect(world.x).toBeCloseTo(40);
    expect(world.y).toBeCloseTo(80);
    expect(world.z).toBeCloseTo(5);
    expect(obstacle.container.parent).toBe(GameState.scene);

    // Lit path matches placeables / MG player & enemies.
    const { OdysseyModel3D } = await import('@engine/render/three/odyssey');
    expect(OdysseyModel3D.FromMDL).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ castShadow: true, receiveShadow: true })
    );
  });

  it('obstacle constructor assigns template like player/enemy', () => {
    const template = { RootNode: {} } as any;
    const obstacle = new ModuleMGObstacle(template, {
      name: 'm03mg_mgo01',
      position: new THREE.Vector3(1, 2, 3),
    });
    expect(obstacle.template).toBe(template);
  });

  it('collectLightingModels omits tunnel-local position (binder uses model world pose)', () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    const worldModel = { materials: [{}], name: 'bike' } as any;
    mg.player = {
      position: new THREE.Vector3(0, 0, 2), // tunnel-local — must not be used for lights
      models: [worldModel],
      gunBanks: [],
      camera: { materials: [{}], name: 'hud_cam' },
    } as any;
    mg.enemies = [];
    mg.obstacles = [
      {
        position: new THREE.Vector3(100, 20, 2),
        models: [{ materials: [{}], name: 'buoy' }],
      } as any,
    ];

    const out: Array<{ model?: unknown; position?: THREE.Vector3 }> = [];
    mg.collectLightingModels(out);

    expect(out.length).toBe(2);
    expect(out.every((e) => e.position === undefined)).toBe(true);
    expect(out.map((e) => (e.model as any).name).sort()).toEqual(['bike', 'buoy']);
  });

  it('bindFollowerTrack returns false and leaves creatures empty when Track missing', async () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.tracks = [];

    const follower = {
      trackName: 'missing_track',
      setTrack: jest.fn(),
    };

    const ok = await mg.bindFollowerTrack(follower, 0);
    expect(ok).toBe(false);
    expect(follower.setTrack).not.toHaveBeenCalled();
    expect(creaturesGroup.children.length).toBe(0);
  });

  it('bindFollowerTrack parents track under group.creatures and calls setTrack', async () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    const proto = {
      track: 'race_track_a',
      createFollowerModel: jest.fn(async () => {
        const track = new THREE.Object3D();
        track.name = 'race_track_a';
        const hook = new THREE.Object3D();
        hook.name = 'modelhook';
        track.add(hook);
        return track as any;
      }),
    };
    mg.tracks = [proto as any];

    const follower = {
      trackName: 'Race_Track_A',
      setTrack: jest.fn(),
    };

    const ok = await mg.bindFollowerTrack(follower, 0);
    expect(ok).toBe(true);
    expect(proto.createFollowerModel).toHaveBeenCalled();
    expect(creaturesGroup.children.length).toBe(1);
    expect(follower.setTrack).toHaveBeenCalledWith(
      creaturesGroup.children[0],
      true,
      0
    );
  });

  it('loadMGEnemies drops enemies whose Track has no LYT proto', async () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.tracks = [
      {
        track: 'good_track',
        createFollowerModel: jest.fn(async () => {
          const track = new THREE.Object3D();
          const hook = new THREE.Object3D();
          hook.name = 'modelhook';
          track.add(hook);
          return track as any;
        }),
      } as any,
    ];

    const disposed: string[] = [];
    const bad = {
      trackName: 'no_such_track',
      load: jest.fn(async () => {}),
      loadModel: jest.fn(async () => {}),
      loadGunBanks: jest.fn(async () => {}),
      disposeFollower: () => { disposed.push('bad'); },
      computeBoundingBox: jest.fn(),
      getCurrentRoom: jest.fn(),
      setTrack: jest.fn(),
    };
    // Track is on the ARE template — empty until load/initProperties.
    const good = {
      trackName: '',
      load: jest.fn(async function (this: { trackName: string }) {
        this.trackName = 'GOOD_TRACK';
      }),
      loadModel: jest.fn(async () => {}),
      loadGunBanks: jest.fn(async () => {}),
      disposeFollower: () => { disposed.push('good'); },
      computeBoundingBox: jest.fn(),
      getCurrentRoom: jest.fn(),
      setTrack: jest.fn(),
    };
    mg.enemies = [bad, good] as any;

    await mg.loadMGEnemies();

    expect(disposed).toEqual(['bad']);
    expect(mg.enemies).toHaveLength(1);
    expect(mg.enemies[0]).toBe(good);
    expect(bad.load).toHaveBeenCalled();
    expect(good.load).toHaveBeenCalled();
    expect(ModuleMGTrack.normalizeName(good.trackName)).toBe('good_track');
  });
});
