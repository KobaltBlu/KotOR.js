import * as KotOR from "@/apps/debugger/KotOR";
import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageParam } from "@/server/ipc/IPCMessageParam";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Debug);

export class DebuggerState {

  #channel: BroadcastChannel;

  scriptMap: Map<string, KotOR.NWScript> = new Map();
  instanceMap: Map<string, KotOR.NWScriptInstance> = new Map();
  parentMap: Map<string, Set<string>> = new Map();
  selectedInstance: KotOR.NWScriptInstance;

  constructor(uuid: string){
    this.init(uuid);
  }

  init(uuid: string){
    this.#channel = new BroadcastChannel(`debugger-${uuid}`);
    window.onbeforeunload = () => {
      this.#channel.postMessage('close');
      this.#channel.close();
    }
    this.#channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        log.trace("channel message (string)", event.data);
        return;
      }
      if (event.data instanceof Uint8Array) {
        const message = IPCMessage.fromBuffer(event.data);
        if(message.type == IPCMessageType.CreateScript){
          const uuid = message.getParam(0).getString();
          const _parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();

          /**
           * If the script name is missing, this is an anonymous script
           * and we need to use the UUID as the name
           */
          if (!name?.length) {
            name = uuid;
          }
          /**
           * If the script is not already in the map, we need to create a new one
           */
          if (!this.scriptMap.has(name)) {
            const nwscript = new KotOR.NWScript();
            nwscript.name = name;
            const code = message.getParam(4).getVoid();
            const progSize = message.getParam(3).getInt32();
            nwscript.init(code, progSize);
            this.scriptMap.set(name, nwscript);
          }

          const script = this.scriptMap.get(name);
          if(script){
            const instance = new KotOR.NWScriptInstance(script.instructions);
            instance.uuid = uuid;
            instance.parentUUID = _parentUUID;
            instance.nwscript = script;
            instance.name = name;
            KotOR.NWScript.NWScriptInstanceMap.set(uuid, instance);
            if(script.instances.find((inst) => inst.uuid == uuid) == undefined){
              script.instances = [...script.instances, instance];
            }
            KotOR.NWScript.NWScriptInstanceMap.set(uuid, instance);
          }
        } else if (message.type === IPCMessageType.DestroyScript) {
          const uuid = message.getParam(0).getString();
          const _parentUUID = message.getParam(1).getString();
          const _name = message.getParam(2).getString();

          /**
           * If the script name is missing, this is an anonymous script
           * and we need to use the UUID as the name
           */
          const name = _name?.length ? _name : uuid;
          const script = this.scriptMap.get(name);
          if(script){
            script.instances = [...script.instances.filter((inst) => inst.uuid != uuid)];
          }

          if(this.instanceMap.has(name)){
            this.instanceMap.delete(name);
          }
          if(KotOR.NWScript.NWScriptInstanceMap.has(uuid)){
            KotOR.NWScript.NWScriptInstanceMap.delete(uuid);
          }
        } else if (message.type === IPCMessageType.UpdateScriptState) {
          const uuid = message.getParam(0).getString();
          const _parentUUID = message.getParam(1).getString();
          const _name = message.getParam(2).getString();
          log.debug("UpdateScriptState received", uuid);
          const instance = KotOR.NWScript.NWScriptInstanceMap.get(uuid);
          if (instance) {
            instance.seek = message.getParam(3).getInt32();
            instance.stack = KotOR.NWScript.NWScriptStack.FromDebuggerPacket(message.getParam(4).getVoid());
            this.setSelectedInstance(instance);
            log.debug('Script state updated', uuid, instance.seek);
            instance.dispatchEvent('update');
            this.dispatchEvent('instance-updated', instance);
          }
        }
      }
      this.dispatchEvent("message", event.data as unknown as string | number | boolean | object | null);
    }
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
    log.debug('breakPointUpdateHandler', address, added);
    if(!this.selectedInstance) return;

    const ipcMessage = new IPCMessage(added ? IPCMessageType.SetScriptBreakpoint : IPCMessageType.RemoveScriptBreakpoint);
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.STRING, this.selectedInstance.uuid));
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.INTEGER, address));
    this.sendMessage(ipcMessage.toBuffer());
  }

  sendMessage(data: ArrayBuffer | ArrayBufferView){
    this.#channel.postMessage(data);
  }

  dispose(){
    log.debug("Closing channel");
    this.#channel.close();
  }

  #eventListeners: Map<string, ((...args: (string | number | boolean | object | null)[]) => void)[]> = new Map();

  addEventListener(type: string, listener: (...args: (string | number | boolean | object | null)[]) => void): void {
    let listeners = this.#eventListeners.get(type);
    if(!listeners){
      listeners = [];
      this.#eventListeners.set(type, listeners);
    }
    if(listeners.indexOf(listener) == -1){
      listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: (...args: (string | number | boolean | object | null)[]) => void): void {
    const listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }

  dispatchEvent(type: string, ...args: (string | number | boolean | object | null)[]): void {
    const listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.forEach(listener => listener(...args));
    }
  }
}
