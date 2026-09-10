import { describe, expect, test } from '@jest/globals';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { OdysseyModelNodeType } from '@/enums/odyssey/OdysseyModelNodeType';
import {
  collectMaterialUniqueAnimatedNodeNames,
  nodeHasAnimatedMaterialControllers,
  nodeMaterialCacheShareable,
} from '@/three/odyssey/nodeMaterialCacheShareable';

function meshNode(partial: Record<string, unknown>) {
  return {
    name: 'mesh',
    nAnimateUV: 0,
    nodeType: OdysseyModelNodeType.Mesh,
    beaming: 0,
    dirtEnabled: 0,
    isAnimDummyNode: false,
    hasLightmap: false,
    textureMap2: '',
    controllers: new Map(),
    ...partial,
  } as any;
}

describe('nodeMaterialCacheShareable', () => {
  test('allows placeable-style meshes without mergeStatic', () => {
    expect(nodeMaterialCacheShareable(meshNode({}), {})).toBe(true);
    expect(nodeMaterialCacheShareable(meshNode({}), { mergeStatic: false } as any)).toBe(true);
  });

  test('allows anim-dummy without lightmap', () => {
    expect(
      nodeMaterialCacheShareable(
        meshNode({ isAnimDummyNode: true, hasLightmap: false, textureMap2: '' }),
        {}
      )
    ).toBe(true);
  });

  test('blocks anim-dummy with lightmap', () => {
    expect(
      nodeMaterialCacheShareable(
        meshNode({ isAnimDummyNode: true, hasLightmap: true, textureMap2: 'room_lm0' }),
        {}
      )
    ).toBe(false);
  });

  test('blocks UV-anim / saber / hologram', () => {
    expect(nodeMaterialCacheShareable(meshNode({ nAnimateUV: 1 }), {})).toBe(false);
    expect(
      nodeMaterialCacheShareable(meshNode({ nodeType: OdysseyModelNodeType.Saber }), {})
    ).toBe(false);
    expect(nodeMaterialCacheShareable(meshNode({}), { isHologram: true } as any)).toBe(false);
  });

  test('blocks Skin meshes (USE_SKINNING must not share)', () => {
    expect(
      nodeMaterialCacheShareable(meshNode({ nodeType: OdysseyModelNodeType.Skin }), {})
    ).toBe(false);
  });

  test('blocks multi-frame SelfIllumColor on the mesh node', () => {
    const controllers = new Map([
      [
        OdysseyModelControllerType.SelfIllumColor,
        { data: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }] },
      ],
    ]);
    const node = meshNode({ controllers });
    expect(nodeHasAnimatedMaterialControllers(node)).toBe(true);
    expect(nodeMaterialCacheShareable(node, {})).toBe(false);
  });

  test('allows single-frame SelfIllumColor on the mesh node', () => {
    const controllers = new Map([
      [OdysseyModelControllerType.SelfIllumColor, { data: [{ x: 1, y: 1, z: 1 }] }],
    ]);
    const node = meshNode({ controllers });
    expect(nodeHasAnimatedMaterialControllers(node)).toBe(false);
    expect(nodeMaterialCacheShareable(node, {})).toBe(true);
  });

  test('blocks nodes named in uniqueMaterialNodeNames (anim-clip SelfIllum)', () => {
    const unique = new Set(['blinkpanel']);
    expect(
      nodeMaterialCacheShareable(meshNode({ name: 'BlinkPanel' }), {}, unique)
    ).toBe(false);
    expect(
      nodeMaterialCacheShareable(meshNode({ name: 'staticwall' }), {}, unique)
    ).toBe(true);
  });

  test('blocks multi-frame Alpha on the mesh node', () => {
    const controllers = new Map([
      [OdysseyModelControllerType.Alpha, { data: [{ value: 1 }, { value: 0.2 }] }],
    ]);
    expect(nodeMaterialCacheShareable(meshNode({ controllers }), {})).toBe(false);
  });
});

describe('collectMaterialUniqueAnimatedNodeNames', () => {
  test('collects SelfIllumColor and Alpha node names from clips', () => {
    const animations = [
      {
        nodes: [
          {
            name: 'PanelA',
            controllers: new Map([[OdysseyModelControllerType.SelfIllumColor, {}]]),
          },
          {
            name: 'PanelB',
            controllers: new Map([[OdysseyModelControllerType.Alpha, {}]]),
          },
          {
            name: 'Door',
            controllers: new Map([[OdysseyModelControllerType.Position, {}]]),
          },
        ],
      },
    ] as any;

    const names = collectMaterialUniqueAnimatedNodeNames(animations);
    expect(names.has('panela')).toBe(true);
    expect(names.has('panelb')).toBe(true);
    expect(names.has('door')).toBe(false);
  });
});
