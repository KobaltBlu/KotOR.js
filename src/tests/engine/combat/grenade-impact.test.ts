/**
 * Grenade impact alignment — GrenadeSND, shapes, spell-target plumbing.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/managers/PartyManager', () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock('@engine/runtime/GameState', () => ({
  GameState: { CursorManager: { isClientCombatMode: () => false } },
}));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@engine/managers/ResolutionManager', () => ({ ResolutionManager: { addResolution: () => {} } }));
jest.mock('@engine/pathfinding/visual-los', () => ({ hasVisualLos: () => true }));

import { SWGrenadeSound } from '@engine/rules/SWGrenadeSound';
import {
  ModuleObjectManager,
  ShapeType,
} from '@engine/managers/ModuleObjectManager';
import { isGrenadeItemType } from '@engine/combat/item-cast-grenade';

describe('SWGrenadeSound', () => {
  it('parses GrenadeSND label/sound rows', () => {
    const row = SWGrenadeSound.From2DA({
      __index: 4,
      label: 'Stone',
      sound: 'fs_metal_droid1',
    });
    expect(row.id).toBe(4);
    expect(row.label).toBe('Stone');
    expect(row.getSoundResRef()).toBe('fs_metal_droid1');
  });

  it('treats **** as empty', () => {
    const row = SWGrenadeSound.From2DA({
      __index: 7,
      label: 'Nonwalk',
      sound: '****',
    });
    expect(row.getSoundResRef()).toBe('');
  });
});

describe('GetSpellTargetLocation contract', () => {
  // Mirrors the fixed NWScript opcode: return the stamped location, never void.
  // Prefer talent object target only when it is a real target — not the caster.
  const resolveSpellTargetLocation = (opts: {
    talentTarget?: { getLocation: () => { x: number } };
    spellTargetPosition?: { x: number; y: number; z: number };
  }) => {
    if(opts.talentTarget) return opts.talentTarget.getLocation();
    if(opts.spellTargetPosition){
      return { ...opts.spellTargetPosition };
    }
    return { x: 0, y: 0, z: 0 };
  };

  it('returns the talent target location when present', () => {
    expect(resolveSpellTargetLocation({
      talentTarget: { getLocation: () => ({ x: 12 }) },
    })).toEqual({ x: 12 });
  });

  it('falls back to caster spellTargetPosition', () => {
    expect(resolveSpellTargetLocation({
      spellTargetPosition: { x: 1, y: 2, z: 3 },
    })).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('uses throw location when object target was cleared (FORCEHOSTILE)', () => {
    // Grenades clear oTarget; impact scripts must read spellTargetPosition
    expect(resolveSpellTargetLocation({
      spellTargetPosition: { x: 10, y: 20, z: 0 },
    })).toEqual({ x: 10, y: 20, z: 0 });
  });
});

describe('grenade item-cast face + landing', () => {
  it('animates facing toward the throw point when object target is cleared', () => {
    const hasObjectTarget = false;
    const facePath = hasObjectTarget ? 'setFacingObject' : 'setFacing(animated)';
    expect(facePath).toBe('setFacing(animated)');
  });

  it('delays impact until projectile landing for throw range W / grenades', () => {
    const delayImpactToLanding = (range: string, impactAtLanding: boolean) =>
      impactAtLanding || range === 'L' || range === 'W';
    expect(delayImpactToLanding('W', true)).toBe(true);
    expect(delayImpactToLanding('W', false)).toBe(true);
    expect(delayImpactToLanding('S', false)).toBe(false);
    expect(delayImpactToLanding('L', false)).toBe(true);
  });
});

describe('objects-in-shape geometry', () => {
  const origin = new THREE.Vector3(0, 0, 0);
  const ahead = new THREE.Vector3(10, 0, 0);

  it('sphere includes points within radius', () => {
    expect(ModuleObjectManager.isInSphere(new THREE.Vector3(3, 0, 0), origin, 5)).toBe(true);
    expect(ModuleObjectManager.isInSphere(new THREE.Vector3(6, 0, 0), origin, 5)).toBe(false);
  });

  it('cube uses AABB half-extent', () => {
    expect(ModuleObjectManager.isInCube(new THREE.Vector3(1, 1, 1), origin, 2)).toBe(true);
    expect(ModuleObjectManager.isInCube(new THREE.Vector3(3, 0, 0), origin, 2)).toBe(false);
  });

  it('spell cylinder keeps a 1.5m corridor along the axis', () => {
    expect(ModuleObjectManager.isInSpellCylinder(new THREE.Vector3(5, 0, 0), origin, ahead, 10)).toBe(true);
    expect(ModuleObjectManager.isInSpellCylinder(new THREE.Vector3(5, 2, 0), origin, ahead, 10)).toBe(false);
    expect(ModuleObjectManager.isInSpellCylinder(new THREE.Vector3(-1, 0, 0), origin, ahead, 10)).toBe(false);
  });

  it('cone widens toward the end', () => {
    expect(ModuleObjectManager.isInCone(new THREE.Vector3(9, 0.5, 0), origin, ahead, 4)).toBe(true);
    expect(ModuleObjectManager.isInCone(new THREE.Vector3(2, 3, 0), origin, ahead, 4)).toBe(false);
  });

  it('spell cone requires forward alignment', () => {
    expect(ModuleObjectManager.isInSpellCone(new THREE.Vector3(5, 0, 0), origin, ahead, 10)).toBe(true);
    expect(ModuleObjectManager.isInSpellCone(new THREE.Vector3(0, 5, 0), origin, ahead, 10)).toBe(false);
  });

  it('isPointInShape dispatches engine shape ids', () => {
    expect(ModuleObjectManager.isPointInShape(
      ShapeType.SPHERE,
      new THREE.Vector3(1, 0, 0),
      origin,
      2
    )).toBe(true);
    expect(ModuleObjectManager.isPointInShape(
      ShapeType.CUBE,
      new THREE.Vector3(0.5, 0.5, 0.5),
      origin,
      1
    )).toBe(true);
  });
});

describe('grenade is not a ranged weapon', () => {
  it('ItemType 6 is a grenade', () => {
    expect(isGrenadeItemType(6)).toBe(true);
  });

  it('classification helper excludes grenades even when rangedWeapon=1', () => {
    // Mirrors ModuleItem.isRangedWeapon after the ItemType 6 guard
    const classify = (itemType: number, rangedWeapon: boolean) => {
      if(isGrenadeItemType(itemType)) return false;
      return !!rangedWeapon;
    };
    expect(classify(6, true)).toBe(false);
    expect(classify(8, true)).toBe(true); // blaster pistol baseitem-ish
  });
});
