import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { MenuBar, type MenuItem } from "@/apps/forge/components/common/MenuBar";
import { useContextMenu } from "@/apps/forge/components/common/ContextMenu";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import { executeCommand, isCommandEnabled } from "@/apps/forge/commands/forgeCommands";
import { TabDLGEditorState } from "@/apps/forge/states/tabs/TabDLGEditorState";
import { dlgTreeRowId, findDlgTreePath } from "@/apps/forge/dlg/dlgOutline";
import { formatDlgNodeLine } from "@/apps/forge/dlg/dlgLocString";
import { searchDlgNodes } from "@/apps/forge/dlg/dlgSearch";
import { DLGAddNodePicker } from "@/apps/forge/components/tabs/tab-dlg-editor/DLGAddNodePicker";
import { DLGFocusGraph } from "@/apps/forge/components/tabs/tab-dlg-editor/DLGFocusGraph";
import { DLGInspector } from "@/apps/forge/components/tabs/tab-dlg-editor/DLGInspector";
import { DLG_TREE_ROOT, DLGTreeView } from "@/apps/forge/components/tabs/tab-dlg-editor/DLGTreeView";
import { DLGVirtualRows } from "@/apps/forge/components/tabs/tab-dlg-editor/DLGVirtualRows";
import type { ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

import "@/apps/forge/components/tabs/tab-dlg-editor/TabDLGEditor.scss";

/**
 * Conversation editor chrome: graph / tree / catalog + inspector.
 *
 * @file TabDLGEditor.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const TabDLGEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabDLGEditorState;
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([DLG_TREE_ROOT]));
  const [walkthrough, setWalkthrough] = useState(false);
  const [crumb, setCrumb] = useState<string[]>([]);
  const [addPicker, setAddPicker] = useState<{ ownerId: string; kind: "entry" | "reply" } | null>(null);
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", bump);
    tab.addEventListener("onEditorFileChange", bump);
    tab.addEventListener("onUndoApplied", bump);
    tab.addEventListener("onRedoApplied", bump);
    return () => {
      tab.removeEventListener("onEditorFileLoad", bump);
      tab.removeEventListener("onEditorFileChange", bump);
      tab.removeEventListener("onUndoApplied", bump);
      tab.removeEventListener("onRedoApplied", bump);
    };
  });

  useEffect(() => {
    const t = window.setTimeout(() => setActiveQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  void version;

  const dlg = tab.dlg;
  const selectedId = tab.selectedId;

  const catalog = useMemo(
    () => searchDlgNodes(dlg, activeQuery, tab.textByNodeId),
    [dlg, activeQuery, version, tab.textByNodeId],
  );

  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      if (!next.has(DLG_TREE_ROOT)) {
        next.add(DLG_TREE_ROOT);
        changed = true;
      }
      if (selectedId && selectedId !== "root") {
        const path = findDlgTreePath(dlg, selectedId);
        for (let i = 0; i < path.length; i++) {
          if (!next.has(path[i])) {
            next.add(path[i]);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [selectedId, tab.viewMode]);

  const toggleTreeRow = (rowId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const select = (id: string | undefined) => {
    tab.select(id);
    bump();
  };

  const walkTo = (id: string) => {
    const node = dlg.getNode(id);
    setCrumb((c) => c.concat(id));
    if (node?.kind === "reply" && node.links.length === 1) {
      tab.select(node.links[0].targetId);
    } else {
      tab.select(id);
    }
    bump();
  };

  const beginAdd = (ownerId?: string, kind?: "entry" | "reply") => {
    let resolvedOwner = ownerId ?? (selectedId && selectedId !== "root" ? selectedId : "start");
    let current = resolvedOwner === "start" ? undefined : dlg.getNode(resolvedOwner);
    const resolvedKind = kind ?? (current?.kind === "entry" ? "reply" : "entry");
    if (current && current.kind === resolvedKind) {
      if (resolvedKind !== "entry") {
        return;
      }
      resolvedOwner = "start";
      current = undefined;
    }
    setAddPicker({ ownerId: current ? current.id : "start", kind: resolvedKind });
  };

  const addPickerOwnerLinks = addPicker
    ? (addPicker.ownerId === "start" ? dlg.startingLinks : dlg.getNode(addPicker.ownerId)?.links || [])
    : [];
  const addPickerLinked = new Set(addPickerOwnerLinks.map((link) => link.targetId));

  const createLinkedNode = () => {
    if (!addPicker) {
      return;
    }
    const { ownerId, kind } = addPicker;
    tab.mutate((d) => {
      const created = kind === "entry" ? d.addEntry() : d.addReply();
      if (ownerId === "start") {
        d.addStartingLink(created.id);
      } else {
        d.addLink(ownerId, created.id);
      }
      tab.selectedId = created.id;
    });
    setAddPicker(null);
    bump();
  };

  const linkExistingNode = (targetId: string) => {
    if (!addPicker) {
      return;
    }
    const { ownerId } = addPicker;
    tab.mutate((d) => {
      if (ownerId === "start") {
        d.addStartingLink(targetId);
      } else {
        d.addLink(ownerId, targetId);
      }
    });
    setAddPicker(null);
    bump();
  };

  const unlink = (linkId: string) => {
    tab.mutate((d) => { d.removeLink(linkId); });
    bump();
  };

  const reorderLink = (ownerId: string, linkId: string, direction: -1 | 1) => {
    tab.mutate((d) => { d.reorderLink(ownerId, linkId, direction); });
    bump();
  };

  const deleteNode = (nodeId: string) => {
    const node = dlg.getNode(nodeId);
    if (!node) {
      return;
    }
    const kind = node.kind === "entry" ? "Entry" : "Reply";
    const preview = formatDlgNodeLine(node, tab.textByNodeId).replace(/\s+/g, " ").trim();
    const inbound = dlg.inboundCount(nodeId);
    const prompt =
      `Are you sure you want to delete this ${kind}?` +
      (preview ? `\n\n"${preview.length > 80 ? `${preview.slice(0, 77)}…` : preview}"` : "") +
      (inbound > 1
        ? `\n\n${inbound} links point at this node and will be removed.`
        : "\n\nLinks pointing at this node will be removed.");
    if (!window.confirm(prompt)) {
      return;
    }
    tab.mutate((d) => { d.deleteNode(nodeId); });
    if (tab.selectedId === nodeId) {
      tab.selectedId = dlg.startingLinks[0]?.targetId || dlg.entries[0]?.id;
    }
    bump();
  };

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        { label: "Save", shortcut: "Ctrl+S", onClick: () => { void tab.save(); } },
        { label: "Save As...", onClick: () => { void tab.saveAs(); } },
      ],
    },
    {
      label: "Edit",
      children: [
        { label: "Undo", shortcut: "Ctrl+Z", onClick: () => { void executeCommand("forge.edit.undo"); }, disabled: !isCommandEnabled("forge.edit.undo") },
        { label: "Redo", shortcut: "Ctrl+Y", onClick: () => { void executeCommand("forge.edit.redo"); }, disabled: !isCommandEnabled("forge.edit.redo") },
        { separator: true },
        { label: "Add Entry", onClick: () => beginAdd(undefined, "entry") },
        {
          label: "Add Reply",
          onClick: () => beginAdd(undefined, "reply"),
          disabled: !selectedId || selectedId === "root" || dlg.getNode(selectedId)?.kind !== "entry",
        },
        {
          label: "Delete Node",
          onClick: () => {
            if (!selectedId || selectedId === "root") return;
            deleteNode(selectedId);
          },
          disabled: !selectedId || selectedId === "root",
        },
      ],
    },
    {
      label: "View",
      children: [
        { label: "Graph", onClick: () => { tab.viewMode = "graph"; bump(); }, checked: tab.viewMode === "graph" },
        { label: "Tree", onClick: () => { tab.viewMode = "tree"; bump(); }, checked: tab.viewMode === "tree" },
        { label: "Catalog", onClick: () => { tab.viewMode = "catalog"; bump(); }, checked: tab.viewMode === "catalog" },
        { separator: true },
        {
          label: "Horizontal graph",
          onClick: () => { tab.graphLayout = "horizontal"; bump(); },
          checked: tab.graphLayout === "horizontal",
          disabled: tab.viewMode !== "graph",
        },
        {
          label: "Vertical graph",
          onClick: () => { tab.graphLayout = "vertical"; bump(); },
          checked: tab.graphLayout === "vertical",
          disabled: tab.viewMode !== "graph",
        },
        { separator: true },
        { label: "Conversation settings", onClick: () => select("root") },
      ],
    },
  ];

  const west = (
    <div className="dlg-rail">
      <div className="dlg-rail__modes">
        {(["graph", "tree", "catalog"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`dlg-rail__mode${tab.viewMode === mode ? " is-active" : ""}`}
            onClick={() => { tab.viewMode = mode; bump(); }}
          >
            {mode}
          </button>
        ))}
      </div>
      <ForgeInput
        type="search"
        placeholder="Search lines, tags, scripts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="dlg-rail__label">Starts</div>
      <div className="dlg-starts">
        {dlg.startingLinks.map((link, i) => {
          const node = dlg.getNode(link.targetId);
          return (
            <button
              key={link.id}
              type="button"
              className={`dlg-start-chip${selectedId === link.targetId ? " is-active" : ""}`}
              onClick={() => select(link.targetId)}
            >
              {i + 1}. {formatDlgNodeLine(node, tab.textByNodeId).slice(0, 28) || node?.speaker || link.targetId}
            </button>
          );
        })}
      </div>
      <ForgeButton type="button" size="sm" onClick={() => select("root")}>Conversation</ForgeButton>
      <ForgeButton
        type="button"
        size="sm"
        onClick={() => {
          const start = dlg.startingLinks[0]?.targetId;
          setWalkthrough((w) => !w);
          setCrumb(start ? [start] : []);
          if (start) select(start);
        }}
      >
        {walkthrough ? "Stop walkthrough" : "Walkthrough"}
      </ForgeButton>
    </div>
  );

  const renderCatalogRow = (node: ForgeDLGNode) => (
    <button
      type="button"
      className={`dlg-list-row dlg-list-row--${node.kind}${selectedId === node.id ? " is-selected" : ""}`}
      onClick={() => select(node.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { id: "select", label: "Select", onClick: () => select(node.id) },
          { id: "start", label: "Add as start", disabled: node.kind !== "entry", onClick: () => {
            if (node.kind === "entry") {
              tab.mutate((d) => { d.addStartingLink(node.id); });
            }
          } },
          { id: "del", label: "Delete", onClick: () => deleteNode(node.id) },
        ]);
      }}
    >
      <span className={`dlg-list-row__kind dlg-list-row__kind--${node.kind}`}>{node.kind === "entry" ? "E" : "R"}</span>
      <span className="dlg-list-row__text">{formatDlgNodeLine(node, tab.textByNodeId) || node.comment || node.id}</span>
    </button>
  );

  const center = (
    <div className="dlg-center">
      {crumb.length && walkthrough ? (
        <div className="dlg-crumb">
          {crumb.map((id) => (
            <button key={id} type="button" className="dlg-crumb__item" onClick={() => select(id)}>
              {formatDlgNodeLine(dlg.getNode(id), tab.textByNodeId).slice(0, 24) || id}
            </button>
          ))}
        </div>
      ) : null}
      {tab.viewMode === "graph" ? (
        <DLGFocusGraph
          dlg={dlg}
          selectedId={selectedId === "root" ? undefined : selectedId}
          texts={tab.textByNodeId}
          inboundTotal={(id) => dlg.inboundCount(id)}
          onSelect={select}
          onWalkTo={walkTo}
          onAddChild={() => beginAdd()}
          onReorderLink={reorderLink}
          onUnlink={unlink}
          onDeleteNode={deleteNode}
          walkthrough={walkthrough}
          layout={tab.graphLayout}
          onLayoutChange={(next) => { tab.graphLayout = next; bump(); }}
        />
      ) : null}
      {tab.viewMode === "tree" ? (
        <DLGTreeView
          dlg={dlg}
          selectedId={selectedId}
          texts={tab.textByNodeId}
          expanded={expanded}
          onToggle={toggleTreeRow}
          onSelect={select}
          onRequestAdd={beginAdd}
          onUnlink={unlink}
          onDeleteNode={deleteNode}
          onAddStart={(nodeId) => tab.mutate((d) => { d.addStartingLink(nodeId); })}
          onExpandStarts={() => {
            setExpanded((prev) => {
              const next = new Set(prev);
              next.add(DLG_TREE_ROOT);
              for (let i = 0; i < dlg.startingLinks.length; i++) {
                const link = dlg.startingLinks[i];
                next.add(dlgTreeRowId("start", link.id, link.targetId));
              }
              return next;
            });
          }}
          onCollapseAll={() => setExpanded(new Set([DLG_TREE_ROOT]))}
          showContextMenu={showContextMenu}
        />
      ) : null}
      {tab.viewMode === "catalog" ? (
        <DLGVirtualRows
          items={catalog.map((h) => h.node)}
          rowHeight={36}
          renderRow={(node) => renderCatalogRow(node)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="tab-dlg-editor">
      <MenuBar items={menuItems} />
      <div className="tab-dlg-editor__body">
        <LayoutContainerProvider>
          <LayoutContainer westContent={west} westSize={240} eastContent={<DLGInspector tab={tab} onRequestAdd={beginAdd} />} eastSize={380}>
            {center}
          </LayoutContainer>
        </LayoutContainerProvider>
      </div>
      {ContextMenuComponent}
      <DLGAddNodePicker
        show={!!addPicker}
        kind={addPicker?.kind || "entry"}
        title={
          !addPicker
            ? "Add"
            : addPicker.ownerId === "start"
              ? "Add starting entry"
              : addPicker.kind === "entry"
                ? "Add entry"
                : "Add reply"
        }
        nodes={addPicker?.kind === "reply" ? dlg.replies : dlg.entries}
        texts={tab.textByNodeId}
        linkedIds={addPickerLinked}
        onCreate={createLinkedNode}
        onPick={linkExistingNode}
        onHide={() => setAddPicker(null)}
      />
    </div>
  );
};
