import { GameState } from "@/GameState";
import { AudioEngine } from "@/audio";
import { DebuggerState } from "@/enums/server/DebuggerState";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import { EngineDebugController } from "@/engine/EngineDebugController";
import { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessageTypeDebug } from "@/enums/server/ipc/IPCMessageTypeDebug";
import { IPCMessageParam } from "@/server/ipc/IPCMessageParam";
import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { CacheScope } from "@/enums/resource/CacheScope";
import {
  snapshotModuleAreaInfo,
  snapshotObjectList,
  snapshotLiveObject,
  snapshotGlobals,
  type SceneMapPin,
} from "@/inspect/runtimeSnapshots";
import { snapshotDialog } from "@/inspect/dialogSnapshot";
import { snapshotAreaMapOverlay } from "@/inspect/areaMapOverlay";
import { clearWorldMarkers, syncWorldMarkers } from "@/inspect/worldMarkers";
import { GameStateEvents } from "@/engine/GameStateEvents";

/**
 * Script debugger IPC bridge: snapshots, breakpoints, resume-on-tick, live script dump.
 * GameState.Init calls {@link GameDebuggerBridge.attach}.
 */
export class GameDebuggerBridge {
  /** Push CreateScript IPC for every live NWScriptInstance so a late-opened debugger is populated. */
  static dumpLiveScriptsToDebugger(){
    if(!GameState.debugMode) return;
    for(const instance of GameState.NWScript.NWScriptInstanceMap.values()){
      instance.sendToDebugger(IPCMessageType.CreateScript);
    }
  }

