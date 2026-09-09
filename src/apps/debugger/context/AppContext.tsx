import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as KotOR from "@/apps/debugger/KotOR";
import { DebuggerState, type ScriptOwnerFilter } from "@/apps/debugger/states/DebuggerState";
import type {
  GlobalsSnapshotEntry,
  LiveObjectSnapshot,
  ModuleAreaSnapshot,
  ObjectListEntry,
} from "@/inspect/runtimeSnapshots";

export type InspectorActivity = 'scene' | 'module' | 'objects' | 'globals' | 'scripts';
export type InspectorHostMode = 'iframe' | 'window';

export interface AppProviderValues {
  stateRef: React.MutableRefObject<DebuggerState>;
  scriptMap: [Map<string, KotOR.NWScript>, React.Dispatch<Map<string, KotOR.NWScript>>];
  instanceMap: [Map<string, KotOR.NWScriptInstance>, React.Dispatch<Map<string, KotOR.NWScriptInstance>>];
  parentMap: [Map<string, Set<string>>, React.Dispatch<Map<string, Set<string>>>];
  selectedInstance: [KotOR.NWScriptInstance, React.Dispatch<KotOR.NWScriptInstance>];
  setSelectedInstanceHelper: Function;
  sendMessageHelper: Function;
  activity: InspectorActivity;
  setActivity: (activity: InspectorActivity) => void;
  moduleSnapshot: ModuleAreaSnapshot | null;
  objectList: ObjectListEntry[];
  selectedObjectDetail: LiveObjectSnapshot | null;
  globalsSnapshot: GlobalsSnapshotEntry[];
  scriptOwnerFilter: ScriptOwnerFilter | null;
  hostMode: InspectorHostMode;
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: {children: any; appState: DebuggerState; hostMode?: InspectorHostMode}) => {
  const [scriptMap, setScriptMap] = useState<Map<string, KotOR.NWScript>>(new Map());
  const [instanceMap, setInstanceMap] = useState<Map<string, KotOR.NWScriptInstance>>(new Map());
  const [parentMap, setParentMap] = useState<Map<string, Set<string>>>(new Map());

  const [selectedInstance, setSelectedInstance] = useState<KotOR.NWScriptInstance>();
  const [activity, setActivity] = useState<InspectorActivity>('scene');
  const [moduleSnapshot, setModuleSnapshot] = useState<ModuleAreaSnapshot | null>(null);
  const [objectList, setObjectList] = useState<ObjectListEntry[]>([]);
  const [selectedObjectDetail, setSelectedObjectDetail] = useState<LiveObjectSnapshot | null>(null);
  const [globalsSnapshot, setGlobalsSnapshot] = useState<GlobalsSnapshotEntry[]>([]);
  const [scriptOwnerFilter, setScriptOwnerFilter] = useState<ScriptOwnerFilter | null>(null);
  const hostMode: InspectorHostMode = props.hostMode === 'iframe' ? 'iframe' : 'window';

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

    const refreshMaps = () => onUpdateState(appState);

    appState.addEventListener('update', onUpdateState);
    appState.addEventListener('selected-instance', onSelectedInstance);
    appState.addEventListener('message', onMessage);
    appState.addEventListener('script-created', refreshMaps);
    appState.addEventListener('script-destroyed', refreshMaps);
    appState.addEventListener('instance-updated', refreshMaps);
    appState.addEventListener('script-owner-updated', refreshMaps);
    appState.addEventListener('module-snapshot', setModuleSnapshot);
    appState.addEventListener('object-list', setObjectList);
    appState.addEventListener('object-detail', setSelectedObjectDetail);
    appState.addEventListener('globals-snapshot', setGlobalsSnapshot);
    appState.addEventListener('script-owner-filter', setScriptOwnerFilter);

    setModuleSnapshot(appState.moduleSnapshot);
    setObjectList(appState.objectList);
    setSelectedObjectDetail(appState.selectedObjectDetail);
    setGlobalsSnapshot(appState.globalsSnapshot);
    setScriptOwnerFilter(appState.scriptOwnerFilter);

    return () => {
      appState.removeEventListener('update', onUpdateState);
      appState.removeEventListener('selected-instance', onSelectedInstance);
      appState.removeEventListener('message', onMessage);
      appState.removeEventListener('script-created', refreshMaps);
      appState.removeEventListener('script-destroyed', refreshMaps);
      appState.removeEventListener('instance-updated', refreshMaps);
      appState.removeEventListener('script-owner-updated', refreshMaps);
      appState.removeEventListener('module-snapshot', setModuleSnapshot);
      appState.removeEventListener('object-list', setObjectList);
      appState.removeEventListener('object-detail', setSelectedObjectDetail);
      appState.removeEventListener('globals-snapshot', setGlobalsSnapshot);
      appState.removeEventListener('script-owner-filter', setScriptOwnerFilter);
      appState.dispose();
    };
  }, []);

  const providerValue: AppProviderValues = {
    stateRef,
    scriptMap: [scriptMap, setScriptMap],
    instanceMap: [instanceMap, setInstanceMap],
    parentMap: [parentMap, setParentMap],
    //@ts-ignore
    selectedInstance: [selectedInstance, setSelectedInstance],
    setSelectedInstanceHelper: setSelectedInstanceHelper,
    sendMessageHelper: sendMessageHelper,
    activity,
    setActivity,
    moduleSnapshot,
    objectList,
    selectedObjectDetail,
    globalsSnapshot,
    scriptOwnerFilter,
    hostMode,
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
