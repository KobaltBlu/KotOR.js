/**
 * Control hierarchy tree for the Forge GUI editor.
 *
 * @file GUITreeView.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useMemo, useState } from "react";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import { ForgeButton, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
import {
  GUI_ROOT_PATH,
  collectExpandedGuiPaths,
  guiAddableControlTypes,
  guiControlTypeLabel,
  type GuiOutlineNode,
} from "@/apps/forge/gui/guiOutline";
import { GUIControlType } from "@/enums/gui/GUIControlType";

export interface GUITreeViewProps {
  tab: TabGUIEditorState;
  generation: number;
}

function typeIcon(type: number): string {
  switch (type) {
    case GUIControlType.Button:
      return "fa-hand-pointer";
    case GUIControlType.Label:
      return "fa-font";
    case GUIControlType.CheckBox:
      return "fa-square-check";
    case GUIControlType.Slider:
      return "fa-sliders";
    case GUIControlType.Progress:
      return "fa-bars-progress";
    case GUIControlType.Listbox:
      return "fa-list";
    case GUIControlType.ScrollBar:
      return "fa-arrows-up-down";
    case GUIControlType.Panel:
      return "fa-window-maximize";
    case GUIControlType.ProtoItem:
      return "fa-table-cells";
    default:
      return "fa-cube";
  }
}

function TreeNode(props: {
  node: GuiOutlineNode;
  depth: number;
  selectedPath: string;
  expanded: Set<string>;
  filter: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  const { node, depth, selectedPath, expanded, filter, onSelect, onToggle } = props;
  const q = filter.trim().toLowerCase();
  const selfMatch =
    !q ||
    node.tag.toLowerCase().includes(q) ||
    guiControlTypeLabel(node.type).toLowerCase().includes(q);
  const childNodes = node.children
    .map((child) => (
      <TreeNode
        key={child.path}
        node={child}
        depth={depth + 1}
        selectedPath={selectedPath}
        expanded={expanded}
        filter={filter}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    ))
    .filter(Boolean);

  const hasVisibleChild = q
    ? node.children.some((child) => {
        const stack = [child];
        while (stack.length) {
          const cur = stack.pop()!;
          if (
            cur.tag.toLowerCase().includes(q) ||
            guiControlTypeLabel(cur.type).toLowerCase().includes(q)
          ) {
            return true;
          }
          for (const c of cur.children) {
            stack.push(c);
          }
        }
        return false;
      })
    : node.children.length > 0;

  if (q && !selfMatch && !hasVisibleChild) {
    return null;
  }

  const isExpanded = q ? true : expanded.has(node.path);
  const hasChildren = node.children.length > 0;

  return (
    <ListItemNode
      id={node.path}
      name={`${node.tag || "(untitled)"} · ${guiControlTypeLabel(node.type)}`}
      depth={depth}
      hasChildren={hasChildren}
      isExpanded={isExpanded}
      isSelected={selectedPath === node.path}
      icon={typeIcon(node.type)}
      onClick={() => onSelect(node.path)}
      onToggle={() => onToggle(node.path)}
      dataAttributes={{ "data-gui-path": node.path }}
    >
      {hasChildren ? childNodes : null}
    </ListItemNode>
  );
}

export function GUITreeView(props: GUITreeViewProps) {
  const { tab, generation } = props;
  void generation;
  const outline = tab.getOutline();
  const selectedPath = tab.selectedPath || GUI_ROOT_PATH;
  const [filter, setFilter] = useState("");
  const [addType, setAddType] = useState<number>(GUIControlType.Button);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectExpandedGuiPaths(outline, selectedPath),
  );

  const autoExpanded = useMemo(
    () => collectExpandedGuiPaths(outline, selectedPath),
    [outline, selectedPath, generation],
  );

  const mergedExpanded = useMemo(() => {
    const next = new Set(expanded);
    for (const p of autoExpanded) {
      next.add(p);
    }
    return next;
  }, [expanded, autoExpanded]);

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="tab-gui-editor__tree">
      <div className="tab-gui-editor__tree-toolbar">
        <ForgeInput
          type="search"
          placeholder="Filter controls…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="tab-gui-editor__tree-filter"
        />
        <div className="tab-gui-editor__tree-actions">
          <ForgeSelect
            className="tab-gui-editor__tree-add-type"
            value={String(addType)}
            aria-label="Control type to add"
            onChange={(e) => setAddType(Number(e.target.value))}
          >
            {guiAddableControlTypes().map((type) => (
              <option key={type} value={type}>
                {guiControlTypeLabel(type)}
              </option>
            ))}
          </ForgeSelect>
          <ForgeButton size="sm" variant="secondary" onClick={() => tab.addControl(addType)}>
            Add
          </ForgeButton>
          <ForgeButton
            size="sm"
            variant="danger"
            disabled={selectedPath === GUI_ROOT_PATH}
            onClick={() => tab.removeSelectedControl()}
          >
            Delete
          </ForgeButton>
        </div>
      </div>
      <div className="tab-gui-editor__tree-scroll">
        {outline ? (
          <ForgeTreeView>
            <TreeNode
              node={outline}
              depth={0}
              selectedPath={selectedPath}
              expanded={mergedExpanded}
              filter={filter}
              onSelect={(path) => tab.selectPath(path)}
              onToggle={onToggle}
            />
          </ForgeTreeView>
        ) : (
          <p className="tab-gui-editor__empty">No GUI loaded.</p>
        )}
      </div>
    </div>
  );
}
