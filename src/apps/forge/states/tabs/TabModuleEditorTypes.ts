/**
 * Module editor control / placement enums (kept separate to avoid circular imports
 * with TabModuleEditor ↔ TabModuleEditorState).
 *
 * @file TabModuleEditorTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export enum TabModuleEditorControlMode {
  SELECT = 0,
  TRANSFORM_CONTROL = 2,
  ROTATE_CONTROL = 3,
  SCALE_CONTROL = 4,
  ADD_GAME_OBJECT = 5
}

export enum GameObjectType {
  ROOM = "room",
  CREATURE = "creature",
  CAMERA = "camera",
  DOOR = "door",
  ENCOUNTER = "encounter",
  ITEM = "item",
  PLACEABLE = "placeable",
  SOUND = "sound",
  STORE = "store",
  TRIGGER = "trigger",
  WAYPOINT = "waypoint",
}
