import React, { useCallback, useRef, useState } from "react"
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"

import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabTwoDAEditorState } from "@/apps/forge/states/tabs";
import { ProgressBar } from "react-bootstrap";
import { TwoDAEditorRow } from "@/apps/forge/components/TwoDAEditorRow";
import { TwoDAEditorColumnHeader } from "@/apps/forge/components/TwoDAEditorColumnHeader";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";

import * as KotOR from "@/apps/forge/KotOR";

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<KotOR.TwoDAObject>();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
  const [dataVersion, setDataVersion] = useState<number>(0);
  // Incremented whenever undo/redo stacks change so the menu re-renders with
  // correct disabled states for Undo / Redo.
  const [historyVersion, setHistoryVersion] = useState<number>(0);
  const importRef = useRef<HTMLInputElement>(null);
  // Tracks the last (rowIndex, column) for which a snapshot was captured so
  // that navigating within the same cell doesn't produce duplicate snapshots.
  const lastUndoKey = useRef<string | null>(null);

  const tab = props.tab as TabTwoDAEditorState;

  const onFileLoad = () => {
    // Reset undo-key tracking so the next cell focus always captures a fresh
    // snapshot (important after undo/redo/import).
    lastUndoKey.current = null;
    setTwoDAObject(tab.twoDAObject);
    setDataVersion(v => v + 1);
    setSelectedRowIndex(-1);
    setHistoryVersion(v => v + 1);
  };

  useEffectOnce(() => {
    tab.addEventListener('onEditorFileLoad', onFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onFileLoad);
    };
  });

  const onCellSelected = (_row: any, _cell: any, rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
  };

  // Called by TwoDAEditorRow when a non-readonly cell receives focus.
  // Captures a snapshot the first time a distinct (row, column) is focused;
  // moving back to the same cell without editing doesn't add an extra entry.
  const onBeforeEdit = useCallback((rowIndex: number, column: string) => {
    const key = `${rowIndex}:${column}`;
    if(lastUndoKey.current === key) return;
    lastUndoKey.current = key;
    tab.captureUndoSnapshot();
    setHistoryVersion(v => v + 1);
  }, [tab]);

  // Called by TwoDAEditorRow after a cell value is committed (blur).
  // Clears the key so re-focusing the same cell creates a new snapshot.
  const onAfterEdit = useCallback(() => {
    lastUndoKey.current = null;
  }, []);

  const onImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if(text) tab.importFromCSV(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onAddRow = () => {
    if(!twoDAObject) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const newIndex = twoDAObject.RowCount;
    const newRow: any = { __index: newIndex, __rowlabel: String(newIndex) };
    for(let i = 1; i < twoDAObject.columns.length; i++){
      newRow[twoDAObject.columns[i]] = '****';
    }
    twoDAObject.rows[newIndex] = newRow;
    twoDAObject.RowCount++;
    twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
    if(tab.file) tab.file.unsaved_changes = true;
    setDataVersion(v => v + 1);
    setHistoryVersion(v => v + 1);
    setSelectedRowIndex(newIndex);
  };

  const onDeleteRow = () => {
    if(!twoDAObject || selectedRowIndex < 0) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    delete twoDAObject.rows[selectedRowIndex];
    const remaining = Object.values(twoDAObject.rows) as any[];
    twoDAObject.rows = {};
    remaining.forEach((row, i) => {
      row.__index = i;
      row.__rowlabel = String(i);
      twoDAObject.rows[i] = row;
    });
    twoDAObject.RowCount = remaining.length;
    twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
    if(tab.file) tab.file.unsaved_changes = true;
    setDataVersion(v => v + 1);
    setHistoryVersion(v => v + 1);
    setSelectedRowIndex(Math.min(selectedRowIndex, remaining.length - 1));
  };

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        {
          label: 'Save',
          shortcut: 'Ctrl+S',
          onClick: () => { tab.save(); },
          disabled: !twoDAObject,
        },
        {
          label: 'Save As...',
          shortcut: 'Ctrl+Shift+S',
          onClick: () => { tab.saveAs(); },
          disabled: !twoDAObject,
        },
        { separator: true },
        {
          label: 'Import CSV...',
          onClick: () => { importRef.current?.click(); },
        },
        {
          label: 'Export CSV...',
          onClick: () => { tab.saveAs(); },
          disabled: !twoDAObject,
        },
      ]
    },
    {
      label: 'Edit',
      children: [
        {
          label: 'Undo',
          shortcut: 'Ctrl+Z',
          onClick: () => { tab.undo(); },
          disabled: !tab.canUndo,
        },
        {
          label: 'Redo',
          shortcut: 'Ctrl+Y',
          onClick: () => { tab.redo(); },
          disabled: !tab.canRedo,
        },
        { separator: true },
        {
          label: 'Add Row',
          onClick: onAddRow,
          disabled: !twoDAObject,
        },
        {
          label: 'Delete Row',
          onClick: onDeleteRow,
          disabled: !twoDAObject || selectedRowIndex < 0,
        },
      ]
    },
  ];

  if(!twoDAObject){
    return (
      <div style={{
        display: 'flex',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}>
        <div>
          <ProgressBar striped animated={true} now={100} label={`Loading...`} style={{
            minWidth: '300px',
            minHeight: '25px',
          }}/>
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={importRef} type="file" accept=".csv" style={{display: 'none'}} onChange={onImportCSV} />
      <MenuBar items={menuItems} />

      <div className="twoda-table-area">
        <table className="twoda">
          <thead>
            <tr>
              {
                twoDAObject.columns.map((column: string, cIndex: number) => (
                  <TwoDAEditorColumnHeader key={cIndex} twoDAObject={twoDAObject} column={column} />
                ))
              }
            </tr>
          </thead>
          <tbody>
            {
              Object.entries(twoDAObject.rows).map((row_parts: any[], rIndex: number) => {
                const row: any = row_parts[1];
                return (
                  <TwoDAEditorRow
                    key={`row-${rIndex}-${dataVersion}`}
                    selected={rIndex === selectedRowIndex}
                    onCellSelected={onCellSelected}
                    onBeforeEdit={onBeforeEdit}
                    onAfterEdit={onAfterEdit}
                    row={row}
                    index={rIndex}
                    twoDAObject={twoDAObject}
                  />
                );
              })
            }
          </tbody>
        </table>
      </div>
    </>
  );
}
