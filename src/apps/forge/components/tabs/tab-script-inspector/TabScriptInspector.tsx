import React, { useState } from "react";
import * as KotOR from "../../../KotOR";
import { TabTextEditorState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { OP_CONST, OP_CPDOWNBP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPTOPSP, OP_JMP, OP_JNZ, OP_JSR, OP_JZ, OP_MOVSP } from "../../../../../nwscript/NWScriptOPCodes";

export const TabScriptInspector = function(props: any){
  const parentTab: TabTextEditorState = props.parentTab;

  const [instructions, setInstructions] = useState<KotOR.NWScriptInstruction[]>([]);

  const offset = 13;

  const onCompile = () => {
    // console.log('onCompile');
    const script = new KotOR.NWScript(parentTab.ncs);
    setInstructions([...script.instructions.values()]);
  };

  useEffectOnce( () => {
    parentTab.addEventListener('onCompile', onCompile);
    return () => {
      parentTab.removeEventListener('onCompile', onCompile);
    }
  });

  return (
    <div className="tab-pane-content scroll-y log-list bg-dark">
      <table className="table table-stripped text-light" style={{width: `auto`, fontFamily: `'Courier New', monospace`, whiteSpace: `pre`}}>
        <thead>
          <tr>
            <th>Address</th>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Code Label</th>
            <th>Assembly</th>
          </tr>
        </thead>
        <tbody>
          {
            instructions.map( (instruction) => {
              const address = ('000000000' + (parseInt(instruction.address as any, 16) + offset).toString(16).toUpperCase()).substr(-8);
              const code_hex = instruction.code_hex.toUpperCase();
              const type_hex = instruction.type_hex.toUpperCase();
              let value = ``;

              if(instruction.code == OP_CONST){
                switch(instruction.type){
                  case 3:
                    value = (instruction as any).integer;
                  break;
                  case 4:
                    value = (instruction as any).float;
                  break;
                  case 5:
                    value = `"${(instruction as any).string}"`;
                  break;
                  case 6:
                    value = (instruction as any).object;
                  break;
                  case 12:
                    value = ``;
                  break;
                  default:
                    console.warn('CONST', instruction.type, instruction);
                  break;
                }
              }else if(instruction.code == OP_MOVSP || instruction.code == OP_JMP || instruction.code == OP_JSR || instruction.code == OP_JZ || instruction.code == OP_JNZ){
                value = `${(instruction as any).offset}`;
              }else if(instruction.code == OP_CPTOPSP || instruction.code == OP_CPDOWNSP || instruction.code == OP_CPDOWNBP || instruction.code == OP_CPTOPBP){
                value = `${(instruction as any).offset}, ${(instruction as any).size}`;
              }

              // const padding = '                                  ';
              // const output = (`${address} ${code_hex} ${type_hex}` + padding).substr(0, 34);
              return (
                <tr key={instruction.address}>
                  <td>{address}</td>
                  <td>{code_hex}</td>
                  <td>{type_hex}</td>
                  <td>{value}</td>
                  <td>{KotOR.NWScriptByteCode[instruction.code]}</td>
                  <td>{instruction.toAssemblyString()}</td>
                </tr>
              )
            })
          }
        </tbody>
      </table>
    </div>
  )
}

