import React, { useEffect, useState } from "react"
import { useApp } from "../context/AppContext";
import * as KotOR from "../KotOR";
import { OP_CONST, OP_CPDOWNBP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPTOPSP, OP_JMP, OP_JNZ, OP_JSR, OP_JZ, OP_MOVSP, OP_RSADD } from "../../../nwscript/NWScriptOPCodes";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {} from "@fortawesome/free-solid-svg-icons";

/**
 * Script Instance Window
 */

const InstructionType = (props: {type: number}) => {
  const [typeName, setTypeName] = useState('');

  useEffect(() => {
    switch(props.type){
      case 0x00:
        setTypeName('VOID');
        break;  
      case 0x03:
        setTypeName('INTEGER');
        break;
      case 0x04:
        setTypeName('FLOAT');
        break;
      case 0x05:
        setTypeName('STRING');
        break;
      case 0x06:
        setTypeName('OBJECT');
        break;
      case 0x10:
        setTypeName('EFFECT');
        break;
      case 0x11:
        setTypeName('EVENT');
        break;
      case 0x12:
        setTypeName('LOCATION');
        break;
      case 0x13:
        setTypeName('TALENT');
        break;
      case 0x14:
        setTypeName('VECTOR');
        break;
      case 0x24:
        setTypeName('STRUCTURE');
        break;
      case 0xFF:
        setTypeName('ACTION');
        break;
    }
  }, [props.type]);

  return (typeName?.length ? (<b className={`instruction-datatype ${typeName}`}>[{typeName}]</b>) : <></>)
}

const InstructionValue = (props: {instruction: KotOR.NWScriptInstruction}) => {
  const [val, setVal] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    const instruction = props.instruction;
    switch(instruction.type){
      case 0x00:
        setVal('');
        setType('void');
        break;  
      case 0x03:
        setVal(instruction.integer?.toString() || '');
        setType('integer');
        break;
      case 0x04:
        setVal(instruction.float?.toString() || '');
        setType('float');
        break;
      case 0x05:
        setVal('"'+instruction.string ? instruction.string : ''+'"');
        setType('string');
        break;
      case 0x06:
        setVal(instruction.object?.toString());
        setType('object');
        break;
      case 0x10:
        setVal('');
        setType('effect');
        break;
      case 0x11:
        setVal('');
        setType('event');
        break;
      case 0x12:
        setVal('');
        setType('location');
        break;
      case 0x13:
        setVal('');
        setType('talent');
        break;
      case 0x14:
        setVal('');
        setType('vector');
        break;
      case 0x24:
        setVal('');
        setType('structure');
        break;
      case 0xFF:
        setVal('');
        setType('action');
        break;
    }
  }, [props.instruction]);

  return (val ? (<>
    <b className={`instruction-value ${type}`}>{val}</b>
  </>) : <></>)
}

