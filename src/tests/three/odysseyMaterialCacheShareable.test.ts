import { describe, expect, test } from '@jest/globals';
import { OdysseyModelNodeType } from '@/enums/odyssey/OdysseyModelNodeType';
import { nodeMaterialCacheShareable } from '@/three/odyssey/nodeMaterialCacheShareable';

function meshNode(partial: Record<string, unknown>) {
  return {
    nAnimateUV: 0,
    nodeType: OdysseyModelNodeType.Mesh,
    beaming: 0,
    dirtEnabled: 0,
    isAnimDummyNode: false,
    hasLightmap: false,
    textureMap2: '',
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
});
