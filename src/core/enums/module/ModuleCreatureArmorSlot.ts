/**
 * ModuleCreatureArmorSlot enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleCreatureArmorSlot.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ModuleCreatureArmorSlot {
  HEAD          = 0x1,
  ARMOR         = 0x2,
  ARMS          = 0x8,
  RIGHTHAND     = 0x10,
  LEFTHAND      = 0x20,
  LEFTARMBAND   = 0x80,
  RIGHTARMBAND  = 0x100,
  IMPLANT       = 0x200,
  BELT          = 0x400,

  CLAW1         = 0x4000,
  CLAW2         = 0x8000,
  CLAW3         = 0x10000,
  HIDE          = 0x20000,
  RIGHTHAND2    = 0x40000,
  LEFTHAND2     = 0x80000,
};