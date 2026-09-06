import React from "react"
import { useApp } from "@/apps/debugger/context/AppContext";
import * as KotOR from "@/apps/debugger/KotOR";

/**
 * Script Browser Window
 */

const InstanceListItem = (props: {instance: KotOR.NWScriptInstance, selectedInstance: KotOR.NWScriptInstance, onClick: (instance: KotOR.NWScriptInstance) => void}) => {
  const {instance, selectedInstance, onClick} = props;
  return (
    instance ? (
      <li className={`script-browser-list-instance-item ${instance.uuid == selectedInstance?.uuid ? 'selected' : ''}`} key={instance.uuid} onClick={() => onClick(instance)} style={{cursor: 'pointer'}}>
        {instance.name} | {instance.uuid}
      </li>
    ) : <></>
  );
}

const NWScriptListItem = (props: {
  children?: any[], script: KotOR.NWScript, scriptMap: Map<string, KotOR.NWScript>, instanceMap: Map<string, KotOR.NWScriptInstance>, 
  parentMap: Map<string, Set<string>>, selectedInstance: KotOR.NWScriptInstance, onSelectInstance: (instance: KotOR.NWScriptInstance) => void
}) => {
  const {script, selectedInstance, onSelectInstance} = props;
  return (script ? <li key={script.name} className="script-browser-list-item">
    {script.name}
    <ul className="script-browser-list-instance-list">
      {[...script.instances].map((instance) => (
        <InstanceListItem key={instance.uuid} instance={instance} selectedInstance={selectedInstance} onClick={onSelectInstance} />
      ))}
    </ul>
  </li> : <></>)
}

export const ScriptBrowserWindow = (props: { nameFilter?: string[] } = {}) => {
  const { nameFilter = [] } = props;
  const appContext = useApp();
  const [scriptMap] = appContext.scriptMap;
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;
  const [selectedInstance] = appContext.selectedInstance;
  const setSelectedInstanceHelper = appContext.setSelectedInstanceHelper;

  const onSelectInstance = (instance: KotOR.NWScriptInstance) => {
    setSelectedInstanceHelper(instance);
  }

  const filterSet = nameFilter.length
    ? new Set(nameFilter.map((n) => n.toLowerCase()))
    : null;

  const names = [...scriptMap.keys()]
    .sort((a,b) => (a > b) ? 1 : ((b > a) ? -1 : 0))
    .filter((name) => {
      if(!filterSet){ return true; }
      return filterSet.has(name.toLowerCase())
        || [...filterSet].some((f) => name.toLowerCase().includes(f) || f.includes(name.toLowerCase()));
    });

  return (
    <div className="script-debugger-scripts">
      <div className="title">
        <span>Scripts</span>
      </div>
      <div className="content">
        <ul className="script-browser-list">
          {names.map((script) => (
            scriptMap.has(script) ? (
              <NWScriptListItem
                key={script}
                script={scriptMap.get(script) as KotOR.NWScript}
                scriptMap={scriptMap}
                instanceMap={instanceMap}
                parentMap={parentMap}
                selectedInstance={selectedInstance}
                onSelectInstance={onSelectInstance}
              />
            ) : <React.Fragment key={script} />
          ))}
        </ul>
      </div>
    </div>
  );
}
