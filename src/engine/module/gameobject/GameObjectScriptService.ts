import { ScriptHook } from '@core/enums';
import { NWScriptEventType } from '@core/enums/nwscript/NWScriptEventType';
import type { GameObject } from '@engine/module/GameObject';
import { NWScriptEvent } from '@engine/nwscript/events';
import type { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectScriptService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  getScriptInstance(scriptKey: ScriptHook): NWScriptInstance | undefined {
    const script = this.host.scripts[scriptKey];
    if(!script){ return undefined; }
    if(!script.scriptKey){
      script.bindOwner(this.host, scriptKey);
    }
    return script;
  }

  /**
   * Run OnUserDefined on the object slot instance.
   * Sync execution + resetForRun/init keep STORE_STATE / stack residue from polluting the next fire.
   */
  runUserDefinedScript(event: NWScriptEvent, script: NWScriptInstance | undefined): void {
    if(!(event instanceof NWScriptEvent) || !script){ return; }
    script.run(this.host, parseInt(event.getInt(0)));
  }

  /**
   * Run OnSpellCastAt / ScriptSpellAt with lastSpell* fields populated.
   */
  runSpellCastAtScript(event: NWScriptEvent, script: NWScriptInstance | undefined): void {
    if(!(event instanceof NWScriptEvent) || !script){ return; }
    script.lastSpellCaster = event.getObject(0);
    script.lastSpell = event.getInt(0);
    script.lastSpellHarmful = !!event.getInt(1);
    script.run(this.host);
  }

  scriptEventHandler(event: NWScriptEvent){
    if(event instanceof NWScriptEvent){
      switch(event.type){
        case NWScriptEventType.EventUserDefined:
          this.host.triggerUserDefinedEvent(event);
        break;
        case NWScriptEventType.EventSpellCastAt:
          this.host.triggerSpellCastAtEvent(event);
        break;
        default:
          console.error('scriptEventHandler', 'Unhandled Event', event, this.host);
        break;
      }
    }
  }

  /**
   * Heartbeat gate — only after onSpawn and module event processing is ready.
   */
  canProcessHeartbeat(): boolean {
    return this.host.spawned === true && this.runtime.isReadyToProcessEvents();
  }

  /**
   * Accumulate the 6s object heartbeat and fire when ready.
   */
  updateHeartbeat(delta = 0){
    this.host._aiHeartbeatElapsedMs += 1000 * delta;
    if(this.host._aiHeartbeatElapsedMs > 5999){
      if(this.runtime.getModule()){
        this.host.triggerHeartbeat();
      }
      this.host._aiHeartbeatElapsedMs = 0;
    }
  }
}
