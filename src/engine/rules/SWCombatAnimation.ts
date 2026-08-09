import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * One row of `combatanimations.2da`.
 *
 * Defines the animation mappings used when resolving combat attacks,
 * parries, dodges, and damage reactions.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SWCombatAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWCombatAnimation {
  /** Row index in the 2DA (`__index`). */
  index: number = 0;

  /** Animation index in the 2DA (`__rowlabel`). */
  animationId: number = 0;

  /** Number of attack hits used by this combat animation set. */
  hits: number = 0;

  /** Attack animation indices. */
  hit1: number = -1;
  hit2: number = -1;
  hit3: number = -1;

  /** Combat animation set 0. */
  parry0: number = -1;
  dodge0: number = -1;
  damage0: number = -1;

  /** Combat animation set 1. */
  parry1: number = -1;
  dodge1: number = -1;
  damage1: number = -1;

  /** Combat animation set 2. */
  parry2: number = -1;
  dodge2: number = -1;
  damage2: number = -1;

  /** Combat animation set 3. */
  parry3: number = -1;
  dodge3: number = -1;
  damage3: number = -1;

  /** Combat animation set 4. */
  parry4: number = -1;
  dodge4: number = -1;
  damage4: number = -1;

  /** Combat animation set 5. */
  parry5: number = -1;
  dodge5: number = -1;
  damage5: number = -1;

  /** Combat animation set 6. */
  parry6: number = -1;
  dodge6: number = -1;
  damage6: number = -1;

  /** Combat animation set 7. */
  parry7: number = -1;
  dodge7: number = -1;
  damage7: number = -1;

  /** Combat animation set 8. */
  parry8: number = -1;
  dodge8: number = -1;
  damage8: number = -1;

  /** Combat animation set 10. (TSL ONLY) */
  parry10: number = -1;
  dodge10: number = -1;
  damage10: number = -1;

  constructor(index: number = 0) {
    this.index = index;
  }

  /**
   * Normalize an animation reference.
   *
   * Blank / `****` 2DA cells resolve to -1, meaning that no animation
   * is defined for the slot.
   */
  private static animation(row: any, column: string): number {
    return TwoDAObject.normalizeValue(row[column], "number", -1);
  }

  apply2DA(row: any): void {
    this.index = TwoDAObject.normalizeValue(row.__index, "number", 0);
    this.animationId = TwoDAObject.normalizeValue(row.__rowlabel, "number", 0);

    this.hits = TwoDAObject.normalizeValue(row.hits, "number", 0);

    this.hit1 = SWCombatAnimation.animation(row, "hit1");
    this.hit2 = SWCombatAnimation.animation(row, "hit2");
    this.hit3 = SWCombatAnimation.animation(row, "hit3");

    this.parry0 = SWCombatAnimation.animation(row, "parry0");
    this.dodge0 = SWCombatAnimation.animation(row, "dodge0");
    this.damage0 = SWCombatAnimation.animation(row, "damage0");

    this.parry1 = SWCombatAnimation.animation(row, "parry1");
    this.dodge1 = SWCombatAnimation.animation(row, "dodge1");
    this.damage1 = SWCombatAnimation.animation(row, "damage1");

    this.parry2 = SWCombatAnimation.animation(row, "parry2");
    this.dodge2 = SWCombatAnimation.animation(row, "dodge2");
    this.damage2 = SWCombatAnimation.animation(row, "damage2");

    this.parry3 = SWCombatAnimation.animation(row, "parry3");
    this.dodge3 = SWCombatAnimation.animation(row, "dodge3");
    this.damage3 = SWCombatAnimation.animation(row, "damage3");

    this.parry4 = SWCombatAnimation.animation(row, "parry4");
    this.dodge4 = SWCombatAnimation.animation(row, "dodge4");
    this.damage4 = SWCombatAnimation.animation(row, "damage4");

    this.parry5 = SWCombatAnimation.animation(row, "parry5");
    this.dodge5 = SWCombatAnimation.animation(row, "dodge5");
    this.damage5 = SWCombatAnimation.animation(row, "damage5");

    this.parry6 = SWCombatAnimation.animation(row, "parry6");
    this.dodge6 = SWCombatAnimation.animation(row, "dodge6");
    this.damage6 = SWCombatAnimation.animation(row, "damage6");

    this.parry7 = SWCombatAnimation.animation(row, "parry7");
    this.dodge7 = SWCombatAnimation.animation(row, "dodge7");
    this.damage7 = SWCombatAnimation.animation(row, "damage7");

    this.parry8 = SWCombatAnimation.animation(row, "parry8");
    this.dodge8 = SWCombatAnimation.animation(row, "dodge8");
    this.damage8 = SWCombatAnimation.animation(row, "damage8");

    this.parry10 = SWCombatAnimation.animation(row, "parry10");
    this.dodge10 = SWCombatAnimation.animation(row, "dodge10");
    this.damage10 = SWCombatAnimation.animation(row, "damage10");
  }

  getParryAnimation( weaponWield: number ): number {
    switch (weaponWield) {
      case 0: return this.parry0;
      case 1: return this.parry1;
      case 2: return this.parry2;
      case 3: return this.parry3;
      case 4: return this.parry4;
      case 5: return this.parry5;
      case 6: return this.parry6;
      case 7: return this.parry7;
      case 8: return this.parry8;
      case 10: return this.parry10;
      default: return -1;
    }
  }

  getDamageAnimation( weaponWield: number ): number {
    switch (weaponWield) {
      case 0: return this.damage0;
      case 1: return this.damage1;
      case 2: return this.damage2;
      case 3: return this.damage3;
      case 4: return this.damage4;
      case 5: return this.damage5;
      case 6: return this.damage6;
      case 7: return this.damage7;
      case 8: return this.damage8;
      case 10: return this.damage10;
      default: return -1;
    }
  }

  getDodgeAnimation( weaponWield: number ): number {
    switch (weaponWield) {
      case 0: return this.dodge0;
      case 1: return this.dodge1;
      case 2: return this.dodge2;
      case 3: return this.dodge3;
      case 4: return this.dodge4;
      case 5: return this.dodge5;
      case 6: return this.dodge6;
      case 7: return this.dodge7;
      case 8: return this.dodge8;
      case 10: return this.dodge10;
      default: return -1;
    }
  }

  static From2DA(row: any): SWCombatAnimation {
    const combatAnimation = new SWCombatAnimation();
    combatAnimation.apply2DA(row);
    return combatAnimation;
  }
}