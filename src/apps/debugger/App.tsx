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

  return (typeName?.length ? (<>
    <b>[{typeName}]</b>
  </>) : <></>)
}

const InstructionValue = (props: {instruction: KotOR.NWScriptInstruction}) => {
  const [val, setVal] = useState('');

  useEffect(() => {
    const instruction = props.instruction;
    switch(instruction.type){
      case 0x00:
        setVal('VOID');
        break;  
      case 0x03:
        setVal(instruction.integer.toString());
        break;
      case 0x04:
        setVal(instruction.float.toString());
        break;
      case 0x05:
        setVal(instruction.string);
        break;
      case 0x06:
        setVal(instruction.object.toString());
        break;
      case 0x10:
        setVal('EFFECT');
        break;
      case 0x11:
        setVal('EVENT');
        break;
      case 0x12:
        setVal('LOCATION');
        break;
      case 0x13:
        setVal('TALENT');
        break;
      case 0x14:
        setVal('VECTOR');
        break;
      case 0x24:
        setVal('STRUCTURE');
        break;
      case 0xFF:
        setVal('ACTION');
        break;
    }
  }, [props.instruction]);

  return (val ? (<>
    <b>[{val}]</b>
  </>) : <></>)
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
        <ul style={{fontFamily: 'monospace', fontSize: '12pt'}}>
          {selectedInstance ? (
            [...selectedInstance.instructions.values()].map((instruction) => (
              <li key={instruction.address}>{instruction.address_hex} - {instruction.codeName} - {instruction.action ? (<>
                <b>{instruction.actionDefinition?.name}</b>
              </>) : <></>}
              {instruction.code == 4 ? (<>
                <b><InstructionType type={instruction.type} /></b> <InstructionValue instruction={instruction} />
              </>) : <></>}</li>
            ))
          ) : <></>}
        </ul>
      </div>
    </div>
  </div>);
}