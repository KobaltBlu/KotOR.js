import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageParam } from "@/server/ipc/IPCMessageParam";
import * as KotOR from "@/apps/debugger/KotOR";
import type { DebugTarget } from "@/apps/debugger/DebugTarget";
import type {
  GlobalsSnapshotEntry,
  LiveObjectSnapshot,
  ModuleAreaSnapshot,
  ObjectListEntry,
  OverviewObjectKind,
} from "@/inspect/runtimeSnapshots";
import type { AreaMapOverlaySnapshot } from "@/inspect/areaMapOverlay";
import type { DialogSnapshot } from "@/inspect/dialogSnapshot";

export interface ScriptOwnerFilter {
  objectId: number;
  tag: string;
  label: string;
  kind: OverviewObjectKind | string;
  /** Optional GFF script slot (e.g. ScriptHeartbeat) from Scene/Objects jump. */
  scriptKey?: string;
  /** Optional script resref from Scene/Objects jump. */
  resref?: string;
  /** Last ScriptResource miss for this filter (UI banner). */
  resourceError?: string;
}

type ScriptResourceSource = 'override' | 'key' | 'module' | 'runtime' | 'missing';

type PendingScriptOpen = {
  detail: Pick<LiveObjectSnapshot, 'objectId' | 'tag' | 'name' | 'kind'>;
  scriptKey: string;
  resref: string;
};

type PendingResourceWaiters = {
  resolve: (script: KotOR.NWScript | undefined) => void;
  reject: (err: Error) => void;
};

const PERSIST_KEY = 'kotor-debugger-ui';

type PersistedUiState = {
  activity?: string;
  scriptOwnerFilter?: ScriptOwnerFilter | null;
  scriptBreakPoints?: Record<string, number[]>;
};

export class DebuggerState {

  #channel: BroadcastChannel;
  #sessionUuid: string = '';

  scriptMap: Map<string, KotOR.NWScript> = new Map();
  /** resref → where last ScriptResource came from */
  scriptResourceSource: Map<string, ScriptResourceSource> = new Map();
  instanceMap: Map<string, KotOR.NWScriptInstance> = new Map();
  parentMap: Map<string, Set<string>> = new Map();
  /** Script-name → breakpoint addresses reapplied on every CreateScript. */
  scriptBreakPoints: Map<string, Set<number>> = new Map();
  selectedInstance: KotOR.NWScriptInstance;

  moduleSnapshot: ModuleAreaSnapshot | null = null;
  objectList: ObjectListEntry[] = [];
  selectedObjectDetail: LiveObjectSnapshot | null = null;
  globalsSnapshot: GlobalsSnapshotEntry[] = [];
  areaMapOverlay: AreaMapOverlaySnapshot | null = null;
  dialogSnapshot: DialogSnapshot | null = null;
  /** Filter Scripts browser to a specific owner object (Objects/Scene jump). */
  scriptOwnerFilter: ScriptOwnerFilter | null = null;

  #pendingResource = new Map<string, PendingResourceWaiters[]>();
  #pendingOpens = new Map<string, PendingScriptOpen>();

  constructor(uuid: string){
    this.init(uuid);
  }

