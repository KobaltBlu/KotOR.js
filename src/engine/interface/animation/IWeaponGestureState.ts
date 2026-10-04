/**
 * Fire-forget weapon-item Gob gesture (equip draw / PowerItem paths).
 * Moving flourish uses body/head MELEE_WIELD overlay instead.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IWeaponGestureState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IWeaponGestureState {
  animationName: string;
  /** Seconds remaining until weaponPowered(false) / clear. */
  remaining: number;
  active: boolean;
}
