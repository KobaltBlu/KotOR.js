/**
 * Combat animation wield digit + reaction constant tables (UpdateWeaponClass /
 * ServerToClientAnimation / ResolveReactionAnimation).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import { SWCombatAnimation } from '@/engine/rules/SWCombatAnimation';
import { WeaponWield } from '@/enums/combat/WeaponWield';
import {
  blasterDeflection1HAnimationRow,
  blasterDeflection2HAnimationRow,
  combatAnimationAttackKey,
  combatAnimationWeaponDigit,
  combatReactionClipDigit,
  damagedAnimationRow,
  readyAnimationRow,
} from '@/module/animation/combat-wield-digit';

function item(wield: WeaponWield, weaponType: number = 1) {
  return {
    getWeaponWield: () => wield,
    getWeaponType: () => weaponType,
  };
}

describe('combatAnimationWeaponDigit (UpdateWeaponClass)', () => {
  it('returns 8 when empty-handed', () => {
    expect(combatAnimationWeaponDigit({})).toBe(8);
  });

  it('returns 0 for left-hand only', () => {
    expect(combatAnimationWeaponDigit({
      LEFTHAND: item(WeaponWield.ONE_HANDED_SWORD),
    })).toBe(0);
  });

  it('returns 0 for claws / simple creatures', () => {
    expect(combatAnimationWeaponDigit({
      CLAW1: item(WeaponWield.ONE_HANDED_SWORD),
    })).toBe(0);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD),
    }, true)).toBe(0);
  });

  it('maps single main-hand wields', () => {
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.STUN_BATON),
    })).toBe(1);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD),
    })).toBe(2);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.TWO_HANDED_SWORD),
    })).toBe(3);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.BLASTER_PISTOL),
    })).toBe(5);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.BLASTER_RIFLE),
    })).toBe(7);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.BLASTER_HEAVY),
    })).toBe(9);
  });

  it('uses off-hand for dual wield digit', () => {
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD),
      LEFTHAND: item(WeaponWield.ONE_HANDED_SWORD),
    })).toBe(4);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.BLASTER_PISTOL),
      LEFTHAND: item(WeaponWield.BLASTER_PISTOL),
    })).toBe(6);
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD),
      LEFTHAND: item(WeaponWield.BLASTER_PISTOL, 4),
    })).toBe(6);
  });

  it('returns 0 for dual stun (off-hand not 1H melee/pistol)', () => {
    expect(combatAnimationWeaponDigit({
      RIGHTHAND: item(WeaponWield.STUN_BATON),
      LEFTHAND: item(WeaponWield.STUN_BATON),
    })).toBe(0);
  });
});

describe('combatAnimationAttackKey', () => {
  it('uses off-hand weapon_type when dual-wielding', () => {
    expect(combatAnimationAttackKey({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD, 1),
      LEFTHAND: item(WeaponWield.BLASTER_PISTOL, 4),
    })).toBe('b');
  });

  it('returns m for single melee and g when empty', () => {
    expect(combatAnimationAttackKey({
      RIGHTHAND: item(WeaponWield.ONE_HANDED_SWORD, 1),
    })).toBe('m');
    expect(combatAnimationAttackKey({})).toBe('g');
  });
});

describe('ServerToClientAnimation row helpers', () => {
  it('READY digit 9 shares g7r1 (245) with rifle', () => {
    expect(readyAnimationRow(7)).toBe(245);
    expect(readyAnimationRow(9)).toBe(245);
  });

  it('DAMAGED maps weapon digits to animation rows', () => {
    expect(damagedAnimationRow(2)).toBe(124);
    expect(damagedAnimationRow(3)).toBe(206);
    expect(damagedAnimationRow(4)).toBe(165);
    expect(damagedAnimationRow(7)).toBe(242);
    expect(damagedAnimationRow(9)).toBe(242);
    expect(damagedAnimationRow(8)).toBe(280);
  });

  it('BLASTER_DEFLECTION tables match expected rows', () => {
    expect(blasterDeflection1HAnimationRow(2)).toBe(109);
    expect(blasterDeflection2HAnimationRow(2)).toBe(110);
    expect(blasterDeflection1HAnimationRow(3)).toBe(151);
    expect(blasterDeflection1HAnimationRow(4)).toBe(192);
  });

  it('maps PARRY fallback row 301 and DODGE 302 via fixed constants', () => {
    // ServerToClientAnimation: PARRY=0x12d (301), DODGE=0x12e (302)
    expect(301).toBe(0x12d);
    expect(302).toBe(0x12e);
  });
});

describe('SWCombatAnimation digit 9 → column 7', () => {
  it('uses rifle columns for heavy digit', () => {
    expect(combatReactionClipDigit(9)).toBe(7);
    const row = new SWCombatAnimation();
    row.damage7 = 42;
    row.dodge7 = 43;
    row.parry7 = 44;
    expect(row.getDamageAnimation(9)).toBe(42);
    expect(row.getDodgeAnimation(9)).toBe(43);
    expect(row.getParryAnimation(9)).toBe(44);
    expect(row.getDamageAnimation(7)).toBe(42);
  });
});
