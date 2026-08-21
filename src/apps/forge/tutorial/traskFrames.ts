/**
 * Trask Ulgo spritesheet frame map (3x4 grid).
 *
 * @file traskFrames.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const TRASK_SPRITESHEET_COLS = 4;
export const TRASK_SPRITESHEET_ROWS = 3;

/** Public path served via Forge CopyPlugin (`src/assets/forge` → `/forge/`). */
export const TRASK_SPRITESHEET_URL = "images/trask-ulgo-spritesheet.png";

export type TraskFrameId =
  | "neutral"
  | "smile"
  | "speaking"
  | "surprised"
  | "serious"
  | "thinking"
  | "happy"
  | "skeptical"
  | "wink"
  | "determined"
  | "confused"
  | "comms";

export interface TraskFrameCoord {
  col: number;
  row: number;
}

/** Row-major frame coordinates into the 3×4 spritesheet. */
export const TRASK_FRAMES: Record<TraskFrameId, TraskFrameCoord> = {
  neutral: { col: 0, row: 0 },
  smile: { col: 1, row: 0 },
  speaking: { col: 2, row: 0 },
  surprised: { col: 3, row: 0 },
  serious: { col: 0, row: 1 },
  thinking: { col: 1, row: 1 },
  happy: { col: 2, row: 1 },
  skeptical: { col: 3, row: 1 },
  wink: { col: 0, row: 2 },
  determined: { col: 1, row: 2 },
  confused: { col: 2, row: 2 },
  comms: { col: 3, row: 2 },
};

/**
 * CSS `background-position` for a spritesheet cell when
 * `background-size` is `400% 300%` (cols × rows).
 */
export function getTraskFrameBackgroundPosition(frameId: TraskFrameId): string {
  const frame = TRASK_FRAMES[frameId];
  const x =
    TRASK_SPRITESHEET_COLS <= 1
      ? 0
      : (frame.col / (TRASK_SPRITESHEET_COLS - 1)) * 100;
  const y =
    TRASK_SPRITESHEET_ROWS <= 1
      ? 0
      : (frame.row / (TRASK_SPRITESHEET_ROWS - 1)) * 100;
  return `${x}% ${y}%`;
}

export function getTraskSpritesheetBackgroundSize(): string {
  return `${TRASK_SPRITESHEET_COLS * 100}% ${TRASK_SPRITESHEET_ROWS * 100}%`;
}
