import React, { useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { Project } from "@/apps/forge/Project";
import { compileAllNssInProject } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { ModalBulkNssCompileResultsState } from "@/apps/forge/states/modal/ModalBulkNssCompileResultsState";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";

function folderExpanded(expanded: Record<string, boolean>, relKey: string): boolean {
  if (expanded[relKey] !== undefined) return expanded[relKey] as boolean;
  return relKey === "";
}

function ExplorerTreeBranch(props: {
  node: FileBrowserNode;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  depth: number;
}) {
  const { node, expanded, setExpanded, depth } = props;

  if (node.type === "resource") {
    const resPath = node.data?.path as string | undefined;
    return (
      <ListItemNode
        id={`file:${String(node.data?.relPath ?? resPath ?? node.name)}`}
        name={node.name}
        depth={depth}
        hasChildren={false}
        isExpanded={false}
        iconType="file"
        onDoubleClick={() => {
          if (!resPath) return;
          FileTypeManager.onOpenResource(
            new EditorFile({
              path: resPath,
              useProjectFileSystem: true,
            })
          );
        }}
      />
    );
  }

  const relKey = String(node.data?.relPath ?? "");
  const isExp = folderExpanded(expanded, relKey);
  const hasChildren = node.nodes.length > 0;

  const toggle = () => {
    setExpanded((prev) => {
      const cur = folderExpanded(prev, relKey);
      return { ...prev, [relKey]: !cur };
    });
  };

  return (
    <ListItemNode
      id={`folder:${relKey || "__root__"}`}
      name={node.name}
      depth={depth}
      hasChildren={hasChildren}
      isExpanded={isExp && hasChildren}
      iconType="folder"
      onToggle={toggle}
      onClick={toggle}
    >
      {hasChildren
        ? node.nodes.map((child: FileBrowserNode) => (
            <ExplorerTreeBranch
              key={`${child.type}-${child.data?.relPath ?? child.data?.path ?? ""}-${child.id}`}
              node={child}
              expanded={expanded}
              setExpanded={setExpanded}
              depth={depth + 1}
            />
          ))
        : null}
    </ListItemNode>
  );
}

export const TabProjectExplorer = function (props: BaseTabProps) {
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "": true });

  useEffectOnce(() => {
    const tab = props.tab as TabProjectExplorerState;
    if (tab) {
      tab.onReload = () => {
        setResourceList([...TabProjectExplorerState.Resources]);
      };
      setResourceList([...TabProjectExplorerState.Resources]);
    }
  });

  const handleOpenProject = () => {
    Project.OpenByDirectory();
  };

  const runBulkCompileAllNss = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    ForgeState.loaderShow();
    try {
      const outcome = await compileAllNssInProject();
      const modal = new ModalBulkNssCompileResultsState(outcome);
      modal.attachToModalManager(ForgeState.modalManager);
      modal.open();
    } finally {
      ForgeState.loaderHide();
      setBulkRunning(false);
    }
  };

  const runRefreshExplorer = async () => {
    if (refreshing || !ForgeState.project) return;
    setRefreshing(true);
    try {
      await TabProjectExplorerState.GenerateResourceList(ForgeState.projectExplorerTab);
    } finally {
      setRefreshing(false);
    }
  };

  const hasProject = !!ForgeState.project;
  if (!hasProject) {
    return (
      <div
        className="scroll-container"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            color: "#ccc",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          No project is currently open.
        </div>
        <button
          onClick={handleOpenProject}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007acc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#005a9e";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007acc";
          }}
        >
          Open Project
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="scroll-container" style={{ width: "100%", flex: 1, overflow: "auto" }}>
        <ForgeTreeView>
          {resourceList.map((root: FileBrowserNode) => (
            <ExplorerTreeBranch
              key={`root-${root.id}`}
              node={root}
              expanded={expanded}
              setExpanded={setExpanded}
              depth={0}
            />
          ))}
        </ForgeTreeView>
      </div>
    </div>
  );
};
