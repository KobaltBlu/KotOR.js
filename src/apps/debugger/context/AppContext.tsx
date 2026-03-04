import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import * as KotOR from "@/apps/debugger/KotOR";
import { DebuggerState } from "@/apps/debugger/states/DebuggerState";
import { IPCMessage } from "@/server/ipc/IPCMessage";

export interface AppProviderValues {
  stateRef: React.MutableRefObject<DebuggerState>;
  scriptMap: [Map<string, KotOR.NWScript>, React.Dispatch<Map<string, KotOR.NWScript>>];
  instanceMap: [Map<string, KotOR.NWScriptInstance>, React.Dispatch<Map<string, KotOR.NWScriptInstance>>];
  parentMap: [Map<string, Set<string>>, React.Dispatch<Map<string, Set<string>>>];
  selectedInstance: [KotOR.NWScriptInstance | undefined, React.Dispatch<KotOR.NWScriptInstance | undefined>];
  setSelectedInstanceHelper: (instance: KotOR.NWScriptInstance) => void;
  sendMessageHelper: (data: ArrayBuffer | ArrayBufferView) => void;
}
const defaultAppContextValue: AppProviderValues = null as unknown as AppProviderValues;
export const AppContext = createContext<AppProviderValues>(defaultAppContextValue);

export function useApp(){
  return useContext(AppContext);
}

export interface AppProviderProps {
  children: React.ReactNode;
  appState: DebuggerState;
}

export const AppProvider = (props: AppProviderProps) => {
  const [scriptMap, setScriptMap] = useState<Map<string, KotOR.NWScript>>(new Map());
  const [instanceMap, setInstanceMap] = useState<Map<string, KotOR.NWScriptInstance>>(new Map());
  const [parentMap, setParentMap] = useState<Map<string, Set<string>>>(new Map());

  const [selectedInstance, setSelectedInstance] = useState<KotOR.NWScriptInstance>();

  const stateRef = useRef<DebuggerState>(props.appState);

  const setSelectedInstanceHelper = (instance: KotOR.NWScriptInstance) => {
    stateRef.current?.setSelectedInstance(instance);
  }

  const sendMessageHelper = (data: ArrayBuffer | ArrayBufferView) => {
    stateRef.current?.sendMessage(data);
  }

  const onUpdateState = (state: DebuggerState) => {
    setScriptMap(new Map(state.scriptMap));
    setInstanceMap(new Map(state.instanceMap));
    setParentMap(new Map(state.parentMap));
  }

  const onMessage = (_message: IPCMessage) => {
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
