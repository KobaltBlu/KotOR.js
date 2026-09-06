import React, { useEffect, useRef, useState } from "react"
import { useApp } from "@/apps/debugger/context/AppContext";
import * as KotOR from "@/apps/debugger/KotOR";
import { OP_CONST, OP_CPDOWNBP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPTOPSP, OP_JMP, OP_JNZ, OP_JSR, OP_JZ, OP_MOVSP, OP_RSADD } from "@/nwscript/NWScriptOPCodes";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import {
  nearestNssLineForCodeOffset,
  type NssCodeLineMap,
} from "@/nwscript/inspect/nssCodeLineMap";
import { decompileScriptWithLineMap } from "@/nwscript/inspect/decompileScriptWithLineMap";

/**
 * Script Instance Window
 */

type SourceViewMode = 'decompiled' | 'assembly';

type CachedDecompile = {
  nss: string;
  lines: string[];
  lineMap: NssCodeLineMap;
  functions: Array<{ codeOffset: number; name: string }>;
};

function getCachedDecompile(script: KotOR.NWScript | undefined | null): CachedDecompile | undefined {
  if (!script) return undefined;
  const result = decompileScriptWithLineMap(script);
  return {
    nss: result.nss,
    lines: result.nss.length ? result.nss.split('\n') : [],
    lineMap: result.lineMap,
    functions: result.functions,
  };
}

const InstructionType = (props: {type: number}) => {
  const typeName = (() => {
    switch(props.type){
      case 0x00: return 'VOID';
      case 0x03: return 'INTEGER';
      case 0x04: return 'FLOAT';
      case 0x05: return 'STRING';
      case 0x06: return 'OBJECT';
      case 0x10: return 'EFFECT';
      case 0x11: return 'EVENT';
      case 0x12: return 'LOCATION';
      case 0x13: return 'TALENT';
      case 0x14: return 'VECTOR';
      case 0x24: return 'STRUCTURE';
      case 0xFF: return 'ACTION';
      default: return '';
    }
  })();

  return (typeName?.length ? (<b className={`instruction-datatype ${typeName}`}>[{typeName}]</b>) : <></>)
}

const InstructionValue = (props: {instruction: KotOR.NWScriptInstruction}) => {
  const instruction = props.instruction;
  let val = '';
  let type = '';
  switch(instruction.type){
    case 0x03:
      val = instruction.integer?.toString() || '';
      type = 'integer';
      break;
    case 0x04:
      val = instruction.float?.toString() || '';
      type = 'float';
      break;
    case 0x05:
      val = `"${instruction.string ?? ''}"`;
      type = 'string';
      break;
    case 0x06:
      val = instruction.object?.toString() ?? '';
      type = 'object';
      break;
  }

  return (val ? (<>
    <b className={`instruction-value ${type}`}>{val}</b>
  </>) : <></>)
}

const InstructionOffset = (props: {instance: KotOR.NWScriptInstance, instruction: KotOR.NWScriptInstruction}) => {
  const {instance, instruction} = props;
  const address = instruction.intToHex(instruction.offset + instruction.address, 8);
  const onClick = () => {
    if(instance){
      instance.seek = (instruction.offset + instruction.address);
      instance.dispatchEvent('seek', instance.seek);
    }
  }
  return (instruction.offset ? (<>
    <a href={`#${address}`} className="instruction-offset" onClick={onClick}>{address}</a>
  </>) : <></>)
}

const InstructionPointer = (props: {pointer: number}) => {
  const {pointer} = props;
  return (pointer ? (<>
    <span>{pointer}</span>
  </>) : <></>)
}

const InstructionNode = (props: {
  instance: KotOR.NWScriptInstance;
  instruction: KotOR.NWScriptInstruction;
  seek: number;
  bpVersion: number;
}) => {
  const {instruction, instance, seek, bpVersion} = props;
  const isBreakpoint = instance.breakPoints.has(instruction.address);
  const isSeeked = seek === instruction.address;
  const lineRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isSeeked && lineRef.current) {
      lineRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSeeked, seek]);

  const callToggleBreakpoint = () => {
    instance.toggleBreakpoint(instruction.address);
  }

  return (
    <li
      ref={lineRef}
      className={`instruction-node ${isBreakpoint ? 'breakpoint' : ''} ${isSeeked ? 'seeked' : ''}`}
      key={`${instance.uuid}-${instruction.address_hex}-${bpVersion}`}
      id={instruction.address_hex}
    >
      <div className="breakpoint-clicker" title="Toggle breakpoint" onClick={callToggleBreakpoint}></div>
      <span className="instruction-address">{instruction.address_hex}</span> - <span className={`instruction-codeName ${instruction.codeName}`}>{instruction.codeName.padEnd(8, "\u00a0")}</span> - {instruction.action ? (<>
        <b className="instruction-actionName">{instruction.actionDefinition.name}</b>&nbsp;
        <InstructionType type={instruction.actionDefinition.type} />
      </>) : <></>}
      {instruction.type != undefined ? (<>
        {(
        instruction.code == OP_CONST || 
        instruction.code == OP_RSADD
      ) ? <InstructionType type={instruction.type} /> : <></>}&nbsp;
        {!instruction.action ? <InstructionValue instruction={instruction} /> : <></>}
      </>) : <></>}
      {(
        instruction.code == OP_JSR || 
        instruction.code == OP_JMP || 
        instruction.code == OP_JNZ || 
        instruction.code == OP_JZ
      ) ? <InstructionOffset instance={instance} instruction={instruction} /> : <></>}
      {(
        instruction.code == OP_CPDOWNBP || 
        instruction.code == OP_CPDOWNSP || 
        instruction.code == OP_CPTOPBP || 
        instruction.code == OP_CPTOPSP ||
        instruction.code == OP_MOVSP
      ) ? <InstructionPointer pointer={instruction.offset} /> : <></>}
    </li>
  )
}

