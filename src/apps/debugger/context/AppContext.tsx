import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as KotOR from "../KotOR";
import { DebuggerState } from "../states/DebuggerState";
import { IPCMessage } from "../../../server/ipc/IPCMessage";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";
import { IPCMessageParam } from "../../../server/ipc/IPCMessageParam";
import { IPCDataType } from "../../../enums/server/ipc/IPCDataType";

export interface AppProviderValues {
  stateRef: React.MutableRefObject<DebuggerState>;
  scriptMap: [Map<string, KotOR.NWScript>, React.Dispatch<Map<string, KotOR.NWScript>>];
  instanceMap: [Map<string, KotOR.NWScriptInstance>, React.Dispatch<Map<string, KotOR.NWScriptInstance>>];
  parentMap: [Map<string, Set<string>>, React.Dispatch<Map<string, Set<string>>>];
  selectedInstance: [KotOR.NWScriptInstance, React.Dispatch<KotOR.NWScriptInstance>];
  setSelectedInstanceHelper: Function;
  sendMessageHelper: Function;
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: {children: any; appState: DebuggerState}) => {
  const [scriptMap, setScriptMap] = useState<Map<string, KotOR.NWScript>>(new Map());
  const [instanceMap, setInstanceMap] = useState<Map<string, KotOR.NWScriptInstance>>(new Map());
  const [parentMap, setParentMap] = useState<Map<string, Set<string>>>(new Map());

  const [selectedInstance, setSelectedInstance] = useState<KotOR.NWScriptInstance>();

  const stateRef = useRef<DebuggerState>(props.appState);

  const setSelectedInstanceHelper = (instance: KotOR.NWScriptInstance) => {
    stateRef.current?.setSelectedInstance(instance);
  }

  const sendMessageHelper = (data: any) => {
    stateRef.current?.sendMessage(data);
  }

  const onUpdateState = (state: DebuggerState) => {
    setScriptMap(new Map(state.scriptMap));
    setInstanceMap(new Map(state.instanceMap));
    setParentMap(new Map(state.parentMap));
  }

  const onMessage = (message: any) => {
    onUpdateState(stateRef.current);
  }

  const onSelectedInstance = (instance: KotOR.NWScriptInstance) => {
    setSelectedInstance(instance);
  }

  useEffect(() => {
    const appState = stateRef.current;
    if(!appState) return;

    appState.addEventListener('update', onUpdateState);
    appState.addEventListener('selected-instance', onSelectedInstance);
    appState.addEventListener('message', onMessage);

    return () => {
      appState.removeEventListener('update', onUpdateState);
      appState.removeEventListener('selected-instance', onSelectedInstance);
      appState.removeEventListener('message', onMessage);
      appState.dispose();
    };
  }, []);

  const providerValue: AppProviderValues = {
    stateRef,
    scriptMap: [scriptMap, setScriptMap],
    instanceMap: [instanceMap, setInstanceMap],
    parentMap: [parentMap, setParentMap],
    selectedInstance: [selectedInstance, setSelectedInstance],
    setSelectedInstanceHelper: setSelectedInstanceHelper,
    sendMessageHelper: sendMessageHelper
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
