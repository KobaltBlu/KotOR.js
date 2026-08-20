import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"

import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabTwoDAEditorState } from "@/apps/forge/states/tabs";
import { ForgeFindDialog, ForgeFindMode, ForgeProgress } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { TwoDAEditorRow, TwoDASearchMatch } from "@/apps/forge/components/TwoDAEditorRow";
import { TwoDAEditorColumnHeader } from "@/apps/forge/components/TwoDAEditorColumnHeader";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { useContextMenu, ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";

import { forgeTwoDASettings } from "@/apps/forge/settings/forgeEditorsSettings";

import "@/apps/forge/components/tabs/tab-twoda-editor/TabTwoDAEditor.scss";
import * as KotOR from "@/apps/forge/KotOR";

function createEmptyRow(twoDAObject: KotOR.TwoDAObject, index: number): any {
  const newRow: any = { __index: index, __rowlabel: String(index) };
  for(let i = 1; i < twoDAObject.columns.length; i++){
    newRow[twoDAObject.columns[i]] = '****';
  }
  return newRow;
}

function cloneRow(source: any, index: number): any {
  const cloned = JSON.parse(JSON.stringify(source));
  cloned.__index = index;
  cloned.__rowlabel = String(index);
  return cloned;
}

function rebuildRows(twoDAObject: KotOR.TwoDAObject, rows: any[]): void {
  twoDAObject.rows = {};
  rows.forEach((row, i) => {
    row.__index = i;
    row.__rowlabel = String(i);
    twoDAObject.rows[i] = row;
  });
  twoDAObject.RowCount = rows.length;
  twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
}

function collectRows(twoDAObject: KotOR.TwoDAObject): any[] {
  return Object.keys(twoDAObject.rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map((key) => twoDAObject.rows[key]);
}

function cellContains(value: string, query: string, caseSensitive: boolean): boolean {
  if(!query) return false;
  if(caseSensitive) return value.includes(query);
  return value.toLowerCase().includes(query.toLowerCase());
}

function replaceInCell(value: string, query: string, replacement: string, caseSensitive: boolean): string {
  if(!query) return value;
  if(caseSensitive){
    return value.split(query).join(replacement);
  }
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let result = '';
  let cursor = 0;
  let idx = lowerValue.indexOf(lowerQuery, cursor);
  while(idx !== -1){
    result += value.slice(cursor, idx) + replacement;
    cursor = idx + query.length;
    idx = lowerValue.indexOf(lowerQuery, cursor);
  }
  result += value.slice(cursor);
  return result;
}

function computeSearchMatches(
  twoDAObject: KotOR.TwoDAObject,
  query: string,
  showRowLabel: boolean,
  caseSensitive: boolean,
): TwoDASearchMatch[] {
  const q = query.trim();
  if(!q) return [];
  const matches: TwoDASearchMatch[] = [];
  for(let r = 0; r < twoDAObject.RowCount; r++){
    const row = twoDAObject.rows[r];
    if(!row) continue;
    for(const column of twoDAObject.columns){
      if(column === '__rowlabel' && !showRowLabel) continue;
      const value = String(row[column] ?? '');
      if(cellContains(value, q, caseSensitive)){
        matches.push({ row: r, column });
      }
    }
  }
  return matches;
}

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<KotOR.TwoDAObject>();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
  const [selectedColumn, setSelectedColumn] = useState<string | undefined>(undefined);
  const [dataVersion, setDataVersion] = useState<number>(0);
  // Incremented whenever undo/redo stacks change so the menu re-renders with
  // correct disabled states for Undo / Redo.
  const [historyVersion, setHistoryVersion] = useState<number>(0);
  const [tableSettings, setTableSettings] = useState(() => forgeTwoDASettings.get());
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<ForgeFindMode>("find");
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [filterRows, setFilterRows] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  // Tracks the last (rowIndex, column) for which a snapshot was captured so
  // that navigating within the same cell doesn't produce duplicate snapshots.
  const lastUndoKey = useRef<string | null>(null);
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const tab = props.tab as TabTwoDAEditorState;

  const markDirty = useCallback(() => {
    if(tab.file) tab.file.unsaved_changes = true;
    setUnsaved(true);
  }, [tab]);

  const bumpHistory = useCallback(() => {
    setHistoryVersion(v => v + 1);
  }, []);

  const onFileLoad = () => {
    // Reset undo-key tracking so the next cell focus always captures a fresh
    // snapshot (important after undo/redo/import).
    lastUndoKey.current = null;
    setTwoDAObject(tab.twoDAObject);
    setDataVersion(v => v + 1);
    setSelectedRowIndex(-1);
    setSelectedColumn(undefined);
    setHistoryVersion(v => v + 1);
    setSearchMatchIndex(0);
    setUnsaved(!!tab.file?.unsaved_changes);
  };

  useEffectOnce(() => {
    const onSaved = () => setUnsaved(false);
    tab.addEventListener('onEditorFileLoad', onFileLoad);
    tab.addEventListener('onEditorFileSaved', onSaved);
    const onTableSettings = () => setTableSettings(forgeTwoDASettings.get());
    forgeTwoDASettings.addListener(onTableSettings);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onFileLoad);
      tab.removeEventListener('onEditorFileSaved', onSaved);
      forgeTwoDASettings.removeListener(onTableSettings);
    };
  });

  const searchMatches = useMemo(() => {
    if(!twoDAObject) return [] as TwoDASearchMatch[];
    return computeSearchMatches(twoDAObject, searchQuery, tableSettings.showRowLabel, caseSensitive);
  }, [twoDAObject, searchQuery, tableSettings.showRowLabel, caseSensitive, dataVersion]);

  const matchingRowIndices = useMemo(() => {
    const rows = new Set<number>();
    for(const match of searchMatches){
      rows.add(match.row);
    }
    return rows;
  }, [searchMatches]);

  const currentMatch = searchMatches.length
    ? searchMatches[Math.min(searchMatchIndex, searchMatches.length - 1)]
    : undefined;

  useEffect(() => {
    if(searchMatchIndex >= searchMatches.length){
      setSearchMatchIndex(searchMatches.length ? searchMatches.length - 1 : 0);
    }
  }, [searchMatches.length, searchMatchIndex]);

  useEffect(() => {
    if(!currentMatch || !tableAreaRef.current) return;
    const escapedCol = (typeof CSS !== 'undefined' && CSS.escape)
      ? CSS.escape(currentMatch.column)
      : currentMatch.column.replace(/"/g, '\\"');
    const cell = tableAreaRef.current.querySelector(
      `tbody tr[data-row-index="${currentMatch.row}"] td[data-column="${escapedCol}"]`
    ) as HTMLElement | null;
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [currentMatch, dataVersion, filterRows, searchQuery]);

  const goToMatch = useCallback((index: number) => {
    if(!searchMatches.length) return;
    const next = ((index % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(next);
    const match = searchMatches[next];
    setSelectedRowIndex(match.row);
    setSelectedColumn(match.column);
  }, [searchMatches]);

  const nextSearchMatch = useCallback(() => {
    goToMatch(searchMatchIndex + 1);
  }, [goToMatch, searchMatchIndex]);

  const prevSearchMatch = useCallback(() => {
    goToMatch(searchMatchIndex - 1);
  }, [goToMatch, searchMatchIndex]);

  const openFind = useCallback((mode: ForgeFindMode = "find") => {
    setFindMode(mode);
    setFindOpen(true);
  }, []);

  const onCellSelected = (_row: any, cell: any, rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setSelectedColumn(typeof cell === 'string' ? cell : undefined);
  };

  // Called by TwoDAEditorRow when a non-readonly cell receives focus.
  // Captures a snapshot the first time a distinct (row, column) is focused;
  // moving back to the same cell without editing doesn't add an extra entry.
  const onBeforeEdit = useCallback((rowIndex: number, column: string) => {
    const key = `${rowIndex}:${column}`;
    if(lastUndoKey.current === key) return;
    lastUndoKey.current = key;
    tab.captureUndoSnapshot();
    bumpHistory();
  }, [tab, bumpHistory]);

  // Called by TwoDAEditorRow after a cell value is committed (blur).
  // Clears the key so re-focusing the same cell creates a new snapshot.
  const onAfterEdit = useCallback(() => {
    lastUndoKey.current = null;
    markDirty();
  }, [markDirty]);

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

  const onAddRow = useCallback(() => {
    if(!twoDAObject) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const newIndex = twoDAObject.RowCount;
    twoDAObject.rows[newIndex] = createEmptyRow(twoDAObject, newIndex);
    twoDAObject.RowCount++;
    twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    setSelectedRowIndex(newIndex);
    setSelectedColumn(undefined);
  }, [twoDAObject, tab, markDirty, bumpHistory]);

  const onDeleteRow = useCallback((rowIndex = selectedRowIndex) => {
    if(!twoDAObject || rowIndex < 0) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    delete twoDAObject.rows[rowIndex];
    rebuildRows(twoDAObject, collectRows(twoDAObject));
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    setSelectedRowIndex(Math.min(rowIndex, twoDAObject.RowCount - 1));
    setSelectedColumn(undefined);
  }, [twoDAObject, selectedRowIndex, tab, markDirty, bumpHistory]);

  const onDuplicateRow = useCallback((rowIndex = selectedRowIndex) => {
    if(!twoDAObject || rowIndex < 0) return;
    const source = twoDAObject.rows[rowIndex];
    if(!source) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const rows = collectRows(twoDAObject);
    rows.splice(rowIndex + 1, 0, cloneRow(source, rowIndex + 1));
    rebuildRows(twoDAObject, rows);
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    setSelectedRowIndex(rowIndex + 1);
    setSelectedColumn(undefined);
  }, [twoDAObject, selectedRowIndex, tab, markDirty, bumpHistory]);

  const onInsertRow = useCallback((atIndex: number) => {
    if(!twoDAObject || atIndex < 0) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const rows = collectRows(twoDAObject);
    rows.splice(atIndex, 0, createEmptyRow(twoDAObject, atIndex));
    rebuildRows(twoDAObject, rows);
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    setSelectedRowIndex(atIndex);
    setSelectedColumn(undefined);
  }, [twoDAObject, tab, markDirty, bumpHistory]);

  const onReplaceCurrent = useCallback(() => {
    if(!twoDAObject || !currentMatch) return;
    const row = twoDAObject.rows[currentMatch.row];
    if(!row || currentMatch.column === '__rowlabel'){
      nextSearchMatch();
      return;
    }
    const query = searchQuery.trim();
    if(!query) return;
    const before = String(row[currentMatch.column] ?? '');
    const after = replaceInCell(before, query, replaceValue, caseSensitive);
    if(before === after){
      nextSearchMatch();
      return;
    }
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    row[currentMatch.column] = after;
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    // After rematch, advance to the next remaining occurrence.
    setTimeout(() => nextSearchMatch(), 0);
  }, [twoDAObject, currentMatch, searchQuery, replaceValue, caseSensitive, tab, markDirty, bumpHistory, nextSearchMatch]);

  const onReplaceAll = useCallback(() => {
    if(!twoDAObject) return;
    const query = searchQuery.trim();
    if(!query || !searchMatches.length) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    for(const match of searchMatches){
      if(match.column === '__rowlabel') continue;
      const row = twoDAObject.rows[match.row];
      if(!row) continue;
      const before = String(row[match.column] ?? '');
      row[match.column] = replaceInCell(before, query, replaceValue, caseSensitive);
    }
    markDirty();
    setDataVersion(v => v + 1);
    bumpHistory();
    setSearchMatchIndex(0);
  }, [twoDAObject, searchQuery, searchMatches, replaceValue, caseSensitive, tab, markDirty, bumpHistory]);

  const onRowContextMenu = useCallback((e: React.MouseEvent, rowIndex: number) => {
    const items: ContextMenuItem[] = [
      {
        id: 'insert-above',
        label: 'Insert Row Above',
        onClick: () => onInsertRow(rowIndex),
      },
      {
        id: 'insert-below',
        label: 'Insert Row Below',
        onClick: () => onInsertRow(rowIndex + 1),
      },
      {
        id: 'duplicate',
        label: 'Duplicate Row',
        shortcut: 'Ctrl+D',
        onClick: () => onDuplicateRow(rowIndex),
      },
      { id: 'sep-1', separator: true },
      {
        id: 'delete',
        label: 'Delete Row',
        shortcut: 'Del',
        onClick: () => onDeleteRow(rowIndex),
      },
    ];
    showContextMenu(e.clientX, e.clientY, items);
  }, [onInsertRow, onDuplicateRow, onDeleteRow, showContextMenu]);

  const handleEditorKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable;
    const inFindDialog = !!target?.closest?.('.forge-find-dialog');

    if((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')){
      e.preventDefault();
      openFind('find');
      return;
    }

    if((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'h' || e.key === 'H')){
      e.preventDefault();
      openFind('replace');
      return;
    }

    if(inFindDialog){
      return;
    }

    if(inField){
      return;
    }

    if(e.key === 'Delete' || e.key === 'Backspace'){
      if(selectedRowIndex >= 0){
        e.preventDefault();
        onDeleteRow(selectedRowIndex);
      }
      return;
    }

    if((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'd'){
      if(selectedRowIndex >= 0){
        e.preventDefault();
        onDuplicateRow(selectedRowIndex);
      }
    }
  }, [openFind, selectedRowIndex, onDeleteRow, onDuplicateRow]);

  // Keep key handler closure fresh without re-binding every render.
  const keyHandlerRef = useRef(handleEditorKeyDown);
  keyHandlerRef.current = handleEditorKeyDown;
  useEffectOnce(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current(e);
    tab.addEventListener('onKeyDown', onKeyDown);
    return () => {
      tab.removeEventListener('onKeyDown', onKeyDown);
    };
  });

  const matchLabel = searchMatches.length
    ? `${Math.min(searchMatchIndex, searchMatches.length - 1) + 1}/${searchMatches.length}`
    : searchQuery.trim() ? '0/0' : '';

  const visibleRowEntries = useMemo(() => {
    if(!twoDAObject) return [] as [string, any][];
    const entries = Object.entries(twoDAObject.rows) as [string, any][];
    if(filterRows && searchQuery.trim()){
      return entries.filter(([key, row]) => {
        const idx = typeof row.__index === 'number' ? row.__index : Number(key);
        return matchingRowIndices.has(idx);
      });
    }
    return entries;
  }, [twoDAObject, filterRows, searchQuery, matchingRowIndices, dataVersion]);

  const matchesByRow = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for(const match of searchMatches){
      let set = map.get(match.row);
      if(!set){
        set = new Set();
        map.set(match.row, set);
      }
      set.add(match.column);
    }
    return map;
  }, [searchMatches]);

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
          label: 'Find...',
          shortcut: 'Ctrl+F',
          onClick: () => openFind('find'),
          disabled: !twoDAObject,
        },
        {
          label: 'Find & Replace...',
          shortcut: 'Ctrl+H',
          onClick: () => openFind('replace'),
          disabled: !twoDAObject,
        },
        { separator: true },
        {
          label: 'Add Row',
          onClick: onAddRow,
          disabled: !twoDAObject,
        },
        {
          label: 'Insert Row Above',
          onClick: () => onInsertRow(selectedRowIndex),
          disabled: !twoDAObject || selectedRowIndex < 0,
        },
        {
          label: 'Insert Row Below',
          onClick: () => onInsertRow(selectedRowIndex + 1),
          disabled: !twoDAObject || selectedRowIndex < 0,
        },
        {
          label: 'Duplicate Row',
          shortcut: 'Ctrl+D',
          onClick: () => onDuplicateRow(),
          disabled: !twoDAObject || selectedRowIndex < 0,
        },
        {
          label: 'Delete Row',
          shortcut: 'Del',
          onClick: () => onDeleteRow(),
          disabled: !twoDAObject || selectedRowIndex < 0,
        },
      ]
    },
  ];

  void historyVersion;

  if(!twoDAObject){
    return (
      <div className="tab-twoda-editor" style={{
        display: 'flex',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>
          <ForgeProgress striped animated={true} value={100} label={`Loading...`} style={{
            minWidth: '300px',
            minHeight: '25px',
          }}/>
        </div>
      </div>
    );
  }

  const dataColumnCount = Math.max(0, twoDAObject.columns.length - (tableSettings.showRowLabel ? 0 : 1));
  const statusDims = filterRows && searchQuery.trim()
    ? `${visibleRowEntries.length}/${twoDAObject.RowCount} rows × ${dataColumnCount} cols`
    : `${twoDAObject.RowCount} rows × ${dataColumnCount} cols`;
  const statusSelection = selectedRowIndex >= 0
    ? (selectedColumn
      ? `row ${selectedRowIndex} · ${selectedColumn === '__rowlabel' ? 'ID' : selectedColumn}`
      : `row ${selectedRowIndex}`)
    : 'No selection';
  const hasQuery = !!searchQuery.trim();
  const noMatches = hasQuery && searchMatches.length === 0;

  return (
    <div className="tab-twoda-editor">
      <input ref={importRef} type="file" accept=".csv" style={{display: 'none'}} onChange={onImportCSV} />
      <MenuBar items={menuItems} />

      <div className="twoda-body">
        <div className="twoda-table-area" ref={tableAreaRef}>
          <table className={`twoda${tableSettings.wrapCells ? " twoda--wrap" : ""}`}>
            <thead>
              <tr>
                {
                  twoDAObject.columns.map((column: string, cIndex: number) => (
                    column === "__rowlabel" && !tableSettings.showRowLabel ? null : (
                      <TwoDAEditorColumnHeader key={cIndex} twoDAObject={twoDAObject} column={column} />
                    )
                  ))
                }
              </tr>
            </thead>
            <tbody>
              {
                visibleRowEntries.map((row_parts: [string, any]) => {
                  const row: any = row_parts[1];
                  const rIndex: number = typeof row.__index === 'number' ? row.__index : Number(row_parts[0]);
                  const rowMatches = matchesByRow.get(rIndex);
                  const isCurrentRow = currentMatch?.row === rIndex;
                  return (
                    <TwoDAEditorRow
                      key={`row-${rIndex}-${dataVersion}`}
                      selected={rIndex === selectedRowIndex}
                      onCellSelected={onCellSelected}
                      onBeforeEdit={onBeforeEdit}
                      onAfterEdit={onAfterEdit}
                      onRowContextMenu={onRowContextMenu}
                      row={row}
                      index={rIndex}
                      twoDAObject={twoDAObject}
                      showRowLabel={tableSettings.showRowLabel}
                      matchColumns={rowMatches}
                      currentMatchColumn={isCurrentRow ? currentMatch?.column : undefined}
                    />
                  );
                })
              }
            </tbody>
          </table>
        </div>

        <div className="twoda-statusbar">
          <span>{statusDims}</span>
          <span>{statusSelection}</span>
          {unsaved ? <span className="twoda-statusbar__unsaved">Unsaved changes</span> : null}
        </div>
      </div>

      <ForgeFindDialog
        show={findOpen}
        onHide={() => setFindOpen(false)}
        mode={findMode}
        onModeChange={setFindMode}
        allowReplace
        findValue={searchQuery}
        onFindValueChange={(value) => {
          setSearchQuery(value);
          setSearchMatchIndex(0);
        }}
        replaceValue={replaceValue}
        onReplaceValueChange={setReplaceValue}
        matchLabel={matchLabel || (noMatches ? 'No matches' : '')}
        caseSensitive={caseSensitive}
        onCaseSensitiveChange={setCaseSensitive}
        extras={(
          <ForgeCheckbox
            label="Filter rows"
            value={filterRows}
            onChange={setFilterRows}
          />
        )}
        onFindNext={nextSearchMatch}
        onFindPrev={prevSearchMatch}
        onReplace={onReplaceCurrent}
        onReplaceAll={onReplaceAll}
        findNextDisabled={!searchMatches.length}
        findPrevDisabled={!searchMatches.length}
        replaceDisabled={!currentMatch}
        replaceAllDisabled={!searchMatches.length}
      />

      {ContextMenuComponent}
    </div>
  );
}
