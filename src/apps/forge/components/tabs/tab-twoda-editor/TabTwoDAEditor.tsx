import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";

import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabTwoDAEditorState } from "@/apps/forge/states/tabs";
import {
  ForgeButton,
  ForgeDialog,
  ForgeFindDialog,
  ForgeFindMode,
  ForgeInput,
  ForgeProgress,
} from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { TwoDAEditorRow } from "@/apps/forge/components/TwoDAEditorRow";
import { TwoDAEditorColumnHeader } from "@/apps/forge/components/TwoDAEditorColumnHeader";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { useContextMenu, ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { forgeTwoDASettings } from "@/apps/forge/settings/forgeEditorsSettings";
import {
  addColumn,
  clearCellsInRanges,
  cloneRow,
  collectRows,
  computeSearchMatches,
  createEmptyRow,
  deleteColumn,
  getVisibleColumns,
  isCellSelected,
  makeAllRange,
  makeCellRange,
  makeRowRange,
  normalizeRange,
  parseTsv,
  pasteTsvAt,
  rangesToTsv,
  readClipboardText,
  rebuildRows,
  renameColumn,
  replaceInCell,
  selectionSummary,
  sortRowsByColumn,
  TwoDACellRef,
  TwoDASelRange,
  TwoDASortDir,
  writeClipboardText,
} from "@/apps/forge/helpers/twoDAEditorOps";

import "@/apps/forge/components/tabs/tab-twoda-editor/TabTwoDAEditor.scss";
import * as KotOR from "@/apps/forge/KotOR";

type ColumnDialogMode = "add" | "rename" | null;

export const TabTwoDAEditor = function(props: BaseTabProps){
  const [twoDAObject, setTwoDAObject] = useState<KotOR.TwoDAObject>();
  const [dataVersion, setDataVersion] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [tableSettings, setTableSettings] = useState(() => forgeTwoDASettings.get());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set());
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<ForgeFindMode>("find");
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [filterRows, setFilterRows] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [anchor, setAnchor] = useState<TwoDACellRef | null>(null);
  const [active, setActive] = useState<TwoDACellRef | null>(null);
  const [ranges, setRanges] = useState<TwoDASelRange[]>([]);
  const [editing, setEditing] = useState<TwoDACellRef | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TwoDASortDir | null>(null);
  const [goToOpen, setGoToOpen] = useState(false);
  const [goToInput, setGoToInput] = useState("");
  const [columnDialog, setColumnDialog] = useState<ColumnDialogMode>(null);
  const [columnDialogValue, setColumnDialogValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [pendingEditChar, setPendingEditChar] = useState<string | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const lastUndoKey = useRef<string | null>(null);
  const selectingRef = useRef(false);
  const selectAdditiveRef = useRef(false);
  const rangesRef = useRef(ranges);
  rangesRef.current = ranges;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const tab = props.tab as TabTwoDAEditorState;

  const markDirty = useCallback(() => {
    if (tab.file) tab.file.unsaved_changes = true;
    setUnsaved(true);
  }, [tab]);

  const bumpHistory = useCallback(() => setHistoryVersion((v) => v + 1), []);

  const clearSelectionState = useCallback(() => {
    setAnchor(null);
    setActive(null);
    setRanges([]);
    setEditing(null);
  }, []);

  const onFileLoad = () => {
    lastUndoKey.current = null;
    setTwoDAObject(tab.twoDAObject);
    setDataVersion((v) => v + 1);
    clearSelectionState();
    setHiddenColumns(new Set());
    setSortColumn(null);
    setSortDir(null);
    setHistoryVersion((v) => v + 1);
    setSearchMatchIndex(0);
    setUnsaved(!!tab.file?.unsaved_changes);
  };

  useEffectOnce(() => {
    const onSaved = () => setUnsaved(false);
    tab.addEventListener("onEditorFileLoad", onFileLoad);
    tab.addEventListener("onEditorFileSaved", onSaved);
    const onTableSettings = () => setTableSettings(forgeTwoDASettings.get());
    forgeTwoDASettings.addListener(onTableSettings);
    return () => {
      tab.removeEventListener("onEditorFileLoad", onFileLoad);
      tab.removeEventListener("onEditorFileSaved", onSaved);
      forgeTwoDASettings.removeListener(onTableSettings);
    };
  });

  const visibleColumns = useMemo(() => {
    if (!twoDAObject) return [] as string[];
    return getVisibleColumns(twoDAObject.columns, tableSettings.showRowLabel, hiddenColumns);
  }, [twoDAObject, tableSettings.showRowLabel, hiddenColumns, dataVersion]);

  const searchMatches = useMemo(() => {
    if (!twoDAObject) return [];
    return computeSearchMatches(twoDAObject, searchQuery, visibleColumns, caseSensitive);
  }, [twoDAObject, searchQuery, visibleColumns, caseSensitive, dataVersion]);

  const matchingRowIndices = useMemo(() => {
    const rows = new Set<number>();
    for (const match of searchMatches) rows.add(match.row);
    return rows;
  }, [searchMatches]);

  const currentMatch = searchMatches.length
    ? searchMatches[Math.min(searchMatchIndex, searchMatches.length - 1)]
    : undefined;

  useEffect(() => {
    if (searchMatchIndex >= searchMatches.length) {
      setSearchMatchIndex(searchMatches.length ? searchMatches.length - 1 : 0);
    }
  }, [searchMatches.length, searchMatchIndex]);

  const scrollCellIntoView = useCallback((row: number, column: string) => {
    if (!tableAreaRef.current) return;
    const escapedCol = (typeof CSS !== "undefined" && CSS.escape)
      ? CSS.escape(column)
      : column.replace(/"/g, '\\"');
    const cell = tableAreaRef.current.querySelector(
      `tbody tr[data-row-index="${row}"] td[data-column="${escapedCol}"]`,
    ) as HTMLElement | null;
    cell?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    if (!currentMatch) return;
    scrollCellIntoView(currentMatch.row, currentMatch.column);
  }, [currentMatch, dataVersion, filterRows, searchQuery, scrollCellIntoView]);

  const setSingleCellSelection = useCallback((row: number, column: string, colIndex: number) => {
    setAnchor({ row, column });
    setActive({ row, column });
    setRanges([makeCellRange(row, colIndex)]);
    setEditing(null);
  }, []);

  const selectRowRange = useCallback((row: number, extend: boolean, additive: boolean) => {
    const colCount = visibleColumns.length;
    if (!colCount) return;
    const firstCol = visibleColumns[0];
    const range = makeRowRange(row, colCount);
    if (additive) {
      setRanges((prev) => [...prev, range]);
    } else if (extend && anchor) {
      const aIdx = visibleColumns.indexOf(anchor.column);
      const startRow = Math.min(anchor.row, row);
      const endRow = Math.max(anchor.row, row);
      setRanges([{
        r0: startRow,
        c0: 0,
        r1: endRow,
        c1: colCount - 1,
      }]);
      setActive({ row, column: firstCol });
      return;
    } else {
      setRanges([range]);
      setAnchor({ row, column: firstCol });
    }
    setActive({ row, column: firstCol });
    setEditing(null);
  }, [visibleColumns, anchor]);

  const goToMatch = useCallback((index: number) => {
    if (!searchMatches.length) return;
    const next = ((index % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(next);
    const match = searchMatches[next];
    const colIndex = visibleColumns.indexOf(match.column);
    if (colIndex >= 0) setSingleCellSelection(match.row, match.column, colIndex);
  }, [searchMatches, visibleColumns, setSingleCellSelection]);

  const nextSearchMatch = useCallback(() => goToMatch(searchMatchIndex + 1), [goToMatch, searchMatchIndex]);
  const prevSearchMatch = useCallback(() => goToMatch(searchMatchIndex - 1), [goToMatch, searchMatchIndex]);
  const openFind = useCallback((mode: ForgeFindMode = "find") => {
    setFindMode(mode);
    setFindOpen(true);
  }, []);

  const onBeforeEdit = useCallback((rowIndex: number, column: string) => {
    const key = `${rowIndex}:${column}`;
    if (lastUndoKey.current === key) return;
    lastUndoKey.current = key;
    tab.captureUndoSnapshot();
    bumpHistory();
  }, [tab, bumpHistory]);

  const onAfterEdit = useCallback(() => {
    lastUndoKey.current = null;
    markDirty();
    setEditing(null);
  }, [markDirty]);

  const onImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) tab.importFromCSV(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectedRowIndex = active?.row ?? -1;

  const onAddRow = useCallback(() => {
    if (!twoDAObject) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const newIndex = twoDAObject.RowCount;
    twoDAObject.rows[newIndex] = createEmptyRow(twoDAObject, newIndex);
    twoDAObject.RowCount++;
    twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setSortColumn(null);
    setSortDir(null);
    const col = visibleColumns[0] || twoDAObject.columns[0];
    const colIndex = Math.max(0, visibleColumns.indexOf(col));
    setSingleCellSelection(newIndex, col, colIndex);
  }, [twoDAObject, tab, markDirty, bumpHistory, visibleColumns, setSingleCellSelection]);

  const onDeleteRow = useCallback((rowIndex = selectedRowIndex) => {
    if (!twoDAObject || rowIndex < 0) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    delete twoDAObject.rows[rowIndex];
    rebuildRows(twoDAObject, collectRows(twoDAObject));
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setSortColumn(null);
    setSortDir(null);
    const next = Math.min(rowIndex, twoDAObject.RowCount - 1);
    if (next < 0) clearSelectionState();
    else {
      const col = visibleColumns[0] || "__rowlabel";
      setSingleCellSelection(next, col, Math.max(0, visibleColumns.indexOf(col)));
    }
  }, [twoDAObject, selectedRowIndex, tab, markDirty, bumpHistory, visibleColumns, setSingleCellSelection, clearSelectionState]);

  const onDuplicateRow = useCallback((rowIndex = selectedRowIndex) => {
    if (!twoDAObject || rowIndex < 0) return;
    const source = twoDAObject.rows[rowIndex];
    if (!source) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const rows = collectRows(twoDAObject);
    rows.splice(rowIndex + 1, 0, cloneRow(source, rowIndex + 1));
    rebuildRows(twoDAObject, rows);
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setSortColumn(null);
    setSortDir(null);
    const col = visibleColumns[0] || "__rowlabel";
    setSingleCellSelection(rowIndex + 1, col, Math.max(0, visibleColumns.indexOf(col)));
  }, [twoDAObject, selectedRowIndex, tab, markDirty, bumpHistory, visibleColumns, setSingleCellSelection]);

  const onInsertRow = useCallback((atIndex: number) => {
    if (!twoDAObject || atIndex < 0) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    const rows = collectRows(twoDAObject);
    rows.splice(atIndex, 0, createEmptyRow(twoDAObject, atIndex));
    rebuildRows(twoDAObject, rows);
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setSortColumn(null);
    setSortDir(null);
    const col = visibleColumns[0] || "__rowlabel";
    setSingleCellSelection(atIndex, col, Math.max(0, visibleColumns.indexOf(col)));
  }, [twoDAObject, tab, markDirty, bumpHistory, visibleColumns, setSingleCellSelection]);

  const onReplaceCurrent = useCallback(() => {
    if (!twoDAObject || !currentMatch) return;
    const row = twoDAObject.rows[currentMatch.row];
    if (!row || currentMatch.column === "__rowlabel") {
      nextSearchMatch();
      return;
    }
    const query = searchQuery.trim();
    if (!query) return;
    const before = String(row[currentMatch.column] ?? "");
    const after = replaceInCell(before, query, replaceValue, caseSensitive);
    if (before === after) {
      nextSearchMatch();
      return;
    }
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    row[currentMatch.column] = after;
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setTimeout(() => nextSearchMatch(), 0);
  }, [twoDAObject, currentMatch, searchQuery, replaceValue, caseSensitive, tab, markDirty, bumpHistory, nextSearchMatch]);

  const onReplaceAll = useCallback(() => {
    if (!twoDAObject) return;
    const query = searchQuery.trim();
    if (!query || !searchMatches.length) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    for (const match of searchMatches) {
      if (match.column === "__rowlabel") continue;
      const row = twoDAObject.rows[match.row];
      if (!row) continue;
      row[match.column] = replaceInCell(String(row[match.column] ?? ""), query, replaceValue, caseSensitive);
    }
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    setSearchMatchIndex(0);
  }, [twoDAObject, searchQuery, searchMatches, replaceValue, caseSensitive, tab, markDirty, bumpHistory]);

  const onCellMouseDown = useCallback((
    e: React.MouseEvent,
    rowIndex: number,
    column: string,
    colIndex: number,
    isRowLabel: boolean,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const additive = e.ctrlKey || e.metaKey;
    const extend = e.shiftKey;

    if (isRowLabel) {
      selectRowRange(rowIndex, extend, additive);
      return;
    }

    if (extend && anchor) {
      const aIdx = visibleColumns.indexOf(anchor.column);
      if (aIdx < 0) return;
      const range = normalizeRange({
        r0: anchor.row,
        c0: aIdx,
        r1: rowIndex,
        c1: colIndex,
      });
      setRanges((prev) => (additive ? [...prev.slice(0, -1), range] : [range]));
      setActive({ row: rowIndex, column });
      setEditing(null);
      return;
    }

    selectingRef.current = true;
    selectAdditiveRef.current = additive;
    const range = makeCellRange(rowIndex, colIndex);
    setAnchor({ row: rowIndex, column });
    setActive({ row: rowIndex, column });
    setRanges((prev) => (additive ? [...prev, range] : [range]));
    setEditing(null);
  }, [anchor, visibleColumns, selectRowRange]);

  const onCellMouseEnter = useCallback((rowIndex: number, column: string, colIndex: number) => {
    if (!selectingRef.current || !anchor) return;
    const aIdx = visibleColumns.indexOf(anchor.column);
    if (aIdx < 0) return;
    const range = normalizeRange({
      r0: anchor.row,
      c0: aIdx,
      r1: rowIndex,
      c1: colIndex,
    });
    setActive({ row: rowIndex, column });
    setRanges((prev) => {
      if (selectAdditiveRef.current && prev.length) {
        return [...prev.slice(0, -1), range];
      }
      return [range];
    });
  }, [anchor, visibleColumns]);

  useEffect(() => {
    const onUp = () => { selectingRef.current = false; };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const onCellDoubleClick = useCallback((rowIndex: number, column: string) => {
    if (column === "__rowlabel") return;
    setEditing({ row: rowIndex, column });
    setActive({ row: rowIndex, column });
  }, []);

  const onCopy = useCallback(async () => {
    if (!twoDAObject || !ranges.length) return;
    const text = rangesToTsv(twoDAObject, ranges, visibleColumns);
    await writeClipboardText(text);
  }, [twoDAObject, ranges, visibleColumns]);

  const onCut = useCallback(async () => {
    if (!twoDAObject || !ranges.length) return;
    await onCopy();
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    clearCellsInRanges(twoDAObject, ranges, visibleColumns);
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
  }, [twoDAObject, ranges, visibleColumns, onCopy, tab, markDirty, bumpHistory]);

  const onPaste = useCallback(async () => {
    if (!twoDAObject || !active) return;
    const text = await readClipboardText();
    if (!text) return;
    const grid = parseTsv(text);
    const startCol = visibleColumns.indexOf(active.column);
    if (startCol < 0) return;
    const startRow = ranges.length
      ? normalizeRange(ranges[ranges.length - 1]).r0
      : active.row;
    const startC = ranges.length
      ? normalizeRange(ranges[ranges.length - 1]).c0
      : startCol;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    pasteTsvAt(twoDAObject, grid, startRow, startC, visibleColumns);
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
  }, [twoDAObject, active, ranges, visibleColumns, tab, markDirty, bumpHistory]);

  const onSortClick = useCallback((column: string) => {
    if (!twoDAObject) return;
    let nextDir: TwoDASortDir | null = "asc";
    if (sortColumn === column && sortDir === "asc") nextDir = "desc";
    else if (sortColumn === column && sortDir === "desc") nextDir = null;

    if (!nextDir) {
      setSortColumn(null);
      setSortDir(null);
      return;
    }
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    sortRowsByColumn(twoDAObject, column, nextDir);
    setSortColumn(column);
    setSortDir(nextDir);
    clearSelectionState();
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
  }, [twoDAObject, sortColumn, sortDir, tab, markDirty, bumpHistory, clearSelectionState]);

  const openAddColumn = () => {
    setColumnDialog("add");
    setColumnDialogValue("");
    setRenameTarget(null);
  };

  const openRenameColumn = (column?: string) => {
    const target = column || active?.column;
    if (!target || target === "__rowlabel") return;
    setColumnDialog("rename");
    setColumnDialogValue(target);
    setRenameTarget(target);
  };

  const commitColumnDialog = () => {
    if (!twoDAObject || !columnDialog) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    let ok = false;
    if (columnDialog === "add") {
      ok = addColumn(twoDAObject, columnDialogValue);
    } else if (columnDialog === "rename" && renameTarget) {
      ok = renameColumn(twoDAObject, renameTarget, columnDialogValue);
      if (ok) {
        setHiddenColumns((prev) => {
          if (!prev.has(renameTarget)) return prev;
          const next = new Set(prev);
          next.delete(renameTarget);
          next.add(columnDialogValue.trim());
          return next;
        });
      }
    }
    if (ok) {
      markDirty();
      setDataVersion((v) => v + 1);
      bumpHistory();
      clearSelectionState();
    }
    setColumnDialog(null);
  };

  const onDeleteColumn = useCallback((column?: string) => {
    if (!twoDAObject) return;
    const target = column || active?.column;
    if (!target || target === "__rowlabel") return;
    if (!window.confirm(`Delete column "${target}"?`)) return;
    tab.captureUndoSnapshot();
    lastUndoKey.current = null;
    if (!deleteColumn(twoDAObject, target)) return;
    setHiddenColumns((prev) => {
      if (!prev.has(target)) return prev;
      const next = new Set(prev);
      next.delete(target);
      return next;
    });
    markDirty();
    setDataVersion((v) => v + 1);
    bumpHistory();
    clearSelectionState();
  }, [twoDAObject, active, tab, markDirty, bumpHistory, clearSelectionState]);

  const toggleHideColumn = useCallback((column: string) => {
    if (column === "__rowlabel") return;
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
    clearSelectionState();
  }, [clearSelectionState]);

  const applyGoTo = () => {
    if (!twoDAObject) return;
    const raw = goToInput.trim();
    let rowIndex = -1;
    if (/^\d+$/.test(raw)) {
      rowIndex = Number(raw);
    } else {
      for (let i = 0; i < twoDAObject.RowCount; i++) {
        if (String(twoDAObject.rows[i]?.__rowlabel ?? "") === raw) {
          rowIndex = i;
          break;
        }
      }
    }
    if (rowIndex < 0 || rowIndex >= twoDAObject.RowCount) return;
    const col = visibleColumns.find((c) => c !== "__rowlabel") || visibleColumns[0];
    if (!col) return;
    const colIndex = visibleColumns.indexOf(col);
    setSingleCellSelection(rowIndex, col, colIndex);
    scrollCellIntoView(rowIndex, col);
    setGoToOpen(false);
  };

  const onHeaderContextMenu = useCallback((e: React.MouseEvent, column: string) => {
    const items: ContextMenuItem[] = [
      {
        id: "rename",
        label: "Rename Column…",
        disabled: column === "__rowlabel",
        onClick: () => openRenameColumn(column),
      },
      {
        id: "hide",
        label: hiddenColumns.has(column) ? "Show Column" : "Hide Column",
        disabled: column === "__rowlabel",
        onClick: () => toggleHideColumn(column),
      },
      {
        id: "delete-col",
        label: "Delete Column…",
        disabled: column === "__rowlabel",
        onClick: () => onDeleteColumn(column),
      },
      { id: "sep", separator: true },
      {
        id: "add-col",
        label: "Add Column…",
        onClick: openAddColumn,
      },
      {
        id: "show-all",
        label: "Show All Columns",
        disabled: hiddenColumns.size === 0,
        onClick: () => setHiddenColumns(new Set()),
      },
    ];
    showContextMenu(e.clientX, e.clientY, items);
  }, [hiddenColumns, onDeleteColumn, toggleHideColumn, showContextMenu]);

  const onRowContextMenu = useCallback((e: React.MouseEvent, rowIndex: number) => {
    const items: ContextMenuItem[] = [
      { id: "copy", label: "Copy", shortcut: "Ctrl+C", onClick: () => { void onCopy(); } },
      { id: "cut", label: "Cut", shortcut: "Ctrl+X", onClick: () => { void onCut(); } },
      { id: "paste", label: "Paste", shortcut: "Ctrl+V", onClick: () => { void onPaste(); } },
      { id: "sep0", separator: true },
      { id: "insert-above", label: "Insert Row Above", onClick: () => onInsertRow(rowIndex) },
      { id: "insert-below", label: "Insert Row Below", onClick: () => onInsertRow(rowIndex + 1) },
      { id: "duplicate", label: "Duplicate Row", shortcut: "Ctrl+D", onClick: () => onDuplicateRow(rowIndex) },
      { id: "sep1", separator: true },
      { id: "delete", label: "Delete Row", shortcut: "Del", onClick: () => onDeleteRow(rowIndex) },
    ];
    showContextMenu(e.clientX, e.clientY, items);
  }, [onCopy, onCut, onPaste, onInsertRow, onDuplicateRow, onDeleteRow, showContextMenu]);

  const moveActive = useCallback((dRow: number, dCol: number, extend: boolean) => {
    if (!active || !visibleColumns.length || !twoDAObject) return;
    const colIndex = visibleColumns.indexOf(active.column);
    if (colIndex < 0) return;
    const nextRow = Math.max(0, Math.min(twoDAObject.RowCount - 1, active.row + dRow));
    const nextColIndex = Math.max(0, Math.min(visibleColumns.length - 1, colIndex + dCol));
    const nextCol = visibleColumns[nextColIndex];
    setActive({ row: nextRow, column: nextCol });
    setEditing(null);
    if (extend && anchor) {
      const aIdx = visibleColumns.indexOf(anchor.column);
      if (aIdx >= 0) {
        setRanges([normalizeRange({
          r0: anchor.row,
          c0: aIdx,
          r1: nextRow,
          c1: nextColIndex,
        })]);
      }
    } else {
      setAnchor({ row: nextRow, column: nextCol });
      setRanges([makeCellRange(nextRow, nextColIndex)]);
    }
    scrollCellIntoView(nextRow, nextCol);
  }, [active, visibleColumns, twoDAObject, anchor, scrollCellIntoView]);

  const handleEditorKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || "").toLowerCase();
    const inField = tag === "input" || tag === "textarea" || tag === "select" || !!target?.isContentEditable;
    const inDialog = !!target?.closest?.(".forge-find-dialog, .forge-dialog");
    const isEditing = !!editing;

    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      openFind("find");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      openFind("replace");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "g" || e.key === "G")) {
      e.preventDefault();
      setGoToInput(active ? String(active.row) : "0");
      setGoToOpen(true);
      return;
    }

    if (inDialog) return;

    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "a" && !isEditing) {
      e.preventDefault();
      if (twoDAObject && visibleColumns.length) {
        setRanges([makeAllRange(twoDAObject.RowCount, visibleColumns.length)]);
        setAnchor({ row: 0, column: visibleColumns[0] });
        setActive({ row: 0, column: visibleColumns[0] });
        setEditing(null);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey && !isEditing) {
      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        void onCopy();
        return;
      }
      if (key === "x") {
        e.preventDefault();
        void onCut();
        return;
      }
      if (key === "v") {
        e.preventDefault();
        void onPaste();
        return;
      }
      if (key === "d") {
        if (selectedRowIndex >= 0) {
          e.preventDefault();
          onDuplicateRow(selectedRowIndex);
        }
        return;
      }
    }

    if (e.key === "Escape") {
      if (isEditing) {
        e.preventDefault();
        setEditing(null);
        return;
      }
      if (active) {
        e.preventDefault();
        const colIndex = visibleColumns.indexOf(active.column);
        setRanges(colIndex >= 0 ? [makeCellRange(active.row, colIndex)] : []);
        setAnchor(active);
      }
      return;
    }

    if (e.key === "F2" && active && active.column !== "__rowlabel") {
      e.preventDefault();
      setEditing(active);
      return;
    }

    if (isEditing || (inField && isEditing)) {
      return;
    }

    // When focused in a non-editing input (readonly), still allow navigation
    if (!isEditing) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1, 0, e.shiftKey);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1, 0, e.shiftKey);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveActive(0, -1, e.shiftKey);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveActive(0, 1, e.shiftKey);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (ranges.length && !(e.ctrlKey || e.metaKey)) {
          // Clear selected cells rather than deleting the whole row when a range is active
          if (twoDAObject) {
            e.preventDefault();
            tab.captureUndoSnapshot();
            lastUndoKey.current = null;
            clearCellsInRanges(twoDAObject, ranges, visibleColumns);
            markDirty();
            setDataVersion((v) => v + 1);
            bumpHistory();
          }
          return;
        }
        if (selectedRowIndex >= 0) {
          e.preventDefault();
          onDeleteRow(selectedRowIndex);
        }
        return;
      }
      // Start typing to edit
      if (
        active &&
        active.column !== "__rowlabel" &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setPendingEditChar(e.key);
        setEditing(active);
      }
    }
  }, [
    editing, openFind, active, twoDAObject, visibleColumns, onCopy, onCut, onPaste,
    selectedRowIndex, onDuplicateRow, moveActive, ranges, tab, markDirty, bumpHistory, onDeleteRow,
  ]);

  const keyHandlerRef = useRef(handleEditorKeyDown);
  keyHandlerRef.current = handleEditorKeyDown;
  useEffectOnce(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current(e);
    tab.addEventListener("onKeyDown", onKeyDown);
    return () => tab.removeEventListener("onKeyDown", onKeyDown);
  });

  const matchLabel = searchMatches.length
    ? `${Math.min(searchMatchIndex, searchMatches.length - 1) + 1}/${searchMatches.length}`
    : searchQuery.trim() ? "0/0" : "";

  const visibleRowEntries = useMemo(() => {
    if (!twoDAObject) return [] as [string, any][];
    const entries = Object.entries(twoDAObject.rows) as [string, any][];
    if (filterRows && searchQuery.trim()) {
      return entries.filter(([key, row]) => {
        const idx = typeof row.__index === "number" ? row.__index : Number(key);
        return matchingRowIndices.has(idx);
      });
    }
    return entries;
  }, [twoDAObject, filterRows, searchQuery, matchingRowIndices, dataVersion]);

  const matchesByRow = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const match of searchMatches) {
      let set = map.get(match.row);
      if (!set) {
        set = new Set();
        map.set(match.row, set);
      }
      set.add(match.column);
    }
    return map;
  }, [searchMatches]);

  const columnToggleItems: MenuItem[] = useMemo(() => {
    if (!twoDAObject) return [];
    return twoDAObject.columns
      .filter((c) => c !== "__rowlabel")
      .map((column) => ({
        label: `${hiddenColumns.has(column) ? "☐" : "☑"} ${column}`,
        onClick: () => toggleHideColumn(column),
      }));
  }, [twoDAObject, hiddenColumns, toggleHideColumn, dataVersion]);

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        { label: "Save", shortcut: "Ctrl+S", onClick: () => { tab.save(); }, disabled: !twoDAObject },
        { label: "Save As...", shortcut: "Ctrl+Shift+S", onClick: () => { tab.saveAs(); }, disabled: !twoDAObject },
        { separator: true },
        { label: "Import CSV...", onClick: () => { importRef.current?.click(); } },
        { label: "Export CSV...", onClick: () => { tab.saveAs(); }, disabled: !twoDAObject },
      ],
    },
    {
      label: "Edit",
      children: [
        { label: "Undo", shortcut: "Ctrl+Z", onClick: () => { tab.undo(); }, disabled: !tab.canUndo },
        { label: "Redo", shortcut: "Ctrl+Y", onClick: () => { tab.redo(); }, disabled: !tab.canRedo },
        { separator: true },
        { label: "Cut", shortcut: "Ctrl+X", onClick: () => { void onCut(); }, disabled: !ranges.length },
        { label: "Copy", shortcut: "Ctrl+C", onClick: () => { void onCopy(); }, disabled: !ranges.length },
        { label: "Paste", shortcut: "Ctrl+V", onClick: () => { void onPaste(); }, disabled: !active },
        { separator: true },
        { label: "Find...", shortcut: "Ctrl+F", onClick: () => openFind("find"), disabled: !twoDAObject },
        { label: "Find & Replace...", shortcut: "Ctrl+H", onClick: () => openFind("replace"), disabled: !twoDAObject },
        { label: "Go to Row...", shortcut: "Ctrl+G", onClick: () => { setGoToInput(active ? String(active.row) : "0"); setGoToOpen(true); }, disabled: !twoDAObject },
        { separator: true },
        { label: "Add Row", onClick: onAddRow, disabled: !twoDAObject },
        { label: "Insert Row Above", onClick: () => onInsertRow(selectedRowIndex), disabled: !twoDAObject || selectedRowIndex < 0 },
        { label: "Insert Row Below", onClick: () => onInsertRow(selectedRowIndex + 1), disabled: !twoDAObject || selectedRowIndex < 0 },
        { label: "Duplicate Row", shortcut: "Ctrl+D", onClick: () => onDuplicateRow(), disabled: !twoDAObject || selectedRowIndex < 0 },
        { label: "Delete Row", shortcut: "Del", onClick: () => onDeleteRow(), disabled: !twoDAObject || selectedRowIndex < 0 },
        { separator: true },
        { label: "Add Column...", onClick: openAddColumn, disabled: !twoDAObject },
        { label: "Rename Column...", onClick: () => openRenameColumn(), disabled: !twoDAObject || !active || active.column === "__rowlabel" },
        { label: "Delete Column...", onClick: () => onDeleteColumn(), disabled: !twoDAObject || !active || active.column === "__rowlabel" },
      ],
    },
    {
      label: "View",
      children: [
        { label: "Show All Columns", onClick: () => setHiddenColumns(new Set()), disabled: hiddenColumns.size === 0 },
        { separator: true },
        ...columnToggleItems,
      ],
    },
  ];

  void historyVersion;

  if (!twoDAObject) {
    return (
      <div className="tab-twoda-editor" style={{
        display: "flex",
        textAlign: "center",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div>
          <ForgeProgress striped animated value={100} label="Loading..." style={{
            minWidth: "300px",
            minHeight: "25px",
          }} />
        </div>
      </div>
    );
  }

  const dataColumnCount = visibleColumns.filter((c) => c !== "__rowlabel").length;
  const statusDims = filterRows && searchQuery.trim()
    ? `${visibleRowEntries.length}/${twoDAObject.RowCount} rows × ${dataColumnCount} cols`
    : `${twoDAObject.RowCount} rows × ${dataColumnCount} cols`;
  const statusSelection = active
    ? `row ${active.row} · ${active.column === "__rowlabel" ? "ID" : active.column}`
    : "No selection";
  const statusRange = selectionSummary(ranges);
  const noMatches = !!searchQuery.trim() && searchMatches.length === 0;

  return (
    <div className="tab-twoda-editor">
      <input ref={importRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" style={{ display: "none" }} onChange={onImportCSV} />
      <MenuBar items={menuItems} />

      <div className="twoda-body">
        <div className="twoda-table-area" ref={tableAreaRef}>
          <table className={`twoda${tableSettings.wrapCells ? " twoda--wrap" : ""}`}>
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <TwoDAEditorColumnHeader
                    key={column}
                    twoDAObject={twoDAObject}
                    column={column}
                    sortColumn={sortColumn}
                    sortDir={sortDir}
                    onSortClick={onSortClick}
                    onHeaderContextMenu={onHeaderContextMenu}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRowEntries.map(([key, row]) => {
                const rIndex: number = typeof row.__index === "number" ? row.__index : Number(key);
                const rowMatches = matchesByRow.get(rIndex);
                const selectedColumns = new Set(
                  visibleColumns.filter((_, cIdx) => isCellSelected(ranges, rIndex, cIdx)),
                );
                return (
                  <TwoDAEditorRow
                    key={`row-${rIndex}-${dataVersion}`}
                    twoDAObject={twoDAObject}
                    row={row}
                    index={rIndex}
                    visibleColumns={visibleColumns}
                    activeRow={active?.row ?? -1}
                    activeColumn={active?.column}
                    editingColumn={editing?.row === rIndex ? editing.column : null}
                    selectedColumns={selectedColumns}
                    matchColumns={rowMatches}
                    currentMatchColumn={currentMatch?.row === rIndex ? currentMatch.column : undefined}
                    onCellMouseDown={onCellMouseDown}
                    onCellMouseEnter={onCellMouseEnter}
                    onCellDoubleClick={onCellDoubleClick}
                    onBeforeEdit={onBeforeEdit}
                    onAfterEdit={onAfterEdit}
                    onRowContextMenu={onRowContextMenu}
                    onEditingKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    dataVersionKey={dataVersion}
                    pendingEditChar={editing?.row === rIndex ? pendingEditChar : null}
                    onPendingEditCharConsumed={() => setPendingEditChar(null)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="twoda-statusbar">
          <span>{statusDims}</span>
          <span>{statusSelection}</span>
          {statusRange ? <span>{statusRange}</span> : null}
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
        matchLabel={matchLabel || (noMatches ? "No matches" : "")}
        caseSensitive={caseSensitive}
        onCaseSensitiveChange={setCaseSensitive}
        extras={(
          <ForgeCheckbox label="Filter rows" value={filterRows} onChange={setFilterRows} />
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

      <ForgeDialog show={goToOpen} onHide={() => setGoToOpen(false)} size="sm">
        <ForgeDialog.Header closeButton>
          <ForgeDialog.Title>Go to row</ForgeDialog.Title>
        </ForgeDialog.Header>
        <ForgeDialog.Body>
          <label className="twoda-col-dialog-field">
            <span>Row index or row label</span>
            <ForgeInput
              value={goToInput}
              onChange={(e) => setGoToInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyGoTo();
                }
              }}
            />
          </label>
        </ForgeDialog.Body>
        <ForgeDialog.Footer>
          <ForgeButton variant="secondary" onClick={() => setGoToOpen(false)}>Cancel</ForgeButton>
          <ForgeButton variant="primary" onClick={applyGoTo}>Go</ForgeButton>
        </ForgeDialog.Footer>
      </ForgeDialog>

      <ForgeDialog show={!!columnDialog} onHide={() => setColumnDialog(null)} size="sm">
        <ForgeDialog.Header closeButton>
          <ForgeDialog.Title>{columnDialog === "rename" ? "Rename column" : "Add column"}</ForgeDialog.Title>
        </ForgeDialog.Header>
        <ForgeDialog.Body>
          <label className="twoda-col-dialog-field">
            <span>Column name</span>
            <ForgeInput
              value={columnDialogValue}
              onChange={(e) => setColumnDialogValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitColumnDialog();
                }
              }}
            />
          </label>
        </ForgeDialog.Body>
        <ForgeDialog.Footer>
          <ForgeButton variant="secondary" onClick={() => setColumnDialog(null)}>Cancel</ForgeButton>
          <ForgeButton variant="primary" onClick={commitColumnDialog} disabled={!columnDialogValue.trim()}>
            {columnDialog === "rename" ? "Rename" : "Add"}
          </ForgeButton>
        </ForgeDialog.Footer>
      </ForgeDialog>

      {ContextMenuComponent}
    </div>
  );
};
