import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabHexEditorState } from "@/apps/forge/states/tabs/tab-hex-editor/TabHexEditorState";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { Button, Form, Modal } from "react-bootstrap";
import {
  HEX_BYTES_PER_ROW,
  asciiChar,
  byteToHex2,
  formatOffsetForDisplay,
  type HexEditorOffsetDisplay,
  offsetForRow,
  parseByteHex2,
  parseGoToOffset,
  parseHexNibble,
  rowCount,
  rowIndexForOffset,
} from "@/apps/forge/components/tabs/tab-hex-editor/hexEditorFormat";

import "@/apps/forge/components/tabs/tab-hex-editor/TabHexEditor.scss";

const ROW_HEIGHT = 22;
const OVERSCAN_ROWS = 6;

function normalizeByteRange(anchor: number, focus: number): { lo: number; hi: number } {
  return anchor <= focus ? { lo: anchor, hi: focus } : { lo: focus, hi: anchor };
}

function isOffsetInSelection(
  sel: { anchor: number; focus: number } | null,
  offset: number,
): boolean {
  if (!sel) return false;
  const { lo, hi } = normalizeByteRange(sel.anchor, sel.focus);
  return offset >= lo && offset <= hi;
}

function byteOffsetFromClientPoint(clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const hit = el.closest("[data-byte-offset]");
  if (!hit) return null;
  const v = parseInt(hit.getAttribute("data-byte-offset") ?? "", 10);
  return Number.isFinite(v) ? v : null;
}

export const TabHexEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabHexEditorState;
  const [dataVersion, setDataVersion] = useState(0);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);
  const [byteSelection, setByteSelection] = useState<{ anchor: number; focus: number } | null>(null);
  const [editCell, setEditCell] = useState<{ offset: number; draft: string } | null>(null);
  const [showGoTo, setShowGoTo] = useState(false);
  const [goToInput, setGoToInput] = useState("");
  const [offsetDisplay, setOffsetDisplay] = useState<HexEditorOffsetDisplay>("hex");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const lastPaintedFocusRef = useRef<number | null>(null);

  const bytes = tab.bytes;
  const byteLength = bytes.length;
  const rowsTotal = useMemo(() => rowCount(byteLength), [byteLength]);

  const syncVisibleRows = useCallback(() => {
    const el = scrollRef.current;
    const totalRows = rowCount(tab.bytes.length);
    const last = Math.max(0, totalRows - 1);
    if (!el) {
      setViewStart(0);
      setViewEnd(Math.min(last, 127));
      return;
    }
    const st = el.scrollTop;
    const rawCh = el.clientHeight;
    const ch = rawCh > 0 ? rawCh : 480;
    const start = Math.max(0, Math.floor(st / ROW_HEIGHT) - OVERSCAN_ROWS);
    let end = Math.min(last, Math.ceil((st + ch) / ROW_HEIGHT) + OVERSCAN_ROWS);
    if (rawCh === 0 && last > end) {
      end = Math.min(last, Math.max(end, 63));
    }
    setViewStart(start);
    setViewEnd(end);
  }, [tab]);

  const onScroll = useCallback(() => {
    syncVisibleRows();
  }, [syncVisibleRows]);

  const onFileLoad = useCallback(() => {
    setEditCell(null);
    setByteSelection(null);
    dragAnchorRef.current = null;
    setDataVersion((v) => v + 1);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = 0;
      syncVisibleRows();
    });
  }, [syncVisibleRows]);

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", onFileLoad);
    return () => {
      tab.removeEventListener("onEditorFileLoad", onFileLoad);
    };
  });

  useLayoutEffect(() => {
    syncVisibleRows();
  }, [dataVersion, byteLength, syncVisibleRows]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncVisibleRows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncVisibleRows]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragAnchorRef.current === null) return;
      if ((e.buttons & 1) === 0) return;
      const o = byteOffsetFromClientPoint(e.clientX, e.clientY);
      if (o === null) return;
      if (lastPaintedFocusRef.current === o) return;
      lastPaintedFocusRef.current = o;
      const anchor = dragAnchorRef.current;
      setByteSelection({ anchor, focus: o });
    };
    const onUp = () => {
      dragAnchorRef.current = null;
      lastPaintedFocusRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const commitByte = useCallback(
    (offset: number, hex2: string) => {
      const v = parseByteHex2(hex2);
      if (v === null) return;
      if (bytes[offset] === v) return;
      bytes[offset] = v;
      if (tab.file) tab.file.unsaved_changes = true;
      tab.editorFileUpdated();
      setDataVersion((x) => x + 1);
    },
    [bytes, tab],
  );

  const onHexEditChange = useCallback(
    (offset: number, raw: string) => {
      const filtered = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 2);
      setEditCell({ offset, draft: filtered });
      if (filtered.length === 2) {
        commitByte(offset, filtered);
        setEditCell(null);
      }
    },
    [commitByte],
  );

  const onHexEditBlur = useCallback(
    (offset: number, rawFromInput: string) => {
      const draft = rawFromInput.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
      if (draft.length === 2) {
        commitByte(offset, draft);
      } else if (draft.length === 1) {
        const n = parseHexNibble(draft);
        if (n !== null) commitByte(offset, `${draft}0`);
      }
      setEditCell(null);
    },
    [commitByte],
  );

  const onVirtualMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const o = byteOffsetFromClientPoint(e.clientX, e.clientY);
    if (o === null) {
      setByteSelection(null);
      dragAnchorRef.current = null;
      return;
    }
    e.preventDefault();
    dragAnchorRef.current = o;
    lastPaintedFocusRef.current = o;
    setByteSelection({ anchor: o, focus: o });
  }, []);

  const scrollToOffset = useCallback(
    (offset: number) => {
      const el = scrollRef.current;
      if (!el || rowsTotal <= 0) return;
      const o = Math.min(offset >>> 0, Math.max(0, byteLength - 1));
      const row = rowIndexForOffset(o);
      el.scrollTop = row * ROW_HEIGHT;
      syncVisibleRows();
    },
    [byteLength, rowsTotal, syncVisibleRows],
  );

  const applyGoTo = useCallback(() => {
    const off = parseGoToOffset(goToInput);
    if (off === null || byteLength === 0) return;
    const clamped = Math.min(off, Math.max(0, byteLength - 1));
    scrollToOffset(clamped);
    setShowGoTo(false);
    setGoToInput("");
  }, [goToInput, byteLength, scrollToOffset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditCell(null);
        setByteSelection(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        label: "File",
        children: [
          {
            label: "Save",
            shortcut: "Ctrl+S",
            onClick: () => {
              void tab.save();
            },
            disabled: !byteLength,
          },
          {
            label: "Save As...",
            shortcut: "Ctrl+Shift+S",
            onClick: () => {
              void tab.saveAs();
            },
            disabled: !byteLength,
          },
        ],
      },
      {
        label: "Edit",
        children: [
          {
            label: "Go to offset…",
            onClick: () => {
              setGoToInput("");
              setShowGoTo(true);
            },
            disabled: !byteLength,
          },
        ],
      },
      {
        label: "View",
        children: [
          {
            label: "Offsets: hexadecimal",
            checked: offsetDisplay === "hex",
            onClick: () => setOffsetDisplay("hex"),
          },
          {
            label: "Offsets: decimal",
            checked: offsetDisplay === "dec",
            onClick: () => setOffsetDisplay("dec"),
          },
        ],
      },
    ],
    [tab, byteLength, offsetDisplay],
  );

  const virtualHeight = rowsTotal * ROW_HEIGHT;

  const selectionLabel = useMemo(() => {
    if (!byteSelection || byteLength === 0) return null;
    const { lo, hi } = normalizeByteRange(byteSelection.anchor, byteSelection.focus);
    const n = hi - lo + 1;
    if (offsetDisplay === "hex") {
      return `${n} byte${n === 1 ? "" : "s"} selected · 0x${lo.toString(16).toUpperCase()}–0x${hi.toString(16).toUpperCase()}`;
    }
    return `${n} byte${n === 1 ? "" : "s"} selected · ${lo}–${hi}`;
  }, [byteSelection, byteLength, offsetDisplay]);

  const rowElements: React.ReactNode[] = [];
  if (rowsTotal > 0) {
    for (let row = viewStart; row <= viewEnd; row++) {
      const base = offsetForRow(row);
      const hexCells: React.ReactNode[] = [];
      const asciiCells: React.ReactNode[] = [];
      for (let c = 0; c < HEX_BYTES_PER_ROW; c++) {
        const offset = base + c;
        if (offset >= byteLength) break;
        const b = bytes[offset] ?? 0;
        const selected = isOffsetInSelection(byteSelection, offset);
        const cellClass = selected ? "tab-hex-editor__hex-pair tab-hex-editor__hex-pair--selected" : "tab-hex-editor__hex-pair";
        const asciiClass = selected
          ? "tab-hex-editor__ascii-char tab-hex-editor__ascii-char--selected"
          : "tab-hex-editor__ascii-char";

        if (editCell?.offset === offset) {
          hexCells.push(
            <input
              key={offset}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={2}
              className="tab-hex-editor__hex-input"
              aria-label={`Edit byte ${offset}`}
              value={editCell.draft}
              autoFocus
              onChange={(e) => onHexEditChange(offset, e.target.value)}
              onBlur={(e) => onHexEditBlur(offset, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setEditCell(null);
                }
              }}
            />,
          );
        } else {
          hexCells.push(
            <span
              key={offset}
              data-byte-offset={offset}
              className={cellClass}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditCell({ offset, draft: byteToHex2(b) });
              }}
            >
              {byteToHex2(b)}
            </span>,
          );
        }

        asciiCells.push(
          <span key={offset} data-byte-offset={offset} className={asciiClass}>
            {asciiChar(b)}
          </span>,
        );
      }
      rowElements.push(
        <div
          key={row}
          className={`tab-hex-editor__row${offsetDisplay === "dec" ? " tab-hex-editor__row--offset-dec" : ""}`}
          style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}
        >
          <span className="tab-hex-editor__offset">{formatOffsetForDisplay(base, offsetDisplay)}</span>
          <div className="tab-hex-editor__hex-cells">{hexCells}</div>
          <div className="tab-hex-editor__ascii-line">{asciiCells}</div>
        </div>,
      );
    }
  }

  const statusText =
    byteLength === 0
      ? "No data"
      : `${byteLength.toLocaleString()} byte${byteLength === 1 ? "" : "s"}${selectionLabel ? ` · ${selectionLabel}` : ""}`;

  return (
    <div className="tab-hex-editor h-100 overflow-hidden">
      <MenuBar items={menuItems} />

      <div className="tab-hex-editor__toolbar">
        <span className="tab-hex-editor__status">{statusText}</span>
        <Button size="sm" variant="outline-secondary" disabled={!byteLength} onClick={() => setShowGoTo(true)}>
          Go to offset…
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="tab-hex-editor__scroll tab-hex-editor__scroll--with-toolbar"
        onScroll={onScroll}
      >
        {byteLength === 0 ? (
          <p className="text-muted p-2">Empty file.</p>
        ) : (
          <div className="tab-hex-editor__virtual" style={{ height: virtualHeight }} onMouseDown={onVirtualMouseDown}>
            {rowElements}
          </div>
        )}
      </div>

      <Modal show={showGoTo} onHide={() => setShowGoTo(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Go to offset</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Label className="small text-muted">Decimal, hex (0x…), or bare hex</Form.Label>
          <Form.Control
            type="text"
            value={goToInput}
            onChange={(e) => setGoToInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyGoTo();
              }
            }}
            autoFocus
            placeholder="e.g. 4096 or 0x1000"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGoTo(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={applyGoTo} disabled={!byteLength}>
            Go
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
