import React, { memo } from "react";

export interface TLKEditorResultRowProps {
  index: number;
  text: string;
  row: number;
  rowHeight: number;
  active: boolean;
  onSelect: (index: number) => void;
}

function TLKEditorResultRowImpl({
  index,
  text,
  row,
  rowHeight,
  active,
  onSelect,
}: TLKEditorResultRowProps) {
  const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;

  return (
    <div
      role="option"
      aria-selected={active}
      className={`tab-tlk-editor__result-row${active ? " tab-tlk-editor__result-row--active" : ""}`}
      style={{ top: row * rowHeight, height: rowHeight }}
      onClick={() => onSelect(index)}
    >
      <span className="tab-tlk-editor__result-index">[{index}]</span>
      <span className="tab-tlk-editor__result-text" title={text}>
        {preview || "—"}
      </span>
    </div>
  );
}

export const TLKEditorResultRow = memo(TLKEditorResultRowImpl);
