import { afterEach, describe, expect, test } from '@jest/globals';
import { OdysseyMaterialBuilder } from '@/three/odyssey/OdysseyMaterialBuilder';

describe('OdysseyMaterialBuilder.resolveEnvMapResRef', () => {
  afterEach(() => {
    OdysseyMaterialBuilder.defaultEnvMap = '';
  });

  test('resolves DEFAULT to the current area DefaultEnvMap (engine envmap assign)', () => {
    OdysseyMaterialBuilder.defaultEnvMap = 'cm_baremetal';
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef('DEFAULT')).toBe('cm_baremetal');
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef('default')).toBe('cm_baremetal');
  });

  test('returns empty when DEFAULT is used but the area has no DefaultEnvMap', () => {
    OdysseyMaterialBuilder.defaultEnvMap = '';
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef('DEFAULT')).toBe('');
  });

  test('passes explicit envmap names through unchanged', () => {
    OdysseyMaterialBuilder.defaultEnvMap = 'cm_bright';
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef('CM_Baremetal')).toBe('CM_Baremetal');
  });

  test('returns empty for empty input', () => {
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef('')).toBe('');
    expect(OdysseyMaterialBuilder.resolveEnvMapResRef(undefined as any)).toBe('');
  });
});
