import React, { memo } from "react";
import type { ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import { ForgeButton } from "@/apps/forge/components/ui";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import {
  dlgNodeTreeLabel,
  dlgTreeRowId,
} from "@/apps/forge/dlg/dlgOutline";
import type { ForgeDLGLink } from "@/apps/forge/dlg/ForgeDLGTypes";

/**
 * Traditional conversation tree (StartingList → entries/replies).
 *
 * @file DLGTreeView.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const DLG_TREE_ROOT = "conversation";

export interface DLGTreeViewProps {
  dlg: ForgeDLG;
  selectedId: string | undefined;
  texts: ReadonlyMap<string, string>;
  expanded: Set<string>;
  onToggle: (rowId: string) => void;
  onSelect: (id: string) => void;
  onRequestAdd: (ownerId: string, kind: "entry" | "reply") => void;
  onUnlink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddStart: (nodeId: string) => void;
  onExpandStarts: () => void;
  onCollapseAll: () => void;
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
}

function nodeIcon(kind: string, shared: boolean, cycle: boolean): string {
  if (cycle) {
    return "fa-rotate";
  }
  if (shared) {
    return "fa-link";
  }
  return kind === "reply" ? "fa-comment" : "fa-user";
}

const DLGTreeLinkItem = memo(function DLGTreeLinkItem(props: {
  dlg: ForgeDLG;
  link: ForgeDLGLink;
  ownerId: string;
  pathIds: string[];
  texts: ReadonlyMap<string, string>;
  selectedId: string | undefined;
  expanded: Set<string>;
  onToggle: (rowId: string) => void;
  onSelect: (id: string) => void;
  onRequestAdd: (ownerId: string, kind: "entry" | "reply") => void;
  onUnlink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddStart: (nodeId: string) => void;
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
}) {
  const node = props.dlg.getNode(props.link.targetId);
  const kind = node?.kind || (props.ownerId === "start" ? "entry" : "reply");
  const rowId = dlgTreeRowId(props.ownerId, props.link.id, props.link.targetId);
  const cycle = props.pathIds.indexOf(props.link.targetId) >= 0;
  const shared = props.dlg.inboundCount(props.link.targetId) > 1;
  const hasChildren = !cycle && !!node && node.links.length > 0;
  const isExpanded = hasChildren && props.expanded.has(rowId);
  const label = dlgNodeTreeLabel(node, kind, props.texts);
  const suffix = cycle ? " (cycle)" : shared ? " (shared)" : "";

  return (
    <ListItemNode
      id={rowId}
      name={`${label}${suffix}`}
      hasChildren={hasChildren}
      isExpanded={isExpanded}
      isSelected={props.selectedId === props.link.targetId}
      icon={nodeIcon(kind, shared, cycle)}
      iconType={hasChildren ? "folder" : "file"}
      dataAttributes={{ "data-kind": kind, "data-shared": shared ? "1" : "0", "data-cycle": cycle ? "1" : "0" }}
      onToggle={() => props.onToggle(rowId)}
      onClick={() => props.onSelect(props.link.targetId)}
      onDoubleClick={() => {
        if (hasChildren && !isExpanded) {
          props.onToggle(rowId);
        }
        props.onSelect(props.link.targetId);
      }}
      onContextMenu={(e) => {
        props.showContextMenu(e.clientX, e.clientY, [
          { id: "select", label: "Select", onClick: () => props.onSelect(props.link.targetId) },
          {
            id: "add",
            label: kind === "entry" ? "Add reply…" : "Add entry…",
            disabled: !node,
            onClick: () => node && props.onRequestAdd(node.id, kind === "entry" ? "reply" : "entry"),
          },
          {
            id: "start",
            label: "Add as start",
            disabled: kind !== "entry",
            onClick: () => kind === "entry" && props.onAddStart(props.link.targetId),
          },
          { id: "unlink", label: "Unlink", onClick: () => props.onUnlink(props.link.id) },
          {
            id: "del",
            label: "Delete node",
            disabled: !node,
            onClick: () => node && props.onDeleteNode(node.id),
          },
        ]);
      }}
    >
      {isExpanded && node
        ? node.links.map((child) => (
            <DLGTreeLinkItem
              key={child.id}
              dlg={props.dlg}
              link={child}
              ownerId={node.id}
              pathIds={props.pathIds.concat(node.id)}
              texts={props.texts}
              selectedId={props.selectedId}
              expanded={props.expanded}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
              onRequestAdd={props.onRequestAdd}
              onUnlink={props.onUnlink}
              onDeleteNode={props.onDeleteNode}
              onAddStart={props.onAddStart}
              showContextMenu={props.showContextMenu}
            />
          ))
        : null}
    </ListItemNode>
  );
});

export function DLGTreeView(props: DLGTreeViewProps) {
  const rootExpanded = props.expanded.has(DLG_TREE_ROOT);
  const hasStarts = props.dlg.startingLinks.length > 0;
  return (
    <div className="dlg-tree">
      <div className="dlg-tree__toolbar">
        <ForgeButton type="button" size="sm" onClick={props.onExpandStarts}>Expand starts</ForgeButton>
        <ForgeButton type="button" size="sm" onClick={props.onCollapseAll}>Collapse all</ForgeButton>
      </div>
      <ForgeTreeView style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <ListItemNode
          id={DLG_TREE_ROOT}
          name={props.dlg.voId || "Conversation"}
          hasChildren={hasStarts}
          isExpanded={rootExpanded}
          isSelected={!props.selectedId || props.selectedId === "root"}
          icon="fa-comments"
          iconType="folder"
          dataAttributes={{ "data-kind": "start" }}
          onToggle={() => props.onToggle(DLG_TREE_ROOT)}
          onClick={() => props.onSelect("root")}
          onContextMenu={(e) => {
            props.showContextMenu(e.clientX, e.clientY, [
              { id: "select", label: "Conversation settings", onClick: () => props.onSelect("root") },
              { id: "add", label: "Add starting entry…", onClick: () => props.onRequestAdd("start", "entry") },
            ]);
          }}
        >
          {rootExpanded
            ? props.dlg.startingLinks.map((link) => (
                <DLGTreeLinkItem
                  key={link.id}
                  dlg={props.dlg}
                  link={link}
                  ownerId="start"
                  pathIds={[]}
                  texts={props.texts}
                  selectedId={props.selectedId}
                  expanded={props.expanded}
                  onToggle={props.onToggle}
                  onSelect={props.onSelect}
                  onRequestAdd={props.onRequestAdd}
                  onUnlink={props.onUnlink}
                  onDeleteNode={props.onDeleteNode}
                  onAddStart={props.onAddStart}
                  showContextMenu={props.showContextMenu}
                />
              ))
            : null}
        </ListItemNode>
      </ForgeTreeView>
    </div>
  );
}
