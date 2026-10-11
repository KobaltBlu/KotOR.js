/**
 * OdysseyModelAnimationManagerState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelAnimationManagerState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export interface OdysseyModelAnimationManagerState {
  loop: boolean;
  cFrame: number;
  elapsed: number;
  elapsedCount: number;
  lastTime: number;
  delta: number;
  lastEvent: number;
  events: boolean[];
  animation?: any;
  /** Playback rate; negative = reverse (mode 0). */
  speed?: number;
  /**
   * Per-controller frame cursors for the legacy animLoops sampling path.
   * Cleared on loop wrap / seek / animation identity change.
   * Prefer frameCursorArray when BoundAnimation is attached.
   */
  frameCursors?: Map<unknown, number>;
  /** BoundAnimation Int32Array cursors (legacy loops / shared sample path). */
  frameCursorArray?: Int32Array;
  /** BoundAnimation used to size/index frameCursorArray. */
  boundAnimation?: unknown;
}