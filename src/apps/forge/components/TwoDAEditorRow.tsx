import React, { useRef } from 'react';

import * as KotOR from '@/apps/forge/KotOR';

export const TwoDAEditorRow = function (props: any) {
  const twoDAObject: KotOR.TwoDAObject = props.twoDAObject;
  const row = props.row;
  const rIndex = props.index;
  const selected = props.selected as boolean;
  const onCellSelectedCallback = props.onCellSelected as Function;
  const onBeforeEdit = props.onBeforeEdit as ((rowIndex: number, column: string) => void) | undefined;
  const onAfterEdit = props.onAfterEdit as (() => void) | undefined;
  const columnCount = twoDAObject.ColumnCount;

  const tdRefs = useRef<(HTMLTableCellElement | null)[]>([]);

  const onCellBlur = (e: React.FocusEvent<HTMLInputElement>, column: string, cIndex: number) => {
    const value = e.target.value;
    row[column] = value;
    const td = tdRefs.current[cIndex];
    if (td) td.setAttribute('data-value', value);
    onAfterEdit?.();
  };

  const onCellFocus = (column: string, isRowLabel: boolean) => {
    if (!isRowLabel) onBeforeEdit?.(rIndex, column);
    onCellSelectedCallback(row, column, rIndex);
  };

  const onClickRow = (e: React.MouseEvent<HTMLTableRowElement>) => {
    onCellSelectedCallback(row, undefined, rIndex);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, cIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextTabIndex = (rIndex + 1) * columnCount + cIndex;
      const next = document.querySelector<HTMLInputElement>(`table.twoda input[tabindex="${nextTabIndex}"]`);
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rIndex > 0) {
        const prevTabIndex = (rIndex - 1) * columnCount + cIndex;
        const prev = document.querySelector<HTMLInputElement>(`table.twoda input[tabindex="${prevTabIndex}"]`);
        if (prev) prev.focus();
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        const nextTabIndex = rIndex * columnCount + cIndex + 1;
        const next = document.querySelector<HTMLInputElement>(`table.twoda input[tabindex="${nextTabIndex}"]`);
        if (next) next.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        e.preventDefault();
        const prevTabIndex = rIndex * columnCount + cIndex - 1;
        const prev = document.querySelector<HTMLInputElement>(`table.twoda input[tabindex="${prevTabIndex}"]`);
        if (prev) prev.focus();
      }
    }
  };

  return (
    <tr className={selected ? `focus` : ``} onClick={onClickRow}>
      {twoDAObject.columns.map((column: string, cIndex: number) => {
        const value: string = row[column] ?? '';
        const isRowLabel = column === '__rowlabel';
        const tabIdx = rIndex * columnCount + cIndex;
        return (
          <td
            key={`cell-${tabIdx}`}
            data-value={value}
            className={isRowLabel ? 'cell-rowlabel' : ''}
            ref={(el) => {
              tdRefs.current[cIndex] = el;
            }}
          >
            <input
              tabIndex={tabIdx}
              defaultValue={value}
              readOnly={isRowLabel}
              spellCheck={false}
              onFocus={() => onCellFocus(column, isRowLabel)}
              onBlur={(e) => onCellBlur(e, column, cIndex)}
              onKeyDown={(e) => onKeyDown(e, cIndex)}
            />
          </td>
        );
      })}
    </tr>
  );
};