const NssSourceLine = (props: {
  instance: KotOR.NWScriptInstance;
  lineNumber: number;
  text: string;
  codeOffset?: number;
  isSeeked: boolean;
  bpVersion: number;
}) => {
  const { instance, lineNumber, text, codeOffset, isSeeked, bpVersion } = props;
  const canBreak = codeOffset != null;
  const isBreakpoint = canBreak && instance.breakPoints.has(codeOffset);
  const lineRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isSeeked && lineRef.current) {
      lineRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSeeked]);

  const callToggleBreakpoint = () => {
    if (!canBreak) return;
    instance.toggleBreakpoint(codeOffset);
  };

  return (
    <li
      ref={lineRef}
      className={`nss-line ${canBreak ? 'mappable' : ''} ${isBreakpoint ? 'breakpoint' : ''} ${isSeeked ? 'seeked' : ''}`}
      id={`nss-line-${lineNumber}`}
      data-bp={bpVersion}
    >
      <div
        className={`breakpoint-clicker ${canBreak ? '' : 'disabled'}`}
        title={canBreak ? `Toggle breakpoint @ 0x${codeOffset.toString(16).toUpperCase().padStart(8, '0')}` : 'No bytecode mapping'}
        onClick={callToggleBreakpoint}
      ></div>
      <span className="nss-line-number">{lineNumber}</span>
      <span className="nss-line-text">{text.length ? text : '\u00a0'}</span>
    </li>
  );
};

export const ScriptInstanceWindow = () => {
  const appContext = useApp();
  const stateRef = appContext.stateRef;
  const sendMessageHelper = appContext.sendMessageHelper;
  const [instance, setInstance] = useState<KotOR.NWScriptInstance>();
  const [instructions, setInstructions] = useState<KotOR.NWScriptInstruction[]>([]);
  const [viewMode, setViewMode] = useState<SourceViewMode>('decompiled');
  const [decompile, setDecompile] = useState<CachedDecompile | undefined>();
  const [bpVersion, setBpVersion] = useState(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if(!instance) {
      setDecompile(undefined);
      return;
    }
    setInstructions([...instance.instructions.values()]);
    setDecompile(getCachedDecompile(instance.nwscript));
    setBpVersion(instance.breakPointVersion);
  }, [instance]);

  const refreshInstance = (inst: KotOR.NWScriptInstance) => {
    setInstance(inst);
    setInstructions([...inst.instructions.values()]);
    setDecompile(getCachedDecompile(inst.nwscript));
    setBpVersion(inst.breakPointVersion);
    forceRender((n) => n + 1);
  };

  useEffect(() => {
    const appState = stateRef.current;
    const onStateInstanceUpdate = (inst: KotOR.NWScriptInstance) => refreshInstance(inst);
    const onSelectedInstance = (inst: KotOR.NWScriptInstance) => refreshInstance(inst);
    const onBreakpoint = () => {
      if(instance){
        setBpVersion(instance.breakPointVersion);
        forceRender((n) => n + 1);
      }
    };

    appState.addEventListener('instance-updated', onStateInstanceUpdate);
    appState.addEventListener('selected-instance', onSelectedInstance);
    return () => {
      appState.removeEventListener('instance-updated', onStateInstanceUpdate);
      appState.removeEventListener('selected-instance', onSelectedInstance);
    };
  }, [instance]);

  useEffect(() => {
    if(!instance) return;
    const handler = () => {
      setBpVersion(instance.breakPointVersion);
      forceRender((n) => n + 1);
    };
    instance.addEventListener('breakpoint', handler);
    return () => instance.removeEventListener('breakpoint', handler);
  }, [instance]);

  const btnPauseResume = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.ContinueScript);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepOver = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepOverInstruction);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepIn = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepIntoInstruction);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepOut = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepOutInstruction);
    sendMessageHelper(message.toBuffer());
  }

  const btnClearBreakpoints = () => {
    if(!instance) return;
    stateRef.current.clearInstanceBreakpoints(instance);
    setBpVersion(instance.breakPointVersion);
    forceRender((n) => n + 1);
  }

  const seek = instance?.seek ?? -1;
  const seekedNssLine = instance && decompile
    ? nearestNssLineForCodeOffset(decompile.lineMap, seek)
    : undefined;

  const jumpToNssForOffset = (codeOffset: number) => {
    if (!decompile) return;
    const line = nearestNssLineForCodeOffset(decompile.lineMap, codeOffset);
    if (line == null) return;
    setViewMode('decompiled');
    requestAnimationFrame(() => {
      document.getElementById(`nss-line-${line}`)?.scrollIntoView({ block: 'nearest' });
    });
  };

  const jumpToFunction = (codeOffset: number) => {
    if (!instance) return;
    instance.seek = codeOffset;
    instance.dispatchEvent('seek', codeOffset);
    forceRender((n) => n + 1);
    if (viewMode === 'assembly') {
      requestAnimationFrame(() => {
        const hex = codeOffset.toString(16).toUpperCase().padStart(8, '0');
        document.getElementById(hex)?.scrollIntoView({ block: 'nearest' });
      });
      return;
    }
    jumpToNssForOffset(codeOffset);
  };

  const shortId = instance?.uuid ? instance.uuid.slice(0, 8) : '';
  const functionOutline = decompile?.functions?.length ? (
    <div className="debugger-function-list">
      {decompile.functions.map((fn) => (
        <button
          key={`${fn.name}-${fn.codeOffset}`}
          className="debugger-function-btn"
          title={`0x${fn.codeOffset.toString(16).toUpperCase().padStart(8, '0')}`}
          onClick={() => jumpToFunction(fn.codeOffset)}
        >
          {fn.name}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="script-debugger-instance">
      <div className="title">
        <span title={instance ? `${instance.name} | ${instance.uuid}` : undefined}>
          {instance ? `Instance: ${instance.name} · ${shortId}` : 'Instance'}
        </span>
        {instance ? (
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'decompiled' ? 'active' : ''}`}
              onClick={() => setViewMode('decompiled')}
              title="Decompiled NSS"
            >
              Decompiled
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'assembly' ? 'active' : ''}`}
              onClick={() => setViewMode('assembly')}
              title="NCS Assembly"
            >
              Assembly
            </button>
          </div>
        ) : <></>}
      </div>
      <div className="content">
        <div className="content-inner">
          {viewMode === 'assembly' ? (
            <div className="debugger-source-pane">
              {functionOutline}
              <ul className="instruction-list">
                {instance ? (
                  instructions.map((instruction) => (
                    <InstructionNode
                      instance={instance}
                      instruction={instruction}
                      seek={seek}
                      bpVersion={bpVersion}
                      key={instance.uuid +'-'+instruction.address_hex}
                    />
                  ))
                ) : <></>}
              </ul>
            </div>
          ) : (
            <div className="debugger-source-pane">
              {functionOutline}
              <ul className="nss-line-list">
                {instance && decompile ? (
                  decompile.lines.map((text, index) => {
                    const lineNumber = index + 1;
                    const codeOffset = decompile.lineMap.nssLineToCodeOffset.get(lineNumber);
                    return (
                      <NssSourceLine
                        key={`${instance.uuid}-nss-${lineNumber}`}
                        instance={instance}
                        lineNumber={lineNumber}
                        text={text}
                        codeOffset={codeOffset}
                        isSeeked={seekedNssLine === lineNumber}
                        bpVersion={bpVersion}
                      />
                    );
                  })
                ) : <></>}
              </ul>
            </div>
          )}
          {instance ? (
            <div className="debugger-buttons">
              <button className="btn btn-primary debugger-button" onClick={btnPauseResume} title="Continue Execution">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnStepOver} title="Step Over">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path d="M386.3 160L336 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-128c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnStepIn} title="Step Into">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path d="M2 334.5c-3.8 8.8-2 19 4.6 26l136 144c4.5 4.8 10.8 7.5 17.4 7.5s12.9-2.7 17.4-7.5l136-144c6.6-7 8.4-17.2 4.6-26s-12.5-14.5-22-14.5l-72 0 0-288c0-17.7-14.3-32-32-32L128 0C110.3 0 96 14.3 96 32l0 288-72 0c-9.6 0-18.2 5.7-22 14.5z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnStepOut} title="Step Out">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path d="M318 177.5c3.8-8.8 2-19-4.6-26l-136-144C172.9 2.7 166.6 0 160 0s-12.9 2.7-17.4 7.5l-136 144c-6.6 7-8.4 17.2-4.6 26S14.4 192 24 192l72 0 0 288c0 17.7 14.3 32 32 32l64 0c17.7 0 32-14.3 32-32l0-288 72 0c9.6 0 18.2-5.7 22-14.5z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnClearBreakpoints} title="Clear Breakpoints">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                </svg>
              </button>
            </div>
          ) : <></>}
        </div>
      </div>
    </div>
  )
}
