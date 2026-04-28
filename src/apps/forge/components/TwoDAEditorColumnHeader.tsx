import React, { useRef } from 'react';

import * as KotOR from '@/apps/forge/KotOR';

export const TwoDAEditorColumnHeader = function (props: any) {
  const twoDAObject: KotOR.TwoDAObject = props.twoDAObject;
  const column = props.column;
  const index = twoDAObject.columns.indexOf(column);
  const thRef = useRef<HTMLTableCellElement>(null);

  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const th = thRef.current;
    if (!th) return;

    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + ev.clientX - startX);
      th.style.width = `${newWidth}px`;
      th.style.minWidth = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onResizeDblClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const th = thRef.current;
    if (!th) return;

    const table = th.closest('table');
    if (!table) return;

    const colIndex = Array.from(th.parentElement!.children).indexOf(th);
    const label = !index ? 'ID' : column;

    // Use an offscreen canvas to measure text widths without touching the DOM layout.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Match the header font (system-ui, same size as the th padding context)
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    // Header label + 24px (padding 8px×2 + resize handle 5px + safety)
    let maxWidth = ctx.measureText(label).width + 24;

    // Switch to the cell/input font for body measurements
    ctx.font = '12px Consolas, "Courier New", monospace';
    const inputs = table.querySelectorAll<HTMLInputElement>(`tbody tr td:nth-child(${colIndex + 1}) input`);
    inputs.forEach((input) => {
      const text = input.value || input.defaultValue || '';
      // 16px = 6px padding-left + 6px padding-right + 4px safety
      const w = ctx.measureText(text).width + 16;
      if (w > maxWidth) maxWidth = w;
    });

    const newWidth = Math.ceil(maxWidth);
    th.style.width = `${newWidth}px`;
    th.style.minWidth = `${newWidth}px`;
  };

  return (
    <th ref={thRef}>
      <span className="twoda-col-label">{!index ? 'ID' : column}</span>
      <div
        className="twoda-col-resize-handle"
        onMouseDown={onResizeMouseDown}
        onDoubleClick={onResizeDblClick}
        title="Drag to resize · Double-click to fit content"
      />
    </th>
  );
};
