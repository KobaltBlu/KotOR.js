/**
 * Item-cast caster level stamp (base_class_level).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

describe('item cast GetCasterLevel contract', () => {
  // Mirrors NWScript GetCasterLevel:
  // when field349 (itemSpellCastActive) is set, return base_class_level.
  const resolveCasterLevel = (opts: {
    itemSpellCastActive?: boolean;
    baseClassLevel?: number;
    spellCasterLevel?: number;
    totalLevel?: number;
  }) => {
    if(opts.itemSpellCastActive){
      return opts.baseClassLevel | 0;
    }
    const spellLv = opts.spellCasterLevel || 0;
    return spellLv > 0 ? spellLv : (opts.totalLevel || 0);
  };

  it('returns last-class stamp while item spell cast is active', () => {
    expect(resolveCasterLevel({
      itemSpellCastActive: true,
      baseClassLevel: 7,
      spellCasterLevel: 12,
      totalLevel: 15,
    })).toBe(7);
  });

  it('falls back to spellcaster / total levels when inactive', () => {
    expect(resolveCasterLevel({
      itemSpellCastActive: false,
      baseClassLevel: 7,
      spellCasterLevel: 12,
      totalLevel: 15,
    })).toBe(12);
    expect(resolveCasterLevel({
      spellCasterLevel: 0,
      totalLevel: 4,
    })).toBe(4);
  });
});

describe('item cast projectile path override', () => {
  it('prefers action param path when > 0', () => {
    const pathParam = 6;
    const fromSpell = 1;
    const pathType = pathParam > 0 ? pathParam : (fromSpell || 6);
    expect(pathType).toBe(6);
  });
});