  /** Push a JSON-safe Module Inspector snapshot to the debugger window. */
  static sendInspectorSnapshot(type: IPCMessageType, payload: unknown){
    if(!GameState.debugMode) return;
    const msg = new IPCMessage(type);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, JSON.stringify(payload ?? null)));
    GameState.Debugger.send(msg);
  }

  /**
   * Reply to RequestScriptResource with NCS bytes from ResourceLoader / runtime cache.
   * Does not call NWScript.Load (avoids inventing live instances).
   */
  static sendScriptResource(
    resref: string,
    ok: boolean,
    source: 'override' | 'key' | 'module' | 'runtime' | 'missing',
    bytecode?: Uint8Array | null,
  ){
    if(!GameState.debugMode) return;
    const msg = new IPCMessage(IPCMessageType.ScriptResource);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, resref || ''));
    msg.addParam(new IPCMessageParam(IPCDataType.INTEGER, ok ? 1 : 0));
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, source));
    msg.addParam(new IPCMessageParam(IPCDataType.VOID, ok && bytecode ? bytecode : new Uint8Array(0)));
    GameState.Debugger.send(msg);
  }

  /** Resolve NCS buffer + source label without creating a live script instance. */
  static async resolveScriptResourceBytes(resref: string): Promise<{
    buffer: Uint8Array;
    source: 'override' | 'key' | 'module' | 'runtime';
  } | null> {
    const key = (resref || '').toLowerCase();
    if(!key){ return null; }
    const resId = ResourceTypes.ncs;

    const runtime =
      GameState.NWScript?.scripts?.get(key)
      || GameState.NWScript?.scripts?.get(resref);
    if(runtime?.code?.length){
      return { buffer: runtime.code, source: 'runtime' };
    }

    const overrideMap = ResourceLoader.CacheScopes[CacheScope.OVERRIDE]?.get(resId);
    if(overrideMap?.has(key)){
      return { buffer: overrideMap.get(key)!, source: 'override' };
    }
    const moduleMap = ResourceLoader.CacheScopes[CacheScope.MODULE]?.get(resId);
    if(moduleMap?.has(key)){
      return { buffer: moduleMap.get(key)!, source: 'module' };
    }
    const globalMap = ResourceLoader.CacheScopes[CacheScope.GLOBAL]?.get(resId);
    if(globalMap?.has(key)){
      return { buffer: globalMap.get(key)!, source: 'key' };
    }

    const cached = ResourceLoader.loadCachedResource(resId, key);
    if(cached?.length){
      return { buffer: cached, source: 'key' };
    }

    try{
      const fromOverride = await ResourceLoader.searchOverride(resId, key);
      if(fromOverride?.length){
        return { buffer: fromOverride, source: 'override' };
      }
    }catch{ /* ignore */ }

    try{
      const fromModule = await ResourceLoader.searchModuleArchives(resId, key);
      if(fromModule?.length){
        return { buffer: fromModule, source: 'module' };
      }
    }catch{ /* ignore */ }

    try{
      const fromKey = await ResourceLoader.searchKeyTable(resId, key);
      if(fromKey?.length){
        return { buffer: fromKey, source: 'key' };
      }
    }catch{ /* ignore */ }

    return null;
  }

  /** Finish or clear a mid-halt script when the debugger window closes. */
  static finishPausedScriptOnDebuggerClose(){
    const script = GameState.Debugger.currentScript;
    const instruction = GameState.Debugger.currentInstruction;
    GameState.Debugger.pendingResume = null;
    if(script && instruction && !script._disposed){
      GameState.Debugger.state = DebuggerState.Idle;
      GameState.Debugger.currentInstruction = undefined as any;
      script.seekTo(instruction.address);
      try{
        script.runScript(true);
      }catch(e){
        console.error('Debugger close: failed to finish paused script', e);
      }
    }
    GameState.Debugger.clearDebugHalt();
    if(script){
      script.suspended = false;
    }
  }

  /** Apply Continue / Step queued from BroadcastChannel on the next Update tick. */
  static processPendingDebuggerResume(){
    const pending = GameState.Debugger.pendingResume;
    if(!pending || !GameState.Debugger.currentScript) return;
    GameState.Debugger.pendingResume = null;

    const script = GameState.Debugger.currentScript;
    GameState.Debugger.currentInstruction = undefined as any;

    switch(pending.action){
      case 'continue':
        GameState.Debugger.state = DebuggerState.Idle;
        break;
      case 'stepOver':
        GameState.Debugger.state = DebuggerState.InstructionStepOver;
        break;
      case 'stepInto':
        GameState.Debugger.state = DebuggerState.InstructionStepInto;
        break;
      case 'stepOut':
        GameState.Debugger.state = DebuggerState.InstructionStepOut;
        break;
    }

    script.seekTo(pending.seek);
    script.runScript(true);
  }

  /** Soft debugger freeze branch of the main update loop. Returns true if the frame was handled. */
  static tryUpdateWhileHalted(delta: number): boolean {
    if(GameState.debugMode && GameState.Debugger.pendingResume){
      GameDebuggerBridge.processPendingDebuggerResume();
    }

    if(!(GameState.debugMode && GameState.Debugger.state !== DebuggerState.Idle)){
      return false;
    }

    GameState.controls.Update(delta);
    GameState.MenuManager.Update(delta);
    AudioEngine.GetAudioEngine().update(
      delta,
      GameState.currentCamera.position,
      GameState.currentCamera.rotation,
      GameState.forwardVector
    );
    GameState.Render(delta);
    GameState.stats.end();
    GameStateEvents.processEventListener('afterRender', [delta]);
    return true;
  }

  /** Wire Debugger open/reconnect/close/message handlers (called from GameState.Init). */
  static attach(){
    GameState.Debugger.addEventListener('open', () => {
      GameState.debugMode = true;
      GameDebuggerBridge.dumpLiveScriptsToDebugger();
      GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
    });
    GameState.Debugger.addEventListener('client-reconnected', () => {
      if(!GameState.debugMode){ return; }
      GameDebuggerBridge.dumpLiveScriptsToDebugger();
      GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
      void (async () => {
        const overlay = await snapshotAreaMapOverlay();
        GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.AreaMapOverlay, overlay);
      })();
    });
    GameState.Debugger.addEventListener('close', () => {
      GameDebuggerBridge.finishPausedScriptOnDebuggerClose();
      GameState.debugMode = false;
      clearWorldMarkers();
    });
    GameState.Debugger.addEventListener('message', (msg: IPCMessage) => {
      if(msg.type == IPCMessageType.SetScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          instance.setBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.RemoveScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          instance.removeBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.ContinueScript){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('continue', seek);
        }
      }else if(msg.type == IPCMessageType.StepOverInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepOver', seek);
        }
      }else if(msg.type == IPCMessageType.StepIntoInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepInto', seek);
        }
      }else if(msg.type == IPCMessageType.StepOutInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepOut', seek);
        }
      }else if(msg.type == IPCMessageType.ListLiveScripts){
        GameDebuggerBridge.dumpLiveScriptsToDebugger();
      }else if(msg.type == IPCMessageType.RequestModuleSnapshot){
        GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      }else if(msg.type == IPCMessageType.RequestObjectList){
        const kindParam = msg.getParam(0);
        const kind = kindParam ? kindParam.getString() : '';
        GameDebuggerBridge.sendInspectorSnapshot(
          IPCMessageType.ObjectList,
          snapshotObjectList(kind ? { kind } : undefined)
        );
      }else if(msg.type == IPCMessageType.RequestObjectDetail){
        const objectId = msg.getParam(0)?.getInt32?.() ?? -1;
        const obj = GameState.ModuleObjectManager.GetObjectById(objectId);
        const detail = obj ? snapshotLiveObject(obj) : null;
        GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.ObjectDetail, detail);
      }else if(msg.type == IPCMessageType.RequestGlobalsSnapshot){
        GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.GlobalsSnapshot, snapshotGlobals());
      }else if(msg.type == IPCMessageType.SetSceneWorldMarkers){
        try{
          const raw = msg.getParam(0)?.getString?.() || '';
          const payload = raw ? JSON.parse(raw) as {
            enabled?: boolean;
            selectedId?: string | null;
            entries?: SceneMapPin[];
          } : {};
          syncWorldMarkers(
            Array.isArray(payload.entries) ? payload.entries : [],
            !!payload.enabled,
            payload.selectedId ?? null
          );
        }catch(e){
          console.error('SetSceneWorldMarkers failed', e);
          clearWorldMarkers();
        }
      }else if(msg.type == IPCMessageType.RequestAreaMapOverlay){
        void (async () => {
          const overlay = await snapshotAreaMapOverlay();
          GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.AreaMapOverlay, overlay);
        })();
      }else if(msg.type == IPCMessageType.RequestScriptResource){
        const resref = (msg.getParam(0)?.getString?.() || '').trim();
        void (async () => {
          try{
            const found = await GameDebuggerBridge.resolveScriptResourceBytes(resref);
            if(found){
              GameDebuggerBridge.sendScriptResource(resref.toLowerCase(), true, found.source, found.buffer);
            }else{
              GameDebuggerBridge.sendScriptResource(resref.toLowerCase() || resref, false, 'missing', null);
            }
          }catch(e){
            console.error('RequestScriptResource failed', e);
            GameDebuggerBridge.sendScriptResource(resref.toLowerCase() || resref, false, 'missing', null);
          }
        })();
      }else if(msg.type == IPCMessageType.RequestDialogSnapshot){
        GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
      }else if(msg.type == IPCMessageType.Debug && msg.subType == IPCMessageTypeDebug.ToggleDebugState){
        const type = msg.getParam(0).getString();
        EngineDebugController.ToggleDebugState(type as EngineDebugType);
      }
    });
  }
}