  init(uuid: string){
    this.#sessionUuid = uuid;
    this.restorePersistedState();
    this.#channel = new BroadcastChannel(`debugger-${uuid}`);
    // Do not post 'close' on unload — pop-out/dock tear down the client without ending the session.
    // Explicit Close in the UI posts 'close' via a short-lived channel.
    window.onbeforeunload = () => {
      try{ this.#channel.close(); }catch{ /* ignore */ }
    }
    this.#channel.onmessage = (event) => {
      if(typeof event.data == 'string'){
        return;
      }else if(event.data?.constructor == Uint8Array){
        const message = IPCMessage.fromBuffer(event.data);
        if(message.type == IPCMessageType.CreateScript){
          const uuid = message.getParam(0).getString();
          const parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();
    
          if(!name?.length){
            name = uuid;
          }
          if(KotOR.NWScript.NWScriptInstanceMap.has(uuid)){
            const existing = KotOR.NWScript.NWScriptInstanceMap.get(uuid)!;
            this.applyOwnerFromCreateMessage(existing, message);
            this.dispatchEvent('script-owner-updated', existing);
            this.dispatchEvent('instance-updated', existing);
            return;
          }
          const cacheKey = this.normalizeResref(name);
          if(!this.getScriptFromCache(name)){
            let nwscript = new KotOR.NWScript();
            nwscript.name = name;
            const code = message.getParam(4).getVoid();
            const progSize = message.getParam(3).getInt32();
            nwscript.init(code, progSize);
            this.scriptMap.set(cacheKey, nwscript);
            if(cacheKey !== name){
              this.scriptMap.set(name, nwscript);
            }
            this.scriptResourceSource.set(cacheKey, 'runtime');
          }
    
          const script = this.getScriptFromCache(name);
          if(script){
            const instance = new KotOR.NWScriptInstance(script.instructions);
            instance.uuid = uuid;
            instance.parentUUID = parentUUID;
            instance.nwscript = script;
            instance.name = name;
            this.applyOwnerFromCreateMessage(instance, message);
            KotOR.NWScript.NWScriptInstanceMap.set(uuid, instance);
            this.instanceMap.set(uuid, instance);
            if(!this.parentMap.has(parentUUID)){
              this.parentMap.set(parentUUID, new Set());
            }
            this.parentMap.get(parentUUID)!.add(uuid);
            if(script.instances.find((inst) => inst.uuid == uuid) == undefined){
              script.instances = [...script.instances, instance];
            }
            this.applyScriptLevelBreakpoints(instance);
            this.dispatchEvent('script-created', instance);
          }
        }else if(message.type == IPCMessageType.DestroyScript){
          const uuid = message.getParam(0).getString();
          const parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();
    
          if(!name?.length){
            name = uuid;
          }
          const script = this.getScriptFromCache(name);
          if(script){
            script.instances = [...script.instances.filter((inst) => inst.uuid != uuid)];
          }
    
          this.instanceMap.delete(uuid);
          this.parentMap.get(parentUUID)?.delete(uuid);
          if(KotOR.NWScript.NWScriptInstanceMap.has(uuid)){
            KotOR.NWScript.NWScriptInstanceMap.delete(uuid);
          }
          this.dispatchEvent('script-destroyed', uuid);
        }else if(message.type == IPCMessageType.UpdateScriptState){
          const uuid = message.getParam(0).getString();
          const instance = KotOR.NWScript.NWScriptInstanceMap.get(uuid);
          if(instance){
            instance.seek = message.getParam(3).getInt32();
            instance.stack = KotOR.NWScript.NWScriptStack.FromDebuggerPacket(message.getParam(4).getVoid());
            const callStackParam = message.getParam(5);
            if(callStackParam){
              instance.debugCallStack = KotOR.NWScriptInstance.unpackCallStackFromDebugger(callStackParam.getVoid());
            }else{
              instance.debugCallStack = [];
            }
            // Focus the paused script only when selection actually changes.
            // Always emit instance-updated so the open view can refresh seek/stack.
            if(this.selectedInstance?.uuid !== instance.uuid){
              this.setSelectedInstance(instance);
            }
            instance.dispatchEvent('update');
            this.dispatchEvent('instance-updated', instance);
          }
        }else if(message.type == IPCMessageType.UpdateScriptOwner){
          const uuid = message.getParam(0)?.getString();
          if(uuid){
            const instance = KotOR.NWScript.NWScriptInstanceMap.get(uuid) || this.instanceMap.get(uuid);
            if(instance){
              this.applyOwnerFields(
                instance,
                message.getParam(1)?.getInt32?.() ?? -1,
                message.getParam(2)?.getString?.() || '',
                message.getParam(3)?.getString?.() || '',
                message.getParam(4)?.getString?.() || '',
                message.getParam(5)?.getString?.() || '',
              );
              this.dispatchEvent('script-owner-updated', instance);
              this.dispatchEvent('instance-updated', instance);
            }
          }
        }else if(message.type == IPCMessageType.ScriptResource){
          this.handleScriptResourceMessage(message);
        }else if(message.type == IPCMessageType.ModuleSnapshot){
          this.moduleSnapshot = this.parseJsonParam(message.getParam(0), null);
          this.dispatchEvent('module-snapshot', this.moduleSnapshot);
        }else if(message.type == IPCMessageType.ObjectList){
          this.objectList = this.parseJsonParam(message.getParam(0), []) || [];
          this.dispatchEvent('object-list', this.objectList);
        }else if(message.type == IPCMessageType.ObjectDetail){
          this.selectedObjectDetail = this.parseJsonParam(message.getParam(0), null);
          this.dispatchEvent('object-detail', this.selectedObjectDetail);
        }else if(message.type == IPCMessageType.GlobalsSnapshot){
          this.globalsSnapshot = this.parseJsonParam(message.getParam(0), []) || [];
          this.dispatchEvent('globals-snapshot', this.globalsSnapshot);
        }else if(message.type == IPCMessageType.AreaMapOverlay){
          this.areaMapOverlay = this.parseJsonParam(message.getParam(0), null);
          this.dispatchEvent('area-map-overlay', this.areaMapOverlay);
        }else if(message.type == IPCMessageType.DialogSnapshot){
          this.dialogSnapshot = this.parseJsonParam(message.getParam(0), null);
          this.dispatchEvent('dialog-snapshot', this.dialogSnapshot);
        }
      }
      this.dispatchEvent('message', event.data);
    }

    // Ask the game for any scripts already running when we connected.
    const listMsg = new IPCMessage(IPCMessageType.ListLiveScripts);
    this.sendMessage(listMsg.toBuffer());
    this.requestModuleSnapshot();
  }