const InstructionOffset = (props: {instance: KotOR.NWScriptInstance, instruction: KotOR.NWScriptInstruction}) => {
  const {instance, instruction} = props;
  const [address, setAddress] = useState(instruction.intToHex(instruction.offset + instruction.address, 8));
  const onClick = () => {
    console.log("Seeking to", instruction.intToHex(instruction.offset + instruction.address, 8));
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

const InstructionNode = (props: {instance: KotOR.NWScriptInstance, instruction: KotOR.NWScriptInstruction}) => {
  const {instruction, instance} = props;

  const [isBreakpoint, setIsBreakpoint] = useState(instance?.breakPoints.has(instruction.address) || false);
  const [isSeeked, setIsSeeked] = useState(instance?.seek == instruction.address);

  useEffect(() => {
    setIsBreakpoint(instance?.breakPoints.has(instruction.address) || false);
    setIsSeeked(instance?.seek == instruction.address);
  }, [instance]);

  useEffect(() => {
    setIsBreakpoint(instance?.breakPoints.has(instruction.address) || false);
    setIsSeeked(instance?.seek == instruction.address);
  }, [instruction]);

  const callToggleBreakpoint = () => {
    if(!instance) return;
    console.log("Toggling breakpoint", instance.uuid, instruction.address);
    instance.toggleBreakpoint(instruction.address);
    setIsBreakpoint(instance?.breakPoints.has(instruction.address) || false);
  }

  return (
    <li className={`instruction-node ${isBreakpoint ? 'breakpoint' : ''} ${isSeeked ? 'seeked' : ''}`}  key={instance?.uuid +'-'+instruction.address_hex} id={instruction.address_hex}>
      <div className="breakpoint-clicker" title="Toggle breakpoint" onClick={() => {
        callToggleBreakpoint();
      }}></div>
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
      {/* Display the offset if the instruction is a jump */}
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

export const ScriptInstanceWindow = () => {
  const appContext = useApp();
  const stateRef = appContext.stateRef;
  const sendMessageHelper = appContext.sendMessageHelper;
  const [instance, setInstance] = useState<KotOR.NWScriptInstance>();
  const [instructions, setInstructions] = useState<KotOR.NWScriptInstruction[]>([]);
  const [breakpointMap, setBreakpointMap] = useState<Map<number, boolean>>(new Map());

  const [render, rerender] = useState<boolean>(false);

  useEffect(() => {
    console.log("Instance changed", instance?.uuid);  
    rerender(!render);
  }, [breakpointMap]);

  useEffect(() => {
    if(!instance) return;
    setInstructions([...instance.instructions.values()]);
  }, [instance]);

  const onStateInstanceUpdate = (inst: KotOR.NWScriptInstance) => {
    const oldInst = instance;
    setInstance(inst);
    setInstructions([...inst.instructions.values()]);
    setBreakpointMap(new Map(inst.breakPoints));
    if(oldInst?.uuid == inst.uuid){
      rerender(!render);
    }
  };

  const onSelectedInstance = (inst: KotOR.NWScriptInstance) => {
    const oldInst = instance;
    setInstance(inst);
    setInstructions([...inst.instructions.values()]);
    setBreakpointMap(new Map(inst.breakPoints));
  }

  useEffect(() => {
    const appState = stateRef.current;

    appState.addEventListener('instance-updated', onStateInstanceUpdate);
    appState.addEventListener('selected-instance', onSelectedInstance);
    return () => {
      appState.removeEventListener('instance-updated', onStateInstanceUpdate);
      appState.removeEventListener('selected-instance', onSelectedInstance);
    };
  }, []);

  const btnPauseResume = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.ContinueScript);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepOver = () => {
    const message = new KotOR.GameState.Debugger.IPCMessage(IPCMessageType.StepOverInstruction);
    sendMessageHelper(message.toBuffer());
  }

  const btnStepIn = () => {
    console.log("todo: Step In");
  }

  const btnStepOut = () => {
    console.log("todo: Step Out");
  }

  const btnClearBreakpoints = () => {
    console.log("todo: Clear Breakpoints");
  }

  // const unusedButtons = (
  //   <button className="btn btn-primary debugger-button" onClick={btnStepIn} title="Step Into Instruction">
  //     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
  //       {/* <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
  //       <path d="M2 334.5c-3.8 8.8-2 19 4.6 26l136 144c4.5 4.8 10.8 7.5 17.4 7.5s12.9-2.7 17.4-7.5l136-144c6.6-7 8.4-17.2 4.6-26s-12.5-14.5-22-14.5l-72 0 0-288c0-17.7-14.3-32-32-32L128 0C110.3 0 96 14.3 96 32l0 288-72 0c-9.6 0-18.2 5.7-22 14.5z"/>
  //     </svg>
  //   </button>
  //   <button className="btn btn-primary debugger-button" onClick={btnStepOut} title="Step Out of Instruction">
  //     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
  //       {/* <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
  //       <path d="M318 177.5c3.8-8.8 2-19-4.6-26l-136-144C172.9 2.7 166.6 0 160 0s-12.9 2.7-17.4 7.5l-136 144c-6.6 7-8.4 17.2-4.6 26S14.4 192 24 192l72 0 0 288c0 17.7 14.3 32 32 32l64 0c17.7 0 32-14.3 32-32l0-288 72 0c9.6 0 18.2-5.7 22-14.5z"/>
  //     </svg>
  //   </button>
  // );

  return (
    <div className="script-debugger-instance">
      <div className="title">
        <span>Instance: {instance ? (instance.name + ' | ' + instance.uuid) : ''}</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <ul className="instruction-list">
            {instance ? (
              instructions.map((instruction) => (
                <InstructionNode instance={instance} instruction={instruction} key={instance.uuid +'-'+instruction.address_hex} />
              ))
            ) : <></>}
          </ul>
          {instance ? (
            <div className="debugger-buttons">
              <button className="btn btn-primary debugger-button" onClick={btnPauseResume} title="Pause / Resume Execution">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  {/* <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
                  <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnStepOver} title="Step Over Instruction">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  {/* <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
                  <path d="M386.3 160L336 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-128c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z"/>
                </svg>
              </button>
              <button className="btn btn-primary debugger-button" onClick={btnClearBreakpoints} title="Clear Breakpoints">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  {/* <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
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