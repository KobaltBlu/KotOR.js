import React, { useEffect, useState } from "react"
import { useApp } from "./context/AppContext";
import * as KotOR from "./KotOR";

const InstanceNode = (props: {instance: KotOR.NWScriptInstance, onClick: (instance: KotOR.NWScriptInstance) => void}) => {
  const {instance, onClick} = props;
  return (instance ? <li key={instance.uuid} onClick={() => onClick(instance)} style={{cursor: 'pointer'}}>
    {instance.name} | {instance.uuid}
  </li> : <></>)
}

const ScriptNode = (props: {
  children?: any[], script: KotOR.NWScript, scriptMap: Map<string, KotOR.NWScript>, instanceMap: Map<string, KotOR.NWScriptInstance>, parentMap: Map<string, Set<string>>, onClick: (instance: KotOR.NWScriptInstance) => void
}) => {
  const {children, script, scriptMap, parentMap, onClick} = props;
  return (script ? <li key={script.name}>
    {script.name}
    <ul>
      {[...script.instances].map((instance) => (
        <InstanceNode instance={instance} onClick={onClick} />
      ))}
    </ul>
  </li> : <></>)
}

export const App = () => {
  const appContext = useApp();
  const [scriptMap] = appContext.scriptMap;
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;

  const [selectedInstance, setSelectedInstance] = useState<KotOR.NWScriptInstance>();

  const onClick = (instance: KotOR.NWScriptInstance) => {
    console.log(instance);
    setSelectedInstance(instance);
  }

  return (
  <div>
    <h1>Debugger</h1>
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <div style={{flex: 0.5}}>
        <h2>Scripts</h2>
        <ul>
          {[...scriptMap.keys()].map((script) => (
            scriptMap.has(script) ? (
              <ScriptNode script={scriptMap.get(script) as KotOR.NWScript} scriptMap={scriptMap} instanceMap={instanceMap} parentMap={parentMap} onClick={onClick} />
            ) : <></>
          ))}
        </ul>
      </div>
      <div style={{flex: 0.5}}>
        <h2>Instance</h2>
        <b>Name: {selectedInstance?.name}</b>
        <ul>
          {selectedInstance ? (
            [...selectedInstance.instructions.values()].map((instruction) => (
              <li key={instruction.address}>{instruction.address_hex} - {instruction.codeName} - {instruction.action}</li>
            ))
          ) : <></>}
        </ul>
      </div>
    </div>
  </div>);
}