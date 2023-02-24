import React, { useState } from "react";

import * as KotOR from "../KotOR";


export const TwoDAEditorRow = function(props: any){
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject: KotOR.TwoDAObject = props.twoDAObject;
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