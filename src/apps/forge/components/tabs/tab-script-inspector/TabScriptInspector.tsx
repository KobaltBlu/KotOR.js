import React, { useState } from "react";
import * as KotOR from "../../../KotOR";
import { TabTextEditorState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { OP_CONST, OP_CPDOWNBP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPTOPSP, OP_JMP, OP_JNZ, OP_JSR, OP_JZ, OP_MOVSP } from "../../../../../nwscript/NWScriptOPCodes";
import { MenuBar, MenuItem } from "../../common/MenuBar";

export const TabScriptInspector = function(props: any){
  const parentTab: TabTextEditorState = props.parentTab;

  const [instructions, setInstructions] = useState<KotOR.NWScriptInstruction[]>([]);

  const offset = 13;

  const onCompile = () => {
    // console.log('onCompile');
    const script = new KotOR.NWScript(parentTab.ncs);
    setInstructions([...script.instructions.values()]);
  };

  const onCopyAssemblyToClipboard = async () => {
    try {
      const assemblyText = instructions
        .map(instruction => instruction.toAssemblyString())
        .join('\n');
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(assemblyText);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = assemblyText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy assembly to clipboard:', err);
    }
  };

  useEffectOnce( () => {
    parentTab.addEventListener('onCompile', onCompile);
    return () => {
      parentTab.removeEventListener('onCompile', onCompile);
    }
  });

  const menuItems: MenuItem[] = [
    {
      label: 'Options',
      children: [
        {
          label: 'Copy Assembly to Clipboard',
          onClick: onCopyAssemblyToClipboard,
          disabled: instructions.length === 0
        }
      ]
    }
  ];

  return (
    <div className="tab-pane-content scroll-y log-list bg-dark" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MenuBar items={menuItems} />
      <div style={{ 
        position: 'absolute',
        top: '24px',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto'
      }}>
        <table className="table table-stripped text-light" style={{width: `auto`, fontFamily: `'Courier New', monospace`, whiteSpace: `pre`}}>
        <thead>
          <tr>
            <th>Address</th>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Code Label</th>
            <th style={{ width: '100%' }}>Assembly</th>
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
    </div>
  )
}

