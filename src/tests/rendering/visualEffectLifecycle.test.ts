/// <reference types="jest" />
import { EffectVisualEffect } from '@/effects/EffectVisualEffect';
import { GameEffectDurationType } from '@/enums/effects/GameEffectDurationType';
import { MDLLoader } from '@/loaders';
import { OdysseyModel3D } from '@/three/odyssey';

jest.mock('@/GameState', () => ({ GameState: {
  CameraShakeManager: { playRumblePattern: jest.fn() },
  scene: { add: jest.fn() },
} }));
jest.mock('@/utility/Utility', () => ({ Utility: {
  PadInt: (value: number, width: number) => String(value).padStart(width, '0'),
} }));
jest.mock('@/audio/AudioEmitter', () => ({ AudioEmitter: class {} }));
jest.mock('@/loaders', () => ({
  MDLLoader: { loader: { load: jest.fn() } },
  TextureLoader: { LoadQueue: jest.fn() },
}));
jest.mock('@/odyssey', () => ({ OdysseyModel: class {} }));
jest.mock('@/three/odyssey', () => ({ OdysseyModel3D: class {
  static FromMDL = jest.fn();
  removeFromParent = jest.fn();
  dispose = jest.fn();
  odysseyAnimations: unknown[] = [];
  children: unknown[] = [];
  meshes: unknown[] = [];
  emitters: unknown[] = [];
} }));
jest.mock('@/effects/GameEffect', () => ({ GameEffect: class {
  applied = false;
  durationEnded = false;
  object: any;
  durationType = 0;
  initialize() {}
  onApply() { this.applied = true; }
  update() {}
  getInt() { return 0; }
  getDurationType() { return this.durationType; }
  setDurationType(value: number) { this.durationType = value; }
} }));

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function effectFixture() {
  const effect = new EffectVisualEffect();
  effect.setDurationType(GameEffectDurationType.INSTANT);
  effect.visualEffect = {
    type_fd: 'F', imp_impact_node: 'synthetic', imp_root_m_node: '****',
    imp_headcon_node: '****', soundimpact: '****', rumblepattern: -1,
  };
  effect.object = { objectType: 0, context: {}, model: { add: jest.fn() }, removeEffect: jest.fn() } as any;
  return effect;
}

beforeEach(() => jest.clearAllMocks());

test('a model resolving after removal is disposed and never attached', async () => {
  let resolve!: (value: unknown) => void;
  (MDLLoader.loader.load as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const model = new OdysseyModel3D();
  (OdysseyModel3D.FromMDL as jest.Mock).mockResolvedValue(model);
  const effect = effectFixture();
  effect.onApply();
  expect(effect.pendingModelLoads).toBe(1);
  effect.onRemove();
  resolve({});
  await flush();
  expect(model.dispose).toHaveBeenCalledTimes(1);
  expect(model.removeFromParent).toHaveBeenCalledTimes(1);
  expect(effect.object.model.add).not.toHaveBeenCalled();
  expect(effect.pendingModelLoads).toBe(0);
  expect(effect.impact_model).toBeUndefined();
});

test('failed instant-effect loads settle and remove the empty effect', async () => {
  (MDLLoader.loader.load as jest.Mock).mockRejectedValue(new Error('synthetic missing resource'));
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const effect = effectFixture();
  effect.onApply();
  await flush();
  expect(effect.pendingModelLoads).toBe(0);
  expect(effect.object.removeEffect).toHaveBeenCalledWith(effect);
  error.mockRestore();
});

test('removal detaches all models and is safe to repeat', () => {
  const effect = effectFixture();
  const model = new OdysseyModel3D();
  effect.impact_root_model = model;
  effect.onRemove();
  effect.onRemove();
  expect(model.removeFromParent).toHaveBeenCalledTimes(1);
  expect(model.dispose).toHaveBeenCalledTimes(1);
  expect(effect.impact_root_model).toBeUndefined();
});
