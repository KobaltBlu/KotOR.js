import type { IGameStateGroups } from "../interface/engine/IGameStateGroups";

/**
 * EngineContext enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EngineContext.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EngineContext {
  static groups: IGameStateGroups = {} as IGameStateGroups;
}