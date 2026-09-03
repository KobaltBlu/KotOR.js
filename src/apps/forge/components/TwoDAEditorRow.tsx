import React, { memo, useEffect, useRef } from "react";

import * as KotOR from "@/apps/forge/KotOR";
import { isCellSelected, TwoDASelRange } from "@/apps/forge/helpers/twoDAEditorOps";

export interface TwoDASearchMatch {
  row: number;
  column: string;
}

export interface TwoDAEditorRowProps {
  twoDAObject: KotOR.TwoDAObject;
  row: any;
  index: number;
  visibleColumns: string[];
  activeRow: number;
  activeColumn?: string;
  editingColumn?: string | null;
  /** Selection ranges in visible-column index space. */
  ranges: TwoDASelRange[];
  matchColumns?: Set<string>;
  currentMatchColumn?: string;
  /** Remount cell inputs after structural data changes for this row. */
  dataVersionKey?: number;
  pendingEditChar?: string | null;
  onPendingEditCharConsumed?: () => void;
  onCellMouseDown: (
    e: React.MouseEvent,
    rowIndex: number,
    column: string,
    colIndex: number,
    isRowLabel: boolean,
  ) => void;
  onCellMouseEnter: (rowIndex: number, column: string, colIndex: number) => void;
  onCellDoubleClick: (rowIndex: number, column: string) => void;
  onBeforeEdit?: (rowIndex: number, column: string) => void;
  onAfterEdit?: () => void;
  onRowContextMenu?: (e: React.MouseEvent, rowIndex: number) => void;
  onEditingKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, column: string) => void;
}

function TwoDAEditorRowImpl(props: TwoDAEditorRowProps){
  const {
    twoDAObject,
    row,
    index: rIndex,
    visibleColumns,
    activeRow,
    activeColumn,
    editingColumn,
    ranges,
    matchColumns,
    currentMatchColumn,
    onCellMouseDown,
    onCellMouseEnter,
    onCellDoubleClick,
    onBeforeEdit,
    onAfterEdit,
    onRowContextMenu,
    onEditingKeyDown,
    dataVersionKey = 0,
    pendingEditChar,
    onPendingEditCharConsumed,
  } = props;

  const columnCount = twoDAObject.columns.length;
  const tdRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isActiveRow = activeRow === rIndex;

  useEffect(() => {
    if (editingColumn && isActiveRow) {
      const input = inputRefs.current[editingColumn];
      if (input) {
        if (pendingEditChar != null) {
          input.value = pendingEditChar;
          onPendingEditCharConsumed?.();
        }
        input.focus();
        if (pendingEditChar != null) {
          input.selectionStart = input.value.length;
          input.selectionEnd = input.value.length;
        } else {
          input.select();
        }
      }
    }
  }, [editingColumn, isActiveRow, pendingEditChar, onPendingEditCharConsumed]);

  const onCellBlur = (e: React.FocusEvent<HTMLInputElement>, column: string, cIndex: number) => {
    const value = e.target.value;
    row[column] = value;
    const td = tdRefs.current[cIndex];
    if (td) td.setAttribute("data-value", value);
    onAfterEdit?.();
  };

  const onContextMenu = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onRowContextMenu) return;
    e.preventDefault();
    onRowContextMenu(e, rIndex);
  };

  return (
    <tr
      className={[
        isActiveRow ? "focus" : "",
        rIndex % 2 === 0 ? "twoda-row-odd" : "",
      ].filter(Boolean).join(" ") || undefined}
      data-row-index={rIndex}
      onContextMenu={onContextMenu}
    >
      {visibleColumns.map((column, visibleColIndex) => {
        const cIndex = twoDAObject.columns.indexOf(column);
        const value: string = row[column] ?? "";
        const isRowLabel = column === "__rowlabel";
        const tabIdx = (rIndex * columnCount) + Math.max(0, cIndex);
        const isMatch = matchColumns?.has(column) ?? false;
        const isCurrentMatch = currentMatchColumn === column;
        const isSelected = isCellSelected(ranges, rIndex, visibleColIndex);
        const isActive = isActiveRow && activeColumn === column;
        const isEditing = isActiveRow && editingColumn === column && !isRowLabel;
        const className = [
          isRowLabel ? "cell-rowlabel" : "",
          isRowLabel ? "cell-sticky" : "",
          isMatch ? "cell-match" : "",
          isCurrentMatch ? "cell-match-current" : "",
          isSelected ? "cell-selected" : "",
          isActive ? "cell-active" : "",
        ].filter(Boolean).join(" ");

        return (
          <td
            key={`cell-${rIndex}-${column}`}
            data-value={value}
            data-column={column}
            className={className || undefined}
            ref={(el) => { tdRefs.current[cIndex] = el; }}
            onMouseDown={(e) => onCellMouseDown(e, rIndex, column, visibleColIndex, isRowLabel)}
            onMouseEnter={() => onCellMouseEnter(rIndex, column, visibleColIndex)}
            onDoubleClick={() => {
              if (!isRowLabel) onCellDoubleClick(rIndex, column);
            }}
          >
            <input
              ref={(el) => { inputRefs.current[column] = el; }}
              tabIndex={tabIdx}
              defaultValue={value}
              key={`${rIndex}-${column}-${dataVersionKey}`}
              readOnly={isRowLabel || !isEditing}
              spellCheck={false}
              onFocus={() => {
                if (!isRowLabel && isEditing) onBeforeEdit?.(rIndex, column);
              }}
              onBlur={(e) => {
                if (isEditing) onCellBlur(e, column, cIndex);
              }}
              onKeyDown={(e) => {
                if (isEditing) onEditingKeyDown?.(e, rIndex, column);
              }}
              onMouseDown={(e) => {
                if (!isEditing) {
                  e.preventDefault();
                }
              }}
            />
          </td>
        );
      })}
    </tr>
  );
}

export const TwoDAEditorRow = memo(TwoDAEditorRowImpl);
