import React, { useRef } from "react";

import * as KotOR from "@/apps/forge/KotOR";
import type { TwoDASortDir } from "@/apps/forge/helpers/twoDAEditorOps";

export interface TwoDAEditorColumnHeaderProps {
  twoDAObject: KotOR.TwoDAObject;
  column: string;
  sortColumn?: string | null;
  sortDir?: TwoDASortDir | null;
  onSortClick?: (column: string) => void;
  onHeaderContextMenu?: (e: React.MouseEvent, column: string) => void;
}

export const TwoDAEditorColumnHeader = function(props: TwoDAEditorColumnHeaderProps){
  const {
    twoDAObject,
    column,
    sortColumn,
    sortDir,
    onSortClick,
    onHeaderContextMenu,
  } = props;
  const isRowLabel = column === "__rowlabel";
  const thRef = useRef<HTMLTableCellElement>(null);

  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const th = thRef.current;
    if (!th) return;

    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + ev.clientX - startX);
      th.style.width = `${newWidth}px`;
      th.style.minWidth = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onResizeDblClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const th = thRef.current;
    if (!th) return;

    const table = th.closest("table");
    if (!table) return;

    const colIndex = Array.from(th.parentElement!.children).indexOf(th);
    const label = isRowLabel ? "ID" : column;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    let maxWidth = ctx.measureText(label).width + 24;

    ctx.font = '12px Consolas, "Courier New", monospace';
    const inputs = table.querySelectorAll<HTMLInputElement>(
      `tbody tr td:nth-child(${colIndex + 1}) input`,
    );
    inputs.forEach((input) => {
      const text = input.value || input.defaultValue || "";
      const w = ctx.measureText(text).width + 16;
      if (w > maxWidth) maxWidth = w;
    });

    const newWidth = Math.ceil(maxWidth);
    th.style.width = `${newWidth}px`;
    th.style.minWidth = `${newWidth}px`;
  };

  const sortMark =
    sortColumn === column && sortDir
      ? (sortDir === "asc" ? " ▲" : " ▼")
      : "";

  const thClass = [
    isRowLabel ? "cell-rowlabel" : "",
    isRowLabel ? "cell-sticky" : "",
    sortColumn === column ? "twoda-col-sorted" : "",
  ].filter(Boolean).join(" ");

  return (
    <th
      ref={thRef}
      className={thClass || undefined}
      onClick={() => onSortClick?.(column)}
      onContextMenu={(e) => {
        e.preventDefault();
        onHeaderContextMenu?.(e, column);
      }}
    >
      <span className="twoda-col-label">
        {isRowLabel ? "ID" : column}
        {sortMark}
      </span>
      <div
        className="twoda-col-resize-handle"
        onMouseDown={onResizeMouseDown}
        onDoubleClick={onResizeDblClick}
        onClick={(e) => e.stopPropagation()}
        title="Drag to resize · Double-click to fit content"
      />
    </th>
  );
};
