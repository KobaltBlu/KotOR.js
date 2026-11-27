import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as KotOR from "@apps/debugger/KotOR";
import { DebuggerState, type ScriptOwnerFilter } from "@apps/debugger/states/DebuggerState";
import type { DebugTarget } from "@apps/debugger/DebugTarget";
import type {
  GlobalsSnapshotEntry,
  LiveObjectSnapshot,
  ModuleAreaSnapshot,
  ObjectListEntry,
} from "@engine/debug/inspect/runtimeSnapshots";
import type { DialogSnapshot } from "@engine/debug/inspect/dialogSnapshot";

export type InspectorActivity = 'scene' | 'module' | 'objects' | 'globals' | 'scripts' | 'dialog';
export type InspectorHostMode = 'iframe' | 'window';

const ACTIVITY_IDS: InspectorActivity[] = ['scene', 'module', 'objects', 'globals', 'scripts', 'dialog'];

function isActivity(value: string | undefined): value is InspectorActivity {
  return !!value && (ACTIVITY_IDS as string[]).includes(value);
}

export interface AppProviderValues {
  stateRef: React.MutableRefObject<DebuggerState>;
  scriptMap: [Map<string, KotOR.NWScript>, React.Dispatch<Map<string, KotOR.NWScript>>];
  instanceMap: [Map<string, KotOR.NWScriptInstance>, React.Dispatch<Map<string, KotOR.NWScriptInstance>>];
  parentMap: [Map<string, Set<string>>, React.Dispatch<Map<string, Set<string>>>];
  selectedInstance: [KotOR.NWScriptInstance, React.Dispatch<KotOR.NWScriptInstance>];
  setSelectedInstanceHelper: Function;
  sendMessageHelper: Function;
  navigateHelper: (target: DebugTarget) => void;
  activity: InspectorActivity;
  setActivity: (activity: InspectorActivity) => void;
  moduleSnapshot: ModuleAreaSnapshot | null;
  objectList: ObjectListEntry[];
  selectedObjectDetail: LiveObjectSnapshot | null;
  globalsSnapshot: GlobalsSnapshotEntry[];
  dialogSnapshot: DialogSnapshot | null;
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
  const persistedActivity = props.appState.getPersistedActivity();
  const [activity, setActivityState] = useState<InspectorActivity>(
    isActivity(persistedActivity) ? persistedActivity : 'scene'
  );
  const [moduleSnapshot, setModuleSnapshot] = useState<ModuleAreaSnapshot | null>(null);
  const [objectList, setObjectList] = useState<ObjectListEntry[]>([]);
  const [selectedObjectDetail, setSelectedObjectDetail] = useState<LiveObjectSnapshot | null>(null);
  const [globalsSnapshot, setGlobalsSnapshot] = useState<GlobalsSnapshotEntry[]>([]);
  const [dialogSnapshot, setDialogSnapshot] = useState<DialogSnapshot | null>(
    props.appState.dialogSnapshot
  );
  const [scriptOwnerFilter, setScriptOwnerFilter] = useState<ScriptOwnerFilter | null>(
    props.appState.scriptOwnerFilter
  );
  const hostMode: InspectorHostMode = props.hostMode === 'iframe' ? 'iframe' : 'window';

  const stateRef = useRef<DebuggerState>(props.appState);

  const setActivity = (next: InspectorActivity) => {
    setActivityState(next);
    stateRef.current?.persistUiState({ activity: next });
  };

  const setSelectedInstanceHelper = (instance: KotOR.NWScriptInstance) => {
    stateRef.current?.setSelectedInstance(instance);
  }

  const sendMessageHelper = (data: any) => {
    stateRef.current?.sendMessage(data);
  }

  const navigateHelper = (target: DebugTarget) => {
    stateRef.current?.navigate(target);
  };

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
    const onNavigate = (target: DebugTarget) => {
      if(target.activity && isActivity(target.activity)){
        setActivityState(target.activity);
      }
    };

    appState.addEventListener('update', onUpdateState);
    appState.addEventListener('selected-instance', onSelectedInstance);
    appState.addEventListener('message', onMessage);
    appState.addEventListener('script-created', refreshMaps);
    appState.addEventListener('script-destroyed', refreshMaps);
    appState.addEventListener('instance-updated', refreshMaps);
    appState.addEventListener('script-owner-updated', refreshMaps);
    appState.addEventListener('script-resource', refreshMaps);
    appState.addEventListener('module-snapshot', setModuleSnapshot);
    appState.addEventListener('object-list', setObjectList);
    appState.addEventListener('object-detail', setSelectedObjectDetail);
    appState.addEventListener('globals-snapshot', setGlobalsSnapshot);
    appState.addEventListener('dialog-snapshot', setDialogSnapshot);
    appState.addEventListener('script-owner-filter', setScriptOwnerFilter);
    appState.addEventListener('navigate', onNavigate);

    setModuleSnapshot(appState.moduleSnapshot);
    setObjectList(appState.objectList);
    setSelectedObjectDetail(appState.selectedObjectDetail);
    setGlobalsSnapshot(appState.globalsSnapshot);
    setDialogSnapshot(appState.dialogSnapshot);
    setScriptOwnerFilter(appState.scriptOwnerFilter);

    return () => {
      appState.removeEventListener('update', onUpdateState);
      appState.removeEventListener('selected-instance', onSelectedInstance);
      appState.removeEventListener('message', onMessage);
      appState.removeEventListener('script-created', refreshMaps);
      appState.removeEventListener('script-destroyed', refreshMaps);
      appState.removeEventListener('instance-updated', refreshMaps);
      appState.removeEventListener('script-owner-updated', refreshMaps);
      appState.removeEventListener('script-resource', refreshMaps);
      appState.removeEventListener('module-snapshot', setModuleSnapshot);
      appState.removeEventListener('object-list', setObjectList);
      appState.removeEventListener('object-detail', setSelectedObjectDetail);
      appState.removeEventListener('globals-snapshot', setGlobalsSnapshot);
      appState.removeEventListener('dialog-snapshot', setDialogSnapshot);
      appState.removeEventListener('script-owner-filter', setScriptOwnerFilter);
      appState.removeEventListener('navigate', onNavigate);
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
    navigateHelper,
    activity,
    setActivity,
    moduleSnapshot,
    objectList,
    selectedObjectDetail,
    globalsSnapshot,
    dialogSnapshot,
    scriptOwnerFilter,
    hostMode,
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
