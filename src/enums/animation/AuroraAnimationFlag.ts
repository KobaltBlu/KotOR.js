/**
 * Aurora gob PlayAnimation flag bits used by overlay start/stop.
 * From SetOverlayAnimation.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AuroraAnimationFlag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum AuroraAnimationFlag {
  FIRE_FORGET = 0x001,
  LOOPING = 0x004,
  /** Overlay slot — stack without clearing locomotion base. */
  OVERLAY_SLOT = 0x008,
  /**
   * Queue behind current base (PlayAnimation 0x20) — e.g. planet
   * `rotate` after `zoomin` on the galaxy map.
   */
  QUEUE = 0x020,
  /** Overlay stop / remove semantics. */
  OVERLAY_STOP = 0x080,
  /** Additive gesture — weight fade; common for combat/dialog gestures. */
  ADDITIVE_GESTURE = 0x400,
}
