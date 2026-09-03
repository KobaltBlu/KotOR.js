/**
 * Explicit module-editor interaction modes.
 *
 * @file EditorMode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export enum EditorMode {
  EDIT = "edit",
  PLACE = "place",
  VERTEX_EDIT = "vertex_edit",
  PREVIEW = "preview",
}

export enum EditorTool {
  SELECT = "select",
  TRANSLATE = "translate",
  ROTATE = "rotate",
  PLACE = "place",
}

export type TransformSpace = "local" | "world";

export interface SnapSettings {
  positionEnabled: boolean;
  positionStep: number;
  angleEnabled: boolean;
  angleStep: number;
  /** When true, Ctrl temporarily inverts snap enablement. */
  ctrlInverts: boolean;
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  positionEnabled: true,
  positionStep: 0.1,
  angleEnabled: true,
  angleStep: 5,
  ctrlInverts: true,
};
