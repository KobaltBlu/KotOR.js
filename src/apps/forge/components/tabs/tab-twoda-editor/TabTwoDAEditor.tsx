import React, { useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"

import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabTwoDAEditorState } from "../../../states/tabs";
import { ProgressBar } from "react-bootstrap";
import { TwoDAEditorRow } from "../../TwoDAEditorRow";
import { TwoDAEditorColumnHeader } from "../../TwoDAEditorColumnHeader";

import * as KotOR from "../../../KotOR";

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<KotOR.TwoDAObject>();
  const [selectedRowIndex, setSelectedRowIndex] = useState<any>(-1);

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

  const onClickRow = (e: React.MouseEvent<any>, rowIndex: string = '0') => {
    setSelectedRowIndex(rowIndex);
  }

  const onCellSelected = (row: any, cell: any, rowIndex: any) => {
    setSelectedRowIndex(rowIndex);
  }

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
              Object.entries(twoDAObject.rows).map( (row_parts: any[], rIndex: number) => {
                const row: any = row_parts[1];
                return (
                  <TwoDAEditorRow key={`row-${rIndex * twoDAObject.ColumnCount}`} selected={rIndex == selectedRowIndex} onCellSelected={onCellSelected} row={row} index={rIndex} twoDAObject={twoDAObject} onClick={onClickRow}></TwoDAEditorRow>
                )
              })
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

