import React, { useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"

import type { TwoDAObject } from "../../../../resource/TwoDAObject";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabTwoDAEditorState } from "../../states/tabs/TabTwoDAEditorState";
import { ProgressBar } from "react-bootstrap";

declare const KotOR: any;

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<TwoDAObject>();

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

  return (
    (!!twoDAObject) ? (
      <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'auto'}}>
        <table className="twoda">
          <thead>
            <tr>
              {
                twoDAObject.columns.map( (column: string, cIndex: number) => {
                  return (
                    <th key={cIndex}>
                      {column}
                    </th>
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
                  <TwoDAEditorRow key={`row-${rIndex * twoDAObject.ColumnCount}`} row={row} index={rIndex} twoDAObject={twoDAObject}></TwoDAEditorRow>
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

export const TwoDAEditorRow = function(props: any){
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject = props.twoDAObject;
  const row = props.row;
  const rIndex = props.index;

  const onCellChange = (row: any, column: string, value: any,) => {
    // console.log('change', column, value);
    row[column] = value;
    rerender(!render);
  };

  return (
    <tr tabIndex={rIndex * twoDAObject.ColumnCount}>
      {
        twoDAObject.columns.map( (column: string, cIndex: number) => {
          const value: string = row[column];
          return (
            <td 
              key={`cell-${(rIndex * twoDAObject.ColumnCount) + cIndex}`} 
              tabIndex={(rIndex * twoDAObject.ColumnCount) + cIndex} 
              contentEditable={true} 
              suppressContentEditableWarning={true}
              spellCheck={false}

              // onInput={
              //   (e: React.ChangeEvent<HTMLTableCellElement>) => {
              //     onCellChange(row, column, e.target.innerText);
              //   }
              // }

              onBlur={
                (e: React.ChangeEvent<HTMLTableCellElement>) => {
                  onCellChange(row, column, e.target.innerText);
                }
              }

              data-value={value}
            >{value}</td>
          )
        })
      }
    </tr>
  );

}
