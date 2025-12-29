import React, { useState } from "react";
import * as KotOR from "../../../KotOR";
import { TabTextEditorState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";

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
      <table className="table table-stripped text-light" style={{width: `auto`}}>
        <thead>
          <tr>
            <th>Address</th>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Code Label</th>
          </tr>
        </thead>
        <tbody>
          {
            instructions.map( (instruction) => {
              const address = ('000000000' + (parseInt(instruction.address as any, 16) + offset).toString(16).toUpperCase()).substr(-8);
              const code_hex = instruction.code_hex.toUpperCase();
              const type_hex = instruction.type_hex.toUpperCase();
              let value = ``;

              if(instruction.code == 4){
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
                </tr>
              )
            })
          }
        </tbody>
      </table>
    </div>
  )
}

