import React, { useEffect, useState } from "react"
import { useApp } from "../context/AppContext";
import * as KotOR from "../KotOR";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";

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
  const {children, script, scriptMap, parentMap, selectedInstance, onSelectInstance} = props;
  return (script ? <li key={script.name} className="script-browser-list-item">
    {script.name}
    <ul className="script-browser-list-instance-list">
      {[...script.instances].map((instance) => (
        <InstanceListItem instance={instance} selectedInstance={selectedInstance} onClick={onSelectInstance} />
      ))}
    </ul>
  </li> : <></>)
}

export const ScriptBrowserWindow = () => {
  const appContext = useApp();
  const [scriptMap] = appContext.scriptMap;
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;
  const sendMessageHelper = appContext.sendMessageHelper;
  const [selectedInstance, setSelectedInstance] = appContext.selectedInstance;
  const setSelectedInstanceHelper = appContext.setSelectedInstanceHelper;

  const onSelectInstance = (instance: KotOR.NWScriptInstance) => {
    console.log(instance);
    setSelectedInstanceHelper(instance);
  }

  const btnPauseResume = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.ContinueScript);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepOver = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepOverInstruction);
    sendMessageHelper(message.toBuffer());
  }

  const clearBreakpoints = () => {
    console.log("todo: Clear Breakpoints");
  }
  return (
    <div className="script-debugger-scripts">
      <div className="title">
        <span>Scripts</span>
      </div>
      <div className="content">
        <ul className="script-browser-list">
          {[...scriptMap.keys()].sort((a,b) => (a > b) ? 1 : ((b > a) ? -1 : 0)).map((script) => (
            scriptMap.has(script) ? (
              <NWScriptListItem script={scriptMap.get(script) as KotOR.NWScript} scriptMap={scriptMap} instanceMap={instanceMap} parentMap={parentMap} selectedInstance={selectedInstance} onSelectInstance={onSelectInstance} />
            ) : <></>
          ))}
        </ul>
      </div>
    </div>
  );
}
