/**
 * Compact hex editor for GFF VOID fields, with .bin import/export.
 *
 * @file GFFVoidHexEditor.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeButton } from "@/apps/forge/components/ui";
import { TabGFFEditorState } from "@/apps/forge/states/tabs";
import { gffVoidBytes, voidBinFileName } from "@/apps/forge/helpers/gffVoidBin";
import {
  HEX_BYTES_PER_ROW,
  asciiChar,
  byteToHex2,
  formatOffset8,
  offsetForRow,
  parseByteHex2,
  parseHexNibble,
  rowCount,
} from "@/apps/forge/components/tabs/tab-hex-editor/hexEditorFormat";

const ROW_HEIGHT = 20;
const OVERSCAN_ROWS = 4;
const BIN_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "Binary",
    accept: { "application/octet-stream": [".bin"] },
  },
];

async function exportVoidBin(bytes: Uint8Array, suggestedName: string): Promise<void> {
  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: BIN_PICKER_TYPES,
    });
    const writable = await handle.createWritable();
    await writable.write(new Blob([bytes.slice()]));
    await writable.close();
    return;
  }
    const blob = new Blob([bytes.slice()], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

async function importVoidBin(): Promise<Uint8Array | undefined> {
  if (typeof window !== "undefined" && typeof window.showOpenFilePicker === "function") {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: BIN_PICKER_TYPES,
    });
    const file = await handles[0].getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bin,application/octet-stream";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      file.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), () => resolve(undefined));
    };
    input.click();
  });
}

export interface GFFVoidHexEditorProps {
  tab: TabGFFEditorState;
  field: KotOR.GFFField;
}

export const GFFVoidHexEditor = function GFFVoidHexEditor(props: GFFVoidHexEditorProps): React.ReactElement {
  const { tab, field } = props;
  const bytes = gffVoidBytes(field);
  const byteLength = bytes.length;
  const rowsTotal = rowCount(byteLength);
  const [editCell, setEditCell] = useState<{ offset: number; draft: string } | null>(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const syncVisibleRows = useCallback(() => {
    const el = scrollRef.current;
    const totalRows = rowCount(gffVoidBytes(field).length);
    const last = Math.max(0, totalRows - 1);
    if (!el) {
      setViewStart(0);
      setViewEnd(Math.min(last, 15));
      return;
    }
    const st = el.scrollTop;
    const ch = el.clientHeight > 0 ? el.clientHeight : 240;
    const start = Math.max(0, Math.floor(st / ROW_HEIGHT) - OVERSCAN_ROWS);
    const end = Math.min(last, Math.ceil((st + ch) / ROW_HEIGHT) + OVERSCAN_ROWS);
    setViewStart(start);
    setViewEnd(end);
  }, [field, tab.generation]);

  useLayoutEffect(() => {
    syncVisibleRows();
  }, [byteLength, tab.generation, tab.selectedPath, syncVisibleRows]);

  useEffect(() => {
    setEditCell(null);
  }, [field.uuid, tab.selectedPath]);

  const writeBytes = useCallback((next: Uint8Array, coalesceKey?: string) => {
    if (coalesceKey) {
      tab.captureCoalescedUndo(coalesceKey);
    } else {
      tab.captureUndoSnapshot();
    }
    field.setData(next);
    tab.markUnsaved();
    tab.notifyTree();
  }, [tab, field]);

  const commitByte = useCallback((offset: number, hex2: string) => {
    const v = parseByteHex2(hex2);
    if (v === null) {
      return;
    }
    const current = gffVoidBytes(field);
    if (offset < 0 || offset >= current.length || current[offset] === v) {
      return;
    }
    const next = new Uint8Array(current);
    next[offset] = v;
    writeBytes(next, `${field.uuid}:void-byte`);
  }, [field, writeBytes]);

  const onHexEditChange = (offset: number, raw: string) => {
    const filtered = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 2);
    setEditCell({ offset, draft: filtered });
    if (filtered.length === 2) {
      commitByte(offset, filtered);
      setEditCell(null);
    }
  };

  const onHexEditBlur = (offset: number, rawFromInput: string) => {
    const draft = rawFromInput.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    if (draft.length === 2) {
      commitByte(offset, draft);
    } else if (draft.length === 1) {
      const n = parseHexNibble(draft);
      if (n !== null) {
        commitByte(offset, `${draft}0`);
      }
    }
    setEditCell(null);
  };

  const onImport = async () => {
    try {
      const data = await importVoidBin();
      if (!data) {
        return;
      }
      writeBytes(data);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        return;
      }
      window.alert("Could not import .bin file.");
    }
  };

  const onExport = async () => {
    try {
      await exportVoidBin(new Uint8Array(gffVoidBytes(field)), voidBinFileName(field.getLabel()));
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        return;
      }
      window.alert("Could not export .bin file.");
    }
  };

  const onInsertByte = () => {
    const current = gffVoidBytes(field);
    const next = new Uint8Array(current.length + 1);
    next.set(current);
    writeBytes(next);
  };

  const onClear = () => {
    if (!byteLength) {
      return;
    }
    writeBytes(new Uint8Array(0));
  };

  const rowElements: React.ReactNode[] = [];
  if (rowsTotal > 0) {
    const last = Math.max(0, rowsTotal - 1);
    const start = Math.min(viewStart, last);
    const end = Math.max(start, Math.min(viewEnd, last));
    for (let row = start; row <= end; row++) {
      const base = offsetForRow(row);
      const hexCells: React.ReactNode[] = [];
      const asciiCells: React.ReactNode[] = [];
      for (let c = 0; c < HEX_BYTES_PER_ROW; c++) {
        const offset = base + c;
        if (offset >= byteLength) {
          break;
        }
        const b = bytes[offset] ?? 0;
        if (editCell?.offset === offset) {
          hexCells.push(
            <input
              key={offset}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={2}
              className="gff-void-hex__input"
              aria-label={`Edit byte ${offset}`}
              value={editCell.draft}
              autoFocus
              onChange={(e) => onHexEditChange(offset, e.target.value)}
              onBlur={(e) => onHexEditBlur(offset, e.currentTarget.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  setEditCell(null);
                } else if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "Enter") {
                  e.preventDefault();
                  const draft = (e.currentTarget as HTMLInputElement).value;
                  onHexEditBlur(offset, draft);
                  const next = offset + 1;
                  if (next < byteLength) {
                    setEditCell({ offset: next, draft: byteToHex2(bytes[next] ?? 0) });
                  }
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  onHexEditBlur(offset, (e.currentTarget as HTMLInputElement).value);
                  if (offset > 0) {
                    setEditCell({ offset: offset - 1, draft: byteToHex2(bytes[offset - 1] ?? 0) });
                  }
                }
              }}
            />,
          );
        } else {
          hexCells.push(
            <span
              key={offset}
              className="gff-void-hex__pair"
              onClick={() => setEditCell({ offset, draft: byteToHex2(b) })}
              title={`${formatOffset8(offset)} = ${byteToHex2(b)}`}
            >
              {byteToHex2(b)}
            </span>,
          );
        }
        asciiCells.push(
          <span key={offset} className="gff-void-hex__ascii-char">{asciiChar(b)}</span>,
        );
      }
      rowElements.push(
        <div key={row} className="gff-void-hex__row" style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}>
          <span className="gff-void-hex__offset">{formatOffset8(base)}</span>
          <div className="gff-void-hex__hex-cells">{hexCells}</div>
          <div className="gff-void-hex__ascii">{asciiCells}</div>
        </div>,
      );
    }
  }

  const status = useMemo(() => {
    return `${byteLength.toLocaleString()} byte${byteLength === 1 ? "" : "s"}`;
  }, [byteLength]);

  return (
    <div
      className="gff-void-hex"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") {
          return;
        }
        scrollRef.current?.focus();
      }}
    >
      <div className="gff-void-hex__toolbar">
        <span className="gff-void-hex__status">{status}</span>
        <ForgeButton size="sm" onClick={() => { void onImport(); }}>Import .bin</ForgeButton>
        <ForgeButton size="sm" onClick={() => { void onExport(); }} disabled={!byteLength}>Export .bin</ForgeButton>
        <ForgeButton size="sm" onClick={onInsertByte}>Add byte</ForgeButton>
        <ForgeButton size="sm" onClick={onClear} disabled={!byteLength}>Clear</ForgeButton>
      </div>
      <div
        ref={scrollRef}
        className="gff-void-hex__scroll"
        tabIndex={0}
        onScroll={syncVisibleRows}
      >
        {byteLength === 0 ? (
          <div className="gff-void-hex__empty">Empty VOID. Import a .bin file or add a byte to start hex editing.</div>
        ) : (
          <div className="gff-void-hex__virtual" style={{ height: rowsTotal * ROW_HEIGHT }}>
            {rowElements}
          </div>
        )}
      </div>
      <div className="gff-void-hex__hint">Click a byte and type two hex digits. Tab / arrows move. Import and export use `.bin`.</div>
    </div>
  );
};