  normalizeResref(resref: string): string {
    return (resref || '').trim().toLowerCase();
  }

  getScriptFromCache(resref: string): KotOR.NWScript | undefined {
    if(!resref){ return undefined; }
    const key = this.normalizeResref(resref);
    return this.scriptMap.get(key)
      || this.scriptMap.get(resref)
      || [...this.scriptMap.entries()].find(([k]) => k.toLowerCase() === key)?.[1];
  }

  handleScriptResourceMessage(message: IPCMessage){
    const resref = message.getParam(0)?.getString?.() || '';
    const ok = (message.getParam(1)?.getInt32?.() ?? 0) === 1;
    const source = (message.getParam(2)?.getString?.() || 'missing') as ScriptResourceSource;
    const code = message.getParam(3)?.getVoid?.() || new Uint8Array(0);
    const key = this.normalizeResref(resref);

    let script: KotOR.NWScript | undefined;
    if(ok && code?.length){
      script = new KotOR.NWScript(code);
      script.name = resref || key;
      this.scriptMap.set(key, script);
      if(resref && resref !== key){
        this.scriptMap.set(resref, script);
      }
      this.scriptResourceSource.set(key, source === 'missing' ? 'key' : source);
      this.dispatchEvent('script-resource', { resref: key, ok: true, source, script });
    }else{
      this.scriptResourceSource.set(key, 'missing');
      this.dispatchEvent('script-resource', { resref: key, ok: false, source: 'missing', script: undefined });
    }

    const waiters = this.#pendingResource.get(key) || [];
    this.#pendingResource.delete(key);
    for(const w of waiters){
      w.resolve(script);
    }

    const pendingOpen = this.#pendingOpens.get(key);
    if(pendingOpen){
      this.#pendingOpens.delete(key);
      if(script){
        if(this.scriptOwnerFilter?.resref
          && this.normalizeResref(this.scriptOwnerFilter.resref) === key){
          const next = { ...this.scriptOwnerFilter };
          delete next.resourceError;
          this.setScriptOwnerFilter(next);
        }
        const instance = this.resolveInstanceForObjectScript(
          pendingOpen.detail,
          pendingOpen.scriptKey,
          pendingOpen.resref,
        );
        if(instance){
          this.setSelectedInstance(instance);
        }
      }else if(this.scriptOwnerFilter?.resref
        && this.normalizeResref(this.scriptOwnerFilter.resref) === key){
        this.setScriptOwnerFilter({
          ...this.scriptOwnerFilter,
          resourceError: `Script not found in Override/Module/KEY: ${pendingOpen.resref}`,
        });
      }
    }
  }

