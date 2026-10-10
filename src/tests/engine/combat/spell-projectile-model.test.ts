/**
 * Spell projectile model resref resolution.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  resolveItemModelResRef,
  resolveSpellProjectileModelCandidates,
  resolveSpellProjectileModelResRef,
} from '@engine/combat/spell-projectile-model';

describe('resolveItemModelResRef', () => {
  it('builds defaultModel + variation like Item.loadModel', () => {
    const item = {
      baseItem: { itemClass: 'w_grenade01', defaultModel: 'w_grenade01_001' },
      getModelVariation: () => 1,
    } as any;
    expect(resolveItemModelResRef(item)).toBe('w_grenade01_001');
  });
});

describe('resolveSpellProjectileModelResRef', () => {
  it('prefers spell projmodel', () => {
    expect(resolveSpellProjectileModelResRef(
      { projmodel: 'v_grenade', proj: 1 },
      undefined
    )).toBe('v_grenade');
  });

  it('falls back to item model when projmodel empty', () => {
    const item = {
      baseItem: { itemClass: 'w_grenade01', defaultModel: 'w_grenade01_001' },
      getModelVariation: () => 1,
    } as any;
    expect(resolveSpellProjectileModelResRef(
      { projmodel: '****', proj: 1 },
      item
    )).toBe('w_grenade01_001');
  });
});

describe('resolveSpellProjectileModelCandidates', () => {
  it('returns empty when proj is explicitly 0 for non-grenade items', () => {
    const item = {
      baseItem: { itemClass: 'w_medpac', defaultModel: 'w_medpac001', itemType: 0x2d },
      getModelVariation: () => 1,
    } as any;
    expect(resolveSpellProjectileModelCandidates(
      { projmodel: 'v_grenade', proj: 0 },
      item
    )).toEqual([]);
  });

  it('falls back to grenade item mesh when proj is 0', () => {
    const item = {
      baseItem: { itemClass: 'w_grenade01', defaultModel: 'w_grenade01_001', itemType: 6 },
      getModelVariation: () => 1,
    } as any;
    expect(resolveSpellProjectileModelCandidates(
      { projmodel: '****', proj: 0 },
      item
    )).toEqual(['w_grenade01_001']);
  });

  it('snapshots spell then item resrefs for async load after item destroy', () => {
    const item = {
      baseItem: { itemClass: 'w_grenade01', defaultModel: 'w_grenade01_001' },
      getModelVariation: () => 1,
    } as any;
    expect(resolveSpellProjectileModelCandidates(
      { projmodel: '****', proj: 1 },
      item
    )).toEqual(['w_grenade01_001']);
    expect(resolveSpellProjectileModelCandidates(
      { projmodel: 'v_grenade', proj: 1 },
      item
    )).toEqual(['v_grenade', 'w_grenade01_001']);
  });
});
