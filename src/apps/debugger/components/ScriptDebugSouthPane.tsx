import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@apps/debugger/context/AppContext";
import * as KotOR from "@apps/debugger/KotOR";
import { NWScriptDataType } from "@core/enums/nwscript/NWScriptDataType";
import type { NWScriptStackVariable } from "@engine/nwscript/NWScriptStackVariable";
import { nearestNssLineForCodeOffset } from "@core/nwscript/inspect/nssCodeLineMap";
import { decompileScriptWithLineMap } from "@core/nwscript/inspect/decompileScriptWithLineMap";

function stackObjectId(element: NWScriptStackVariable): number | null {
  if(element.type !== NWScriptDataType.OBJECT){ return null; }
  const raw = typeof element.value === 'object' && element.value
    ? (element.value as { id?: number }).id
    : element.value;
  const id = Number(raw ?? -1);
  if(!Number.isFinite(id) || id < 0){ return null; }
  // OBJECT_INVALID commonly 0x7FFFFFFF — still navigable if present in list
  return id | 0;
}

function formatStackValue(element: NWScriptStackVariable): string {
  switch(element.type){
    case NWScriptDataType.INTEGER:
      return String(element.value);
    case NWScriptDataType.FLOAT:
      return typeof element.value === 'number' ? element.value.toFixed(4) : String(element.value);
    case NWScriptDataType.STRING:
      return JSON.stringify(element.value ?? '');
    case NWScriptDataType.OBJECT: {
      const id = stackObjectId(element);
      return `0x${Number(id ?? 0).toString(16).toUpperCase().padStart(8, '0')}`;
    }
    default:
      return String(element.value ?? '');
  }
}

function typeName(type: number): string {
  switch(type){
    case NWScriptDataType.INTEGER: return 'INT';
    case NWScriptDataType.FLOAT: return 'FLOAT';
    case NWScriptDataType.STRING: return 'STRING';
    case NWScriptDataType.OBJECT: return 'OBJECT';
    case NWScriptDataType.EFFECT: return 'EFFECT';
    case NWScriptDataType.EVENT: return 'EVENT';
    case NWScriptDataType.LOCATION: return 'LOCATION';
    case NWScriptDataType.TALENT: return 'TALENT';
    default: return `0x${type.toString(16)}`;
  }
}

export const ScriptDebugSouthPane = () => {
  const appContext = useApp();
  const stateRef = appContext.stateRef;
  const navigateHelper = appContext.navigateHelper;
  const [instance, setInstance] = useState<KotOR.NWScriptInstance>();
  const instanceRef = useRef<KotOR.NWScriptInstance | undefined>(undefined);
  const [, rerender] = useState(0);

  useEffect(() => {
    const appState = stateRef.current;
    const onUpdate = (inst: KotOR.NWScriptInstance) => {
      // Stay pinned to the user/debugger selection; ignore unrelated instance traffic.
      if(instanceRef.current?.uuid !== inst.uuid){
        return;
      }
      instanceRef.current = inst;
      setInstance(inst);
      rerender((n) => n + 1);
    };
    const onSelect = (inst: KotOR.NWScriptInstance) => {
      instanceRef.current = inst;
      setInstance(inst);
      rerender((n) => n + 1);
    };
    appState.addEventListener('instance-updated', onUpdate);
    appState.addEventListener('selected-instance', onSelect);
    return () => {
      appState.removeEventListener('instance-updated', onUpdate);
      appState.removeEventListener('selected-instance', onSelect);
    };
  }, []);

  const stack = instance?.stack?.stack ?? [];
  const callStack = instance?.debugCallStack ?? [];
  const lineMap = instance?.nwscript
    ? decompileScriptWithLineMap(instance.nwscript).lineMap
    : undefined;

  const onFrameClick = (address: number) => {
    if(!instance) return;
    instance.seek = address;
    instance.dispatchEvent('seek', address);
    stateRef.current.dispatchEvent('instance-updated', instance);
  };

  const onStackObjectClick = (element: NWScriptStackVariable) => {
    const objectId = stackObjectId(element);
    if(objectId == null){ return; }
    navigateHelper({ activity: 'objects', objectId });
  };

  return (
    <div className="script-debug-south">
      <div className="script-debug-south-panel">
        <div className="script-debug-south-title">Call Stack</div>
        <ul className="script-debug-callstack">
          {instance ? (
            <>
              <li
                className="callstack-frame current"
                onClick={() => onFrameClick(instance.seek)}
              >
                <span className="frame-addr">0x{Number(instance.seek || 0).toString(16).toUpperCase().padStart(8, '0')}</span>
                <span className="frame-label">
                  {lineMap
                    ? `NSS L${nearestNssLineForCodeOffset(lineMap, instance.seek) ?? '?'}`
                    : 'PC'}
                </span>
              </li>
              {[...callStack].reverse().map((addr, index) => (
                <li
                  key={`frame-${index}-${addr}`}
                  className="callstack-frame"
                  onClick={() => onFrameClick(addr)}
                >
                  <span className="frame-addr">0x{addr.toString(16).toUpperCase().padStart(8, '0')}</span>
                  <span className="frame-label">
                    {lineMap
                      ? `ret NSS L${nearestNssLineForCodeOffset(lineMap, addr) ?? '?'}`
                      : 'return'}
                  </span>
                </li>
              ))}
            </>
          ) : (
            <li className="empty">No paused instance</li>
          )}
        </ul>
      </div>
      <div className="script-debug-south-panel">
        <div className="script-debug-south-title">
          Stack
          {instance?.stack ? (
            <span className="stack-meta">
              BP={instance.stack.basePointer} SP={instance.stack.pointer}
            </span>
          ) : null}
        </div>
        <ul className="script-debug-stack">
          {instance && stack.length ? (
            stack.map((element, index) => {
              const objectId = stackObjectId(element);
              const clickable = objectId != null;
              return (
                <li
                  key={`stack-${index}`}
                  className={`stack-element ${clickable ? 'stack-element-link' : ''}`}
                  title={clickable ? `Open object ${objectId}` : undefined}
                  onClick={clickable ? () => onStackObjectClick(element) : undefined}
                >
                  <span className="stack-index">[{index}]</span>
                  <span className="stack-type">{typeName(element.type)}</span>
                  <span className="stack-value">{formatStackValue(element)}</span>
                </li>
              );
            })
          ) : (
            <li className="empty">Empty</li>
          )}
        </ul>
      </div>
    </div>
  );
};
