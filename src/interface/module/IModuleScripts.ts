import type { NWScriptInstance } from "../../nwscript/NWScriptInstance"

/**
 * IModuleScripts interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IModuleScripts.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IModuleScripts {
  onAcquireItem: NWScriptInstance,
  onActivateItem: NWScriptInstance
  onClientEnter: NWScriptInstance
  onClientLeave: NWScriptInstance
  onHeartbeat: NWScriptInstance
  onModuleLoad: NWScriptInstance
  onModuleStart: NWScriptInstance
  onPlayerDeath: NWScriptInstance
  onPlayerDying: NWScriptInstance
  onPlayerLevelUp: NWScriptInstance
  onPlayerRest: NWScriptInstance
  onSpawnButtonDown: NWScriptInstance
  onUnAcquireItem: NWScriptInstance
  onUserDefined: NWScriptInstance
}