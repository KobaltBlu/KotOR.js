import React, { useState } from "react"
import { ProgressBar } from "react-bootstrap";

import { TwoDAEditorColumnHeader } from "@/apps/forge/components/TwoDAEditorColumnHeader";
import { TwoDAEditorRow } from "@/apps/forge/components/TwoDAEditorRow";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"
import * as KotOR from "@/apps/forge/KotOR";
import { TabTwoDAEditorState } from "@/apps/forge/states/tabs";

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<KotOR.TwoDAObject>();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);

  const onFileLoad = () => {
    const tab: TabTwoDAEditorState = props.tab as TabTwoDAEditorState;
    setTwoDAObject(tab.twoDAObject);
  }

  useEffectOnce( () => {
    const tab: TabTwoDAEditorState = props.tab as TabTwoDAEditorState;
    tab.addEventListener('onEditorFileLoad', onFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onFileLoad);
    }
  });

  const onCellSelected = (
    _row: Record<string, string>,
    _cell: string | undefined,
    rowIndex: number
  ) => {
    setSelectedRowIndex(rowIndex);
  };

  return (
    (twoDAObject) ? (
      <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'auto'}}>
        <table className="twoda">
          <thead>
            <tr>
              {
                twoDAObject.columns.map( (column: string, cIndex: number) => {
                  return (
                    <TwoDAEditorColumnHeader key={cIndex} twoDAObject={twoDAObject} column={column}></TwoDAEditorColumnHeader>
                  )
                })
              }
            </tr>
          </thead>
          <tbody>
            {
              Object.entries(twoDAObject.rows).map(([_, row], rIndex: number) => (
                <TwoDAEditorRow
                  key={`row-${rIndex * twoDAObject.ColumnCount}`}
                  selected={rIndex === selectedRowIndex}
                  onCellSelected={onCellSelected}
                  row={row as Record<string, string>}
                  index={rIndex}
                  twoDAObject={twoDAObject}
                />
              ))
            }
          </tbody>
        </table>
      </div>
    ) : (
      <div style={{
        display: 'flex', 
        textAlign: 'center', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%'
      }}>
        <div style={{}}>
          <ProgressBar striped animated={true} now={100}  label={`Loading...`} style={{
            minWidth: '300px',
            minHeight: '25px',
          }}/>
        </div>
      </div>
    )
  )
}