  /**
   * Request NCS bytes from the game. Resolves with cached NWScript when available
   * (including after ScriptResource reply). Resolves undefined on miss.
   */
  requestScriptResource(resref: string): Promise<KotOR.NWScript | undefined> {
    const key = this.normalizeResref(resref);
    if(!key){
      return Promise.resolve(undefined);
    }
    const existing = this.getScriptFromCache(key);
    if(existing){
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const list = this.#pendingResource.get(key) || [];
      list.push({ resolve, reject });
      this.#pendingResource.set(key, list);
      if(list.length === 1){
        const msg = new IPCMessage(IPCMessageType.RequestScriptResource);
        msg.addParam(new IPCMessageParam(IPCDataType.STRING, key));
        this.sendMessage(msg.toBuffer());
      }
    });
  }

  applyOwnerFromCreateMessage(instance: KotOR.NWScriptInstance, message: IPCMessage){
    // CreateScript layout: 0 uuid, 1 parent, 2 name, 3 progSize, 4 code, 5..9 owner fields
    const idParam = message.getParam(5);
    if(!idParam){ return; }
    this.applyOwnerFields(
      instance,
      idParam.getInt32?.() ?? -1,
      message.getParam(6)?.getString?.() || '',
      message.getParam(7)?.getString?.() || '',
      message.getParam(8)?.getString?.() || '',
      message.getParam(9)?.getString?.() || '',
    );
  }

  applyOwnerFields(
    instance: KotOR.NWScriptInstance,
    objectId: number,
    tag: string,
    label: string,
    kind: string,
    scriptKey: string,
  ){
    instance.ownerObjectId = (typeof objectId === 'number' && !Number.isNaN(objectId)) ? objectId : -1;
    instance.ownerTag = tag || '';
    instance.ownerLabel = label || '';
    instance.ownerKind = kind || '';
    if(scriptKey){
      instance.scriptKey = scriptKey;
    }
  }

  parseJsonParam<T>(param: IPCMessageParam | undefined, fallback: T): T {
    if(!param){ return fallback; }
    try{
      const raw = param.getString();
      if(!raw){ return fallback; }
      return JSON.parse(raw) as T;
    }catch{
      return fallback;
    }
  }

  requestModuleSnapshot(){
    this.sendMessage(new IPCMessage(IPCMessageType.RequestModuleSnapshot).toBuffer());
  }

  requestObjectList(kind?: string){
    const msg = new IPCMessage(IPCMessageType.RequestObjectList);
    if(kind){
      msg.addParam(new IPCMessageParam(IPCDataType.STRING, kind));
    }
    this.sendMessage(msg.toBuffer());
  }

  requestObjectDetail(objectId: number){
    const msg = new IPCMessage(IPCMessageType.RequestObjectDetail);
    msg.addParam(new IPCMessageParam(IPCDataType.INTEGER, objectId | 0));
    this.sendMessage(msg.toBuffer());
  }

  requestGlobalsSnapshot(){
    this.sendMessage(new IPCMessage(IPCMessageType.RequestGlobalsSnapshot).toBuffer());
  }

  requestAreaMapOverlay(){
    this.sendMessage(new IPCMessage(IPCMessageType.RequestAreaMapOverlay).toBuffer());
  }

  requestDialogSnapshot(){
    this.sendMessage(new IPCMessage(IPCMessageType.RequestDialogSnapshot).toBuffer());
  }

  setSceneWorldMarkers(payload: {
    enabled: boolean;
    selectedId?: string | null;
    entries?: import("@/inspect/runtimeSnapshots").SceneMapPin[];
  }){
    const msg = new IPCMessage(IPCMessageType.SetSceneWorldMarkers);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, JSON.stringify(payload)));
    this.sendMessage(msg.toBuffer());
  }

  setScriptOwnerFilter(filter: ScriptOwnerFilter | null){
    this.scriptOwnerFilter = filter;
    this.dispatchEvent('script-owner-filter', this.scriptOwnerFilter);
    this.persistUiState();
  }

  /**
   * Central navigation: panels call this instead of coupling to each other.
   */
  navigate(target: DebugTarget){
    this.dispatchEvent('navigate', target);

    if(typeof target.objectId === 'number' && target.objectId >= 0){
      this.requestObjectDetail(target.objectId);
    }

    const wantsScripts = target.activity === 'scripts'
      || !!target.resref
      || !!target.scriptKey
      || !!target.instanceUuid;

    if(wantsScripts){
      const detail = this.selectedObjectDetail
        && (typeof target.objectId !== 'number' || this.selectedObjectDetail.objectId === target.objectId)
        ? this.selectedObjectDetail
        : {
            objectId: typeof target.objectId === 'number' ? target.objectId : -1,
            tag: target.ownerTag || '',
            name: target.ownerLabel || target.ownerTag || 'object',
            kind: (target.ownerKind || 'other') as OverviewObjectKind,
          };

      if(target.resref || target.scriptKey){
        void this.openObjectScript(detail, target.scriptKey || '', target.resref || '');
      }else if(typeof target.objectId === 'number'){
        this.setScriptOwnerFilter({
          objectId: detail.objectId,
          tag: detail.tag || '',
          label: detail.name || detail.tag || 'object',
          kind: detail.kind,
        });
      }
    }

    if(target.instanceUuid){
      const inst = this.instanceMap.get(target.instanceUuid)
        || KotOR.NWScript.NWScriptInstanceMap.get(target.instanceUuid);
      if(inst){
        this.setSelectedInstance(inst);
      }
    }

    if(typeof target.instructionOffset === 'number' && this.selectedInstance){
      this.selectedInstance.seek = target.instructionOffset;
      this.selectedInstance.dispatchEvent('seek', target.instructionOffset);
      this.dispatchEvent('instance-updated', this.selectedInstance);
    }

    this.persistUiState({ activity: target.activity });
  }

  /**
   * Scene/Objects: filter Scripts browser to an owner and try to open a specific
   * slot/resref for decompile. Fetches NCS via RequestScriptResource when missing.
   */
  async openObjectScript(
    detail: Pick<LiveObjectSnapshot, 'objectId' | 'tag' | 'name' | 'kind'>,
    slot: string,
    resref: string,
  ){
    const scriptKey = (slot || '').trim();
    const name = (resref || '').trim();
    if(!name || name.toLowerCase() === 'none'){
      this.setScriptOwnerFilter({
        objectId: detail.objectId,
        tag: detail.tag || '',
        label: detail.name || detail.tag || 'object',
        kind: detail.kind,
      });
      return;
    }

    const key = this.normalizeResref(name);
    this.setScriptOwnerFilter({
      objectId: detail.objectId,
      tag: detail.tag || '',
      label: detail.name || detail.tag || 'object',
      kind: detail.kind,
      scriptKey: scriptKey || undefined,
      resref: name,
    });

    let instance = this.resolveInstanceForObjectScript(detail, scriptKey, name);
    if(instance){
      this.setSelectedInstance(instance);
      return;
    }

    this.#pendingOpens.set(key, { detail, scriptKey, resref: name });
    const script = await this.requestScriptResource(name);
    // ScriptResource handler completes pending open; if we already resolved here:
    if(script && this.#pendingOpens.has(key)){
      this.#pendingOpens.delete(key);
      instance = this.resolveInstanceForObjectScript(detail, scriptKey, name);
      if(instance){
        this.setSelectedInstance(instance);
      }
    }else if(!script && this.#pendingOpens.has(key)){
      this.#pendingOpens.delete(key);
      this.setScriptOwnerFilter({
        objectId: detail.objectId,
        tag: detail.tag || '',
        label: detail.name || detail.tag || 'object',
        kind: detail.kind,
        scriptKey: scriptKey || undefined,
        resref: name,
        resourceError: `Script not found in Override/Module/KEY: ${name}`,
      });
    }
  }

  resolveInstanceForObjectScript(
    detail: Pick<LiveObjectSnapshot, 'objectId' | 'tag' | 'name' | 'kind'>,
    scriptKey: string,
    resref: string,
  ): KotOR.NWScriptInstance | undefined {
    const all = [...this.instanceMap.values()];
    const nameLower = this.normalizeResref(resref);
    const keyLower = scriptKey.toLowerCase();
    const ownerObjectId = detail.objectId;

    const ownerMatches = (inst: KotOR.NWScriptInstance) =>
      ownerObjectId >= 0 && inst.ownerObjectId === ownerObjectId;

    const byOwnerAndSlot = scriptKey
      ? all.find((inst) =>
          ownerMatches(inst)
          && (inst.scriptKey || '').toLowerCase() === keyLower
        )
      : undefined;
    if(byOwnerAndSlot){ return byOwnerAndSlot; }

    const byOwnerAndName = all.find((inst) =>
      ownerMatches(inst)
      && (inst.name || '').toLowerCase() === nameLower
    );
    if(byOwnerAndName){ return byOwnerAndName; }

    const byName = all.find((inst) => (inst.name || '').toLowerCase() === nameLower);
    if(byName){ return byName; }

    const script = this.getScriptFromCache(resref);
    if(!script){ return undefined; }

    if(script.instances?.length){
      const owned = script.instances.find((inst) => ownerMatches(inst));
      if(owned){ return owned; }
      return script.instances[0];
    }

    // View-only: bytecode known but no live run. Not added to instanceMap.
    const view = new KotOR.NWScriptInstance(script.instructions);
    view.nwscript = script;
    view.name = script.name || resref;
    view.scriptKey = scriptKey || '';
    view.ownerObjectId = ownerObjectId;
    view.ownerTag = detail.tag || '';
    view.ownerLabel = detail.name || detail.tag || '';
    view.ownerKind = String(detail.kind || '');
    view.seek = -1;
    return view;
  }

  applyScriptLevelBreakpoints(instance: KotOR.NWScriptInstance){
    const name = instance.name;
    const addresses = this.scriptBreakPoints.get(name)
      || this.scriptBreakPoints.get(this.normalizeResref(name));
    if(!addresses) return;
    for(const address of addresses){
      if(!instance.breakPoints.has(address)){
        instance.breakPoints.set(address, true);
      }
      const ipcMessage = new IPCMessage(IPCMessageType.SetScriptBreakpoint);
      ipcMessage.addParam(new IPCMessageParam(IPCDataType.STRING, instance.uuid));
      ipcMessage.addParam(new IPCMessageParam(IPCDataType.INTEGER, address));
      this.sendMessage(ipcMessage.toBuffer());
    }
    instance.breakPointVersion++;
  }

  rememberScriptBreakpoint(scriptName: string, address: number, added: boolean){
    const key = this.normalizeResref(scriptName) || scriptName;
    if(!this.scriptBreakPoints.has(key)){
      this.scriptBreakPoints.set(key, new Set());
    }
    const set = this.scriptBreakPoints.get(key)!;
    if(added){
      set.add(address);
    }else{
      set.delete(address);
    }
    this.persistUiState();
  }

  setSelectedInstance(instance: KotOR.NWScriptInstance){
    if(this.selectedInstance){
      this.selectedInstance.removeEventListener('breakpoint', this._breakPointUpdateHandler);
    }
    this.selectedInstance = instance;
    this.selectedInstance.addEventListener('breakpoint', this._breakPointUpdateHandler);
    this.dispatchEvent('selected-instance', instance);
  }

  _breakPointUpdateHandler = (address: number, added: boolean) => {
    if(!this.selectedInstance) return;
    this.rememberScriptBreakpoint(this.selectedInstance.name, address, added);

    const ipcMessage = new IPCMessage(added ? IPCMessageType.SetScriptBreakpoint : IPCMessageType.RemoveScriptBreakpoint);
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.STRING, this.selectedInstance.uuid));
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.INTEGER, address));
    this.sendMessage(ipcMessage.toBuffer());
  }

  clearInstanceBreakpoints(instance: KotOR.NWScriptInstance){
    const addresses = [...instance.breakPoints.keys()];
    for(const address of addresses){
      instance.removeBreakpoint(address);
    }
    this.scriptBreakPoints.set(this.normalizeResref(instance.name) || instance.name, new Set());
    this.persistUiState();
  }

  sendMessage(data: any){
    this.#channel.postMessage(data);
  }

  persistUiState(extra?: { activity?: string }){
    try{
      const prev = this.readPersistedState();
      const breakpoints: Record<string, number[]> = {};
      for(const [name, set] of this.scriptBreakPoints){
        if(set.size){
          breakpoints[name] = [...set];
        }
      }
      const next: PersistedUiState = {
        activity: extra?.activity ?? prev.activity,
        scriptOwnerFilter: this.scriptOwnerFilter
          ? {
              objectId: this.scriptOwnerFilter.objectId,
              tag: this.scriptOwnerFilter.tag,
              label: this.scriptOwnerFilter.label,
              kind: this.scriptOwnerFilter.kind,
              scriptKey: this.scriptOwnerFilter.scriptKey,
              resref: this.scriptOwnerFilter.resref,
            }
          : null,
        scriptBreakPoints: breakpoints,
      };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(next));
    }catch{ /* ignore quota / private mode */ }
  }

  readPersistedState(): PersistedUiState {
    try{
      const raw = localStorage.getItem(PERSIST_KEY);
      if(!raw){ return {}; }
      return JSON.parse(raw) as PersistedUiState;
    }catch{
      return {};
    }
  }

  restorePersistedState(){
    const saved = this.readPersistedState();
    if(saved.scriptBreakPoints){
      for(const [name, addresses] of Object.entries(saved.scriptBreakPoints)){
        if(!Array.isArray(addresses)) continue;
        this.scriptBreakPoints.set(name, new Set(addresses.filter((n) => typeof n === 'number')));
      }
    }
    if(saved.scriptOwnerFilter){
      this.scriptOwnerFilter = saved.scriptOwnerFilter;
    }
  }

  getPersistedActivity(): string | undefined {
    return this.readPersistedState().activity;
  }

  dispose(){
    this.#channel.close();
  }
  
  #eventListeners: Map<string, Function[]> = new Map();

  addEventListener(type: string, listener: Function){
    let listeners = this.#eventListeners.get(type);
    if(!listeners){
      listeners = [];
      this.#eventListeners.set(type, listeners);
    }
    if(listeners.indexOf(listener) == -1){
      listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: Function){
    const listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }

  dispatchEvent(type: string, ...args: any[]){
    const listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.forEach(listener => listener(...args));
    }
  }
}
