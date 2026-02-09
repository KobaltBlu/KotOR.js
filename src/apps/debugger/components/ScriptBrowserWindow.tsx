import React from "react";
import { useApp } from "../context/AppContext";
import * as KotOR from "../KotOR";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";
import { IPCDataType } from "../../../enums/server/ipc/IPCDataType";

/**
 * Script Browser Window
 * Lists all loaded scripts and their instances; allows selecting an instance and sending
 * debugger commands (Pause/Resume, Step Over, Clear Breakpoints). Clear Breakpoints removes
 * all breakpoints from the selected instance, or from every instance when none is selected.
 */

const InstanceListItem = (props: {
  instance: KotOR.NWScriptInstance;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onClick: (instance: KotOR.NWScriptInstance) => void;
}) => {
  const { instance, selectedInstance, onClick } = props;
  return instance ? (
    <li
      className={`script-browser-list-instance-item ${instance.uuid === selectedInstance?.uuid ? "selected" : ""}`}
      onClick={() => onClick(instance)}
    >
      {instance.name} | {instance.uuid}
    </li>
  ) : null;
};

const NWScriptListItem = (props: {
  script: KotOR.NWScript;
  scriptMap: Map<string, KotOR.NWScript>;
  instanceMap: Map<string, KotOR.NWScriptInstance>;
  parentMap: Map<string, Set<string>>;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onSelectInstance: (instance: KotOR.NWScriptInstance) => void;
}) => {
  const { script, selectedInstance, onSelectInstance } = props;
  return script ? (
    <li key={script.name} className="script-browser-list-item">
      {script.name}
      <ul className="script-browser-list-instance-list">
        {[...script.instances].map((instance) => (
          <InstanceListItem
            key={instance.uuid}
            instance={instance}
            selectedInstance={selectedInstance}
            onClick={onSelectInstance}
          />
        ))}
      </ul>
    </li>
  ) : null;
};

export const ScriptBrowserWindow = () => {
  const appContext = useApp();
  const [scriptMap, setScriptMap] = appContext.scriptMap;
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;
  const sendMessageHelper = appContext.sendMessageHelper;
  const [selectedInstance] = appContext.selectedInstance;
  const setSelectedInstanceHelper = appContext.setSelectedInstanceHelper;

  const onSelectInstance = (instance: KotOR.NWScriptInstance) => {
    setSelectedInstanceHelper(instance);
  };

  const btnPauseResume = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.ContinueScript);
    sendMessageHelper(message.toBuffer());
  };

  const btnStepOver = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepOverInstruction);
    sendMessageHelper(message.toBuffer());
  };

  const clearBreakpoints = () => {
    const instancesToClear: KotOR.NWScriptInstance[] = selectedInstance
      ? [selectedInstance]
      : [...instanceMap.values()];

    for (const instance of instancesToClear) {
      if (!instance?.breakPoints?.size) continue;

      for (const address of instance.breakPoints.keys()) {
        const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.RemoveScriptBreakpoint);
        message.addParam(new KotOR.GameState.Debugger.IPCMessageParam(IPCDataType.STRING, instance.uuid));
        message.addParam(new KotOR.GameState.Debugger.IPCMessageParam(IPCDataType.INTEGER, address));
        sendMessageHelper(message.toBuffer());
      }

      instance.breakPoints.clear();
    }

    setScriptMap(new Map(scriptMap));
  };

  const sortedScriptNames = [...scriptMap.keys()].sort((a, b) => (a > b ? 1 : b > a ? -1 : 0));
  const hasSelection = !!selectedInstance;

  return (
    <div className="script-debugger-scripts">
      <div className="title">
        <span>Scripts</span>
      </div>
      <div className="script-browser-toolbar">
        <button
          type="button"
          className="btn btn-primary debugger-button"
          onClick={btnPauseResume}
          disabled={!hasSelection}
          title="Pause / Resume Execution"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
          </svg>
        </button>
        <button
          type="button"
          className="btn btn-primary debugger-button"
          onClick={btnStepOver}
          disabled={!hasSelection}
          title="Step Over Instruction"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path d="M386.3 160L336 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-128c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z" />
          </svg>
        </button>
        <button
          type="button"
          className="btn btn-primary debugger-button"
          onClick={clearBreakpoints}
          title={selectedInstance ? "Clear breakpoints for selected instance" : "Clear all breakpoints"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
            <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
          </svg>
        </button>
      </div>
      <div className="content">
        <ul className="script-browser-list">
          {sortedScriptNames.map((scriptName) => {
            const script = scriptMap.get(scriptName);
            return script ? (
              <NWScriptListItem
                key={script.name}
                script={script}
                scriptMap={scriptMap}
                instanceMap={instanceMap}
                parentMap={parentMap}
                selectedInstance={selectedInstance}
                onSelectInstance={onSelectInstance}
              />
            ) : null;
          })}
        </ul>
      </div>
    </div>
  );
};
