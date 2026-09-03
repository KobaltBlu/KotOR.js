import React, { useEffect, useMemo, useState } from "react";
import { ForgeButton, ForgeDialog, ForgeInput } from "@/apps/forge/components/ui";
import { formatDlgNodeLine } from "@/apps/forge/dlg/dlgLocString";
import type { ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

/**
 * Choose a new node or an existing entry/reply to link.
 *
 * @file DLGAddNodePicker.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface DLGAddNodePickerProps {
  show: boolean;
  kind: "entry" | "reply";
  title: string;
  nodes: ForgeDLGNode[];
  texts?: ReadonlyMap<string, string>;
  linkedIds?: ReadonlySet<string>;
  onCreate: () => void;
  onPick: (nodeId: string) => void;
  onHide: () => void;
}

export function DLGAddNodePicker(props: DLGAddNodePickerProps) {
  const [query, setQuery] = useState("");
  const kindLabel = props.kind === "entry" ? "entry" : "reply";

  useEffect(() => {
    if (props.show) {
      setQuery("");
    }
  }, [props.show]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return props.nodes;
    }
    return props.nodes.filter((node) => {
      const line = formatDlgNodeLine(node, props.texts).toLowerCase();
      return (
        line.indexOf(q) >= 0 ||
        node.id.toLowerCase().indexOf(q) >= 0 ||
        node.speaker.toLowerCase().indexOf(q) >= 0 ||
        node.comment.toLowerCase().indexOf(q) >= 0
      );
    });
  }, [props.nodes, props.texts, query]);

  return (
    <ForgeDialog show={props.show} onHide={props.onHide} size="sm" className="dlg-add-picker">
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{props.title}</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body>
        <ForgeButton
          type="button"
          variant="primary"
          className="dlg-add-picker__create"
          onClick={props.onCreate}
        >
          Create new {kindLabel}
        </ForgeButton>
        <div className="dlg-rail__label">Or link an existing {kindLabel}</div>
        <ForgeInput
          type="search"
          placeholder={`Search ${kindLabel}s…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="dlg-add-picker__list">
          {filtered.length === 0 ? (
            <div className="dlg-add-picker__empty">No matching {kindLabel}s.</div>
          ) : (
            filtered.map((node) => {
              const linked = !!props.linkedIds?.has(node.id);
              const preview = formatDlgNodeLine(node, props.texts).replace(/\s+/g, " ").trim();
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`dlg-list-row dlg-list-row--${node.kind}`}
                  onClick={() => props.onPick(node.id)}
                >
                  <span className={`dlg-list-row__kind dlg-list-row__kind--${node.kind}`}>
                    {node.kind === "entry" ? "E" : "R"}
                  </span>
                  <span className="dlg-list-row__text">{preview || node.speaker || node.id}</span>
                  {linked ? <span className="dlg-chip">linked</span> : null}
                </button>
              );
            })
          )}
        </div>
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton type="button" onClick={props.onHide}>Cancel</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
}
