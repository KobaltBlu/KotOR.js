import React, { useState } from "react";

import * as KotOR from "../KotOR";


export const TwoDAEditorRow = function(props: any){
  let selected = props.selected as boolean;
  const onCellSelectedCallback = props.onCellSelected as Function;
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject: KotOR.TwoDAObject = props.twoDAObject;
  const row = props.row;
  const rIndex = props.index;

  const onCellChange = (row: any, column: string, value: any,) => {
    // console.log('change', column, value);
    row[column] = value;
    rerender(!render);
  };

  const onClickRow = (e: React.MouseEvent<HTMLTableRowElement>) => {
    onCellSelectedCallback(row, undefined, rIndex);
  }

  const onClickCell = (e: React.MouseEvent<HTMLTableCellElement>, cellName: string) => {
    onCellSelectedCallback(row, cellName, rIndex);
  }

  return (
    <tr className={selected ? `focus` : ``} tabIndex={rIndex * twoDAObject.ColumnCount} onClick={onClickRow}>
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
              onClick={(e) => onClickCell(e, column)}

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