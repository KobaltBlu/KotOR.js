import React, { createContext, useContext, useEffect, useState } from "react";
import { useEffectOnce } from "../../forge/helpers/UseEffectOnce";
import * as KotOR from "../KotOR";
import { IPCMessage } from "../../../server/ipc/IPCMessage";
import { IPCMessageType } from "../../../enums/server/IPCMessageType";

export interface AppProviderValues {
  // someValue: [any, React.Dispatch<any>];
  channel: [BroadcastChannel, React.Dispatch<BroadcastChannel>];
  scriptMap: [Map<string, KotOR.NWScript>, React.Dispatch<Map<string, KotOR.NWScript>>];
  instanceMap: [Map<string, KotOR.NWScriptInstance>, React.Dispatch<Map<string, KotOR.NWScriptInstance>>];
  parentMap: [Map<string, Set<string>>, React.Dispatch<Map<string, Set<string>>>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: {children: any; channel: BroadcastChannel}) => {
  const [channel, setChannel] = useState<BroadcastChannel>(props.channel);
  const [scriptMap, setScriptMap] = useState<Map<string, KotOR.NWScript>>(new Map());
  const [instanceMap, setInstanceMap] = useState<Map<string, KotOR.NWScriptInstance>>(new Map());
  const [parentMap, setParentMap] = useState<Map<string, Set<string>>>(new Map());

  const updateScriptMap = (k: string, v: KotOR.NWScript) => {
    setScriptMap(new Map(scriptMap.set(k,v)));
  }
  const updateInstanceMap = (k: string, v: KotOR.NWScriptInstance) => {
    setInstanceMap(new Map(instanceMap.set(k,v)));
  }

  const updateParentMap = (k: string, v: Set<string>) => {
    setParentMap(new Map(parentMap.set(k, new Set(v))));
  }

  useEffect(() => {
    setChannel(props.channel);
    props.channel.onmessage = (event) => {
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
          if(!scriptMap.has(name)){
            let nwscript = new KotOR.NWScript();
            nwscript.name = name;
            const code = message.getParam(4).getVoid();
            const progSize = message.getParam(3).getInt32();
            nwscript.init(code, progSize);
            updateScriptMap(name, nwscript);
          }
    
          const script = scriptMap.get(name);
          if(script){
            const instance = new KotOR.NWScriptInstance(script.instructions);
            instance.uuid = uuid;
            instance.parentUUID = parentUUID;
            instance.nwscript = script;
            instance.name = name;
            if(script.instances.find((inst) => inst.uuid == uuid) == undefined){
              script.instances = [...script.instances, instance];
              updateScriptMap(name, script);
            }
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
          const script = scriptMap.get(name);
          if(script){
            script.instances = [...script.instances.filter((inst) => inst.uuid != uuid)];
            updateScriptMap(name, script);
          }
    
          if(instanceMap.has(name)){
            instanceMap.delete(name);
          }
        }
      }
    }
  }, [props.channel]);

  const providerValue: AppProviderValues = {
    channel: [channel, setChannel],
    scriptMap: [scriptMap, setScriptMap],
    instanceMap: [instanceMap, setInstanceMap],
    parentMap: [parentMap, setParentMap],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
