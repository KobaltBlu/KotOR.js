import { IPCDataType } from "../../../enums/server/ipc/IPCDataType";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";
import { IPCMessage } from "../../../server/ipc/IPCMessage";
import { IPCMessageParam } from "../../../server/ipc/IPCMessageParam";
import * as KotOR from "../KotOR";

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
      if(typeof event.data == 'string'){
        console.log(event.data);
        return;
      }else if(event.data?.constructor == Uint8Array){
        const message = IPCMessage.fromBuffer(event.data);
        if(message.type == IPCMessageType.CreateScript){
          const uuid = message.getParam(0).getString();
          const parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();
    
          /**
           * If the script name is missing, this is an anonymous script
           * and we need to use the UUID as the name
           */
          if(!name?.length){
            name = uuid;
          }
          /**
           * If the script is not already in the map, we need to create a new one
           */
          if(!this.scriptMap.has(name)){
            let nwscript = new KotOR.NWScript();
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
            instance.parentUUID = parentUUID;
            instance.nwscript = script;
            instance.name = name;
            KotOR.NWScript.NWScriptInstanceMap.set(uuid, instance);
            if(script.instances.find((inst) => inst.uuid == uuid) == undefined){
              script.instances = [...script.instances, instance];
            }
            KotOR.NWScript.NWScriptInstanceMap.set(uuid, instance);
          }
        }else if(message.type == IPCMessageType.DestroyScript){
          const uuid = message.getParam(0).getString();
          const parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();
    
          /**
           * If the script name is missing, this is an anonymous script
           * and we need to use the UUID as the name
           */
          if(!name?.length){
            name = uuid;
          }
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
        }else if(message.type == IPCMessageType.UpdateScriptState){
          const uuid = message.getParam(0).getString();
          const parentUUID = message.getParam(1).getString();
          let name = message.getParam(2).getString();
          console.log("Update Scripte State Received", uuid);
          const instance = KotOR.NWScript.NWScriptInstanceMap.get(uuid);
          if(instance){
            instance.seek = message.getParam(3).getInt32();
            instance.stack = KotOR.NWScript.NWScriptStack.FromDebuggerPacket(message.getParam(4).getVoid());
            this.setSelectedInstance(instance);
            console.log("Script state updated", uuid, instance.seek, instance);
            instance.dispatchEvent('update');
            this.dispatchEvent('instance-updated', instance);
          }
        }
      }
      this.dispatchEvent('message', event.data);
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

  _breakPointUpdateHandler = (address: number, added: false) => {
    console.log('breakPointUpdateHandler', address, added);
    if(!this.selectedInstance) return;

    const ipcMessage = new IPCMessage(added ? IPCMessageType.SetScriptBreakpoint : IPCMessageType.RemoveScriptBreakpoint);
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.STRING, this.selectedInstance.uuid));
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.INTEGER, address));
    this.sendMessage(ipcMessage.toBuffer());
  }

  sendMessage(data: any){
    this.#channel.postMessage(data);
  }

  dispose(){
    console.log("Closing channel");
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