import type { NWScriptInstance } from "../../nwscript/NWScriptInstance"

export interface ModuleScripts {
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