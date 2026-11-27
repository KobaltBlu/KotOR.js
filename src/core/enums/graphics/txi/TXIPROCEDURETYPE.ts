/**
 * TXIPROCEDURETYPE enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TXIPROCEDURETYPE.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum TXIPROCEDURETYPE {
  'NONE'= 0,
  'CYCLE'= 1,
  'WATER'= 2,
  'RANDOM'= 3,
  'RINGTEXDISTORT'= 4,
  /** TSL DirtyTextureController layer 0 → dirtytex */
  'DIRTY'= 5,
  /** TSL DirtyTextureController layer 1 → dirtytex2 */
  'DIRTY2'= 6,
  /** TSL DirtyTextureController layer 2 → dirtytex3 */
  'DIRTY3'= 7,
};