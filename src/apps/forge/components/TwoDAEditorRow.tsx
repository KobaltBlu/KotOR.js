import React, { useState } from 'react';

import type * as KotOR from '@/apps/forge/KotOR';

export interface TwoDAEditorRowProps {
  selected: boolean;
  onCellSelected: (row: Record<string, string>, cell: string | undefined, rowIndex: number) => void;
  twoDAObject: KotOR.TwoDAObject;
  row: Record<string, string>;
  index: number;
}

export const TwoDAEditorRow: React.FC<TwoDAEditorRowProps> = (props) => {
  const selected = props.selected;
  const onCellSelectedCallback = props.onCellSelected;
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject = props.twoDAObject;
  const row = props.row;
  const rIndex = props.index;

  const onCellChange = (rowData: Record<string, string>, column: string, value: string) => {
    rowData[column] = value;
    rerender(!render);
  };

  const onClickRow = (_e: React.MouseEvent<HTMLTableRowElement>) => {
    onCellSelectedCallback(row, undefined, rIndex);
  };

  const onClickCell = (e: React.MouseEvent<HTMLTableCellElement>, cellName: string) => {
    onCellSelectedCallback(row, cellName, rIndex);
  };

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

              onBlur={(e: React.FocusEvent<HTMLTableCellElement>) => {
                onCellChange(row, column, (e.target as HTMLTableCellElement).innerText);
              }}

              data-value={value}
            >{value}</td>
          )
        })
      }
    </tr>
  );

}