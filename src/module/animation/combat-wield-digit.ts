/**
 * Retail UpdateWeaponClass / ServerToClientAnimation combat-wield helpers.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file combat-wield-digit.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { WeaponWield } from '@/enums/combat/WeaponWield';

export interface CombatWieldItem {
  getWeaponWield(): WeaponWield;
  getWeaponType(): number;
}

export interface CombatWieldEquipment {
  RIGHTHAND?: CombatWieldItem;
  LEFTHAND?: CombatWieldItem;
  CLAW1?: CombatWieldItem;
  CLAW2?: CombatWieldItem;
  CLAW3?: CombatWieldItem;
}

/**
 * Combat animation weapon digit (g*r1 / m*a1 *).
 * CSWCCreature::UpdateWeaponClass @ 00613710.
 */
export function combatAnimationWeaponDigit(
  equipment: CombatWieldEquipment,
  isSimpleCreature: boolean = false
): number {
  if(
    equipment.CLAW1 ||
    equipment.CLAW2 ||
    equipment.CLAW3 ||
    isSimpleCreature
  ){
    return 0;
  }

  const rWeapon = equipment.RIGHTHAND;
  const lWeapon = equipment.LEFTHAND;

  if(!rWeapon){
    return lWeapon ? 0 : 8;
  }

  if(lWeapon){
    switch(lWeapon.getWeaponWield()){
      case WeaponWield.ONE_HANDED_SWORD:
        return 4;
      case WeaponWield.BLASTER_PISTOL:
        return 6;
      default:
        return 0;
    }
  }

  switch(rWeapon.getWeaponWield()){
    case WeaponWield.STUN_BATON:
      return 1;
    case WeaponWield.ONE_HANDED_SWORD:
      return 2;
    case WeaponWield.TWO_HANDED_SWORD:
      return 3;
    case WeaponWield.BLASTER_PISTOL:
      return 5;
    case WeaponWield.BLASTER_RIFLE:
      return 7;
    case WeaponWield.BLASTER_HEAVY:
      return 9;
    default:
      return 8;
  }
}

/**
 * Attack family letter for combat clip names (m/b/g).
 * Dual uses off-hand weapon_type (UpdateWeaponClass field45_0xc7).
 */
export function combatAnimationAttackKey(
  equipment: CombatWieldEquipment
): string {
  const claw = equipment.CLAW1 || equipment.CLAW2 || equipment.CLAW3;
  if(claw){
    const weaponType = claw.getWeaponType();
    if(weaponType === 1 || weaponType === 3 || weaponType === 4){
      return 'm';
    }
    return 'g';
  }

  const rWeapon = equipment.RIGHTHAND;
  const lWeapon = equipment.LEFTHAND;
  const source = rWeapon && lWeapon ? lWeapon : rWeapon;
  if(!source){
    return 'g';
  }

  switch(source.getWeaponType()){
    case 4:
      return 'b';
    case 1:
      return 'm';
    default:
      return 'g';
  }
}

/** Heavy digit 9 shares rifle (7) combatanimations columns / g7* clips. */
export function combatReactionClipDigit(weaponDigit: number): number {
  return weaponDigit === 9 ? 7 : weaponDigit;
}

/** READY / READY_ALT → g*r1 rows (ServerToClientAnimation 0x2711). */
export function readyAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 1: return 92;
    case 2: return 133;
    case 3: return 174;
    case 4: return 215;
    case 5: return 223;
    case 6: return 237;
    case 7:
    case 9: return 245;
    case 8:
    default: return 249;
  }
}

/**
 * DAMAGED (10302) weapon-dependent rows (not DAMAGE 10014 → 303).
 */
export function damagedAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 2: return 124;
    case 3: return 206;
    case 4: return 165;
    case 5: return 220;
    case 6: return 234;
    case 7:
    case 9: return 242;
    case 8: return 280;
    default: return 303;
  }
}

/** BLASTER_DEFLECTION_1H (10300). */
export function blasterDeflection1HAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 2: return 109;
    case 3: return 151;
    case 4: return 192;
    default: return 109;
  }
}

/** BLASTER_DEFLECTION_2H (10301). */
export function blasterDeflection2HAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 2: return 110;
    case 3: return 151;
    case 4: return 192;
    default: return 110;
  }
}

/** MELEE_WIELD → G*F1 overlay rows (overlay=1). */
export function meleeWieldAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 2: return 377;
    case 4: return 376;
    default: return 378;
  }
}

/** FLOURISH / MELEE_COMBAT_WIELD → g*w1 fireforget rows. */
export function flourishAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 1: return 91;
    case 2: return 132;
    case 3: return 173;
    case 4: return 214;
    case 5: return 222;
    case 6: return 136;
    case 7:
    case 9: return 244;
    case 8:
    default: return 373;
  }
}

/** Same g*w1 table as FLOURISH. */
export function meleeCombatWieldAnimationRow(weaponType: number): number {
  return flourishAnimationRow(weaponType);
}
