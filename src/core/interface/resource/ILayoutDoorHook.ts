import type { Quat, Vec3 } from "@core/types/vec";

/**
 * ILayoutDoorHook interface.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ILayoutDoorHook.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ILayoutDoorHook {
  room: string;
  name: string;
  position: Vec3;
  quaternion: Quat;
}