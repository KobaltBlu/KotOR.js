import React, { useCallback, useState } from "react";

/**
 * Windowed row list (same pattern as TabTLKEditor).
 *
 * @file DLGVirtualRows.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const OVERSCAN = 4;
const MIN_ROWS = 24;

export interface DLGVirtualRowsProps<T> {
  items: T[];
  rowHeight?: number;
  className?: string;
  renderRow: (item: T, index: number) => React.ReactNode;
}

export function DLGVirtualRows<T>(props: DLGVirtualRowsProps<T>) {
  const rowHeight = props.rowHeight ?? 36;
  const items = props.items;
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(MIN_ROWS - 1);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const scrollTop = el.scrollTop;
      const viewportHeight = el.clientHeight > 0 ? el.clientHeight : MIN_ROWS * rowHeight;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
      const end = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN,
      );
      setViewStart(start);
      setViewEnd(Math.max(start, end));
    },
    [items.length, rowHeight],
  );

  const last = Math.min(items.length - 1, Math.max(viewEnd, viewStart));
  const first = Math.min(viewStart, last >= 0 ? last : 0);
  const rows: React.ReactNode[] = [];
  if (items.length && last >= first) {
    for (let i = first; i <= last; i++) {
      rows.push(
        <div
          key={i}
          className="dlg-virtual-rows__row"
          style={{ top: i * rowHeight, height: rowHeight }}
        >
          {props.renderRow(items[i], i)}
        </div>,
      );
    }
  }

  return (
    <div className={`dlg-virtual-rows ${props.className || ""}`.trim()} onScroll={onScroll}>
      <div className="dlg-virtual-rows__spacer" style={{ height: items.length * rowHeight }}>
        {rows}
      </div>
    </div>
  );
}
