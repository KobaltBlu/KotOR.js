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
  ModuleOnPlayerAcquireItem: NWScriptInstance,
  ModuleOnPlayerActivateItem: NWScriptInstance
  ModuleOnPlayerClientEnter: NWScriptInstance
  ModuleOnPlayerClientLeave: NWScriptInstance
  ModuleOnHeartbeat: NWScriptInstance
  ModuleOnLoad: NWScriptInstance
  ModuleOnStart: NWScriptInstance
  ModuleOnPlayerDeath: NWScriptInstance
  ModuleOnPlayerDying: NWScriptInstance
  ModuleOnPlayerLevelUp: NWScriptInstance
  ModuleOnPlayerRest: NWScriptInstance
  ModuleOnSpawnButtonDown: NWScriptInstance
  ModuleOnUnAcquireItem: NWScriptInstance
  ModuleOnUserDefined: NWScriptInstance
}