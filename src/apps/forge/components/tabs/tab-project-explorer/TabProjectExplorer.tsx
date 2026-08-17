import React, { useCallback, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabGFFEditorState, TabProjectExplorerState } from "@/apps/forge/states/tabs";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { Project } from "@/apps/forge/Project";
import { ModalNewProjectState } from "@/apps/forge/states/modal/ModalNewProjectState";
import { compileAllNssInProject } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { ModalBulkNssCompileResultsState } from "@/apps/forge/states/modal/ModalBulkNssCompileResultsState";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import { ContextMenuItem, useContextMenu } from "@/apps/forge/components/common/ContextMenu";
import { ForgeButton } from "@/apps/forge/components/ui";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { RecentProject } from "@/apps/forge/RecentProject";
import {
  ListedVirtualProjectFolder,
  isOriginPrivateFileSystemAvailable,
  loadVirtualProjectFoldersForRestore,
} from "@/apps/forge/virtual/VirtualProjectFolder";
import {
  copyTextToClipboard,
  explorerCopyPath,
  explorerCopyRelativePath,
  explorerNodeRelPath,
  explorerTargetDir,
  isExplorerRootNode,
  isProtectedExplorerPath,
  joinProjectRel,
  sanitizeProjectEntryName,
} from "@/apps/forge/helpers/projectExplorerActions";
import { retargetOpenProjectEditors } from "@/apps/forge/helpers/retargetProjectTabs";
import "@/apps/forge/components/tabs/tab-project-explorer/TabProjectExplorer.scss";

const GFF_LIKE_EXTENSIONS = new Set([
  "are",
  "bic",
  "dlg",
  "fac",
  "git",
  "gff",
  "ifo",
  "jrl",
  "res",
  "utc",
  "utd",
  "ute",
  "uti",
  "utm",
  "utp",
  "uts",
  "utt",
  "utw",
]);

function folderExpanded(expanded: Record<string, boolean>, relKey: string): boolean {
  if (expanded[relKey] !== undefined) return expanded[relKey] as boolean;
  return relKey === "";
}

function ExplorerTreeBranch(props: {
  node: FileBrowserNode;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  depth: number;
  onNodeContextMenu?: (event: React.MouseEvent, node: FileBrowserNode) => void;
}) {
  const { node, expanded, setExpanded, depth, onNodeContextMenu } = props;
  const isFolder = node.type === "group";

  if (!isFolder) {
    const resPath = node.data?.path as string | undefined;
    return (
      <ListItemNode
        id={`file:${String(node.data?.relPath ?? resPath ?? node.name)}`}
        name={node.name}
        depth={depth}
        hasChildren={false}
        isExpanded={false}
        iconType="file"
        onContextMenu={(e) => {
          if (typeof onNodeContextMenu === "function") {
            onNodeContextMenu(e, node);
          }
        }}
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
      hasChildren={true}
      isExpanded={isExp}
      iconType="folder"
      onToggle={toggle}
      onClick={toggle}
      onContextMenu={(e) => {
        if (typeof onNodeContextMenu === "function") {
          onNodeContextMenu(e, node);
        }
      }}
    >
      {node.nodes.map((child: FileBrowserNode) => (
        <ExplorerTreeBranch
          key={`${child.type}-${child.data?.relPath ?? child.data?.path ?? ""}-${child.id}`}
          node={child}
          expanded={expanded}
          setExpanded={setExpanded}
          depth={depth + 1}
          onNodeContextMenu={onNodeContextMenu}
        />
      ))}
    </ListItemNode>
  );
}

function promptEntryName(title: string, initial: string): string | undefined {
  const raw = window.prompt(title, initial);
  if (raw == null) {
    return undefined;
  }
  const name = sanitizeProjectEntryName(raw);
  if (!name) {
    window.alert("Enter a valid name. The name cannot be empty or contain \\ / : * ? \" < > |");
    return undefined;
  }
  return name;
}

export const TabProjectExplorer = function (props: BaseTabProps) {
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "": true });
  const [virtualProjects, setVirtualProjects] = useState<ListedVirtualProjectFolder[]>([]);
  const [restoringName, setRestoringName] = useState<string | null>(null);
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const refreshExplorer = useCallback(async () => {
    await TabProjectExplorerState.RefreshQuiet(props.tab as TabProjectExplorerState);
  }, [props.tab]);

  const refreshVirtualProjects = useCallback(async () => {
    const listed = await loadVirtualProjectFoldersForRestore(ForgeState.recentProjects);
    setVirtualProjects(listed);
  }, []);

  const createFileAt = useCallback(async (dirRel: string) => {
    const name = promptEntryName("New File", "untitled.txt");
    if (!name) {
      return;
    }
    const rel = joinProjectRel(dirRel, name);
    if (await ProjectFileSystem.exists(rel)) {
      window.alert(`A file or folder named "${name}" already exists.`);
      return;
    }
    const parent = dirRel;
    if (parent && !(await ProjectFileSystem.exists(parent))) {
      const made = await ProjectFileSystem.mkdir(parent, { recursive: true });
      if (!made) {
        window.alert("Could not create the parent folder.");
        return;
      }
    }
    const written = await ProjectFileSystem.writeFile(rel, new Uint8Array(0));
    if (!written) {
      window.alert("Could not create the file.");
      return;
    }
    setExpanded((prev) => ({ ...prev, [dirRel]: true }));
    await refreshExplorer();
    FileTypeManager.onOpenResource(
      new EditorFile({
        path: EditorFile.referenceURIForProjectRelative(rel),
        useProjectFileSystem: true,
      })
    );
  }, [refreshExplorer]);

  const createFolderAt = useCallback(async (dirRel: string) => {
    const name = promptEntryName("New Folder", "New Folder");
    if (!name) {
      return;
    }
    const rel = joinProjectRel(dirRel, name);
    if (await ProjectFileSystem.exists(rel)) {
      window.alert(`A file or folder named "${name}" already exists.`);
      return;
    }
    const made = await ProjectFileSystem.mkdir(rel, { recursive: true });
    if (!made) {
      window.alert("Could not create the folder.");
      return;
    }
    setExpanded((prev) => ({ ...prev, [dirRel]: true, [rel]: true }));
    await refreshExplorer();
  }, [refreshExplorer]);

  const renameNode = useCallback(async (node: FileBrowserNode) => {
    if (isExplorerRootNode(node)) {
      return;
    }
    const rel = explorerNodeRelPath(node);
    if (!rel.length || isProtectedExplorerPath(rel)) {
      return;
    }
    const name = promptEntryName("Rename", node.name);
    if (!name || name === node.name) {
      return;
    }
    const parentDir = node.type === "group"
      ? (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "")
      : explorerTargetDir(node);
    const dest = joinProjectRel(parentDir, name);
    if (await ProjectFileSystem.exists(dest)) {
      window.alert(`A file or folder named "${name}" already exists.`);
      return;
    }
    const ok = await ProjectFileSystem.rename(rel, dest);
    if (!ok) {
      window.alert("Could not rename.");
      return;
    }
    retargetOpenProjectEditors(rel, dest);
    await refreshExplorer();
  }, [refreshExplorer]);

  const deleteNode = useCallback(async (node: FileBrowserNode) => {
    if (isExplorerRootNode(node)) {
      return;
    }
    const rel = explorerNodeRelPath(node);
    if (!rel.length || isProtectedExplorerPath(rel)) {
      return;
    }
    const kind = node.type === "group" ? "folder" : "file";
    if (!window.confirm(`Are you sure you want to delete the ${kind} '${node.name}'?`)) {
      return;
    }
    const ok = node.type === "group"
      ? await ProjectFileSystem.rmdir(rel, { recursive: true })
      : await ProjectFileSystem.unlink(rel);
    if (!ok) {
      window.alert("Could not delete.");
      return;
    }
    await refreshExplorer();
  }, [refreshExplorer]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FileBrowserNode) => {
      const isRoot = isExplorerRootNode(node);
      const isFolder = node.type === "group";
      const rel = explorerNodeRelPath(node);
      const protectedPath = isRoot || isProtectedExplorerPath(rel);
      const nodeExt = (node.name?.split(".").pop() || "").toLowerCase();
      const canOpenWithGff = !isFolder && !!node.data?.path && GFF_LIKE_EXTENSIONS.has(nodeExt);
      const canOpenWithHex = !isFolder && !!node.data?.path;
      const targetDir = explorerTargetDir(node);

      const items: ContextMenuItem[] = [
        {
          id: "new-file",
          label: "New File...",
          onClick: () => { void createFileAt(targetDir); },
        },
        {
          id: "new-folder",
          label: "New Folder...",
          onClick: () => { void createFolderAt(targetDir); },
        },
      ];

      if (!isFolder && node.data?.path) {
        items.push(
          { id: "sep-open", separator: true },
          {
            id: "open",
            label: "Open",
            onClick: () => {
              FileTypeManager.onOpenResource(
                new EditorFile({
                  path: node.data.path,
                  useProjectFileSystem: true,
                }),
              );
            },
          },
        );
        if (canOpenWithGff) {
          items.push({
            id: "open-with-gff",
            label: "Open with GFF",
            onClick: () => {
              ForgeState.tabManager.addTab(
                new TabGFFEditorState({
                  editorFile: new EditorFile({
                    path: node.data!.path,
                    useProjectFileSystem: true,
                  }),
                }),
              );
            },
          });
        }
        if (canOpenWithHex) {
          items.push({
            id: "open-with-hex",
            label: "Open in Hex Editor",
            onClick: () => {
              FileTypeManager.openHexEditor({
                path: node.data!.path,
                useProjectFileSystem: true,
              });
            },
          });
        }
      }

      items.push(
        { id: "sep-copy", separator: true },
        {
          id: "copy-path",
          label: "Copy Path",
          onClick: () => { void copyTextToClipboard(explorerCopyPath(node, ProjectFileSystem.rootDirectoryPath)); },
        },
        {
          id: "copy-relative-path",
          label: "Copy Relative Path",
          onClick: () => { void copyTextToClipboard(explorerCopyRelativePath(node)); },
        },
        { id: "sep-mutate", separator: true },
        {
          id: "rename",
          label: "Rename...",
          disabled: protectedPath,
          onClick: () => { void renameNode(node); },
        },
        {
          id: "delete",
          label: "Delete",
          disabled: protectedPath,
          onClick: () => { void deleteNode(node); },
        },
      );

      showContextMenu(event.clientX, event.clientY, items);
    },
    [createFileAt, createFolderAt, deleteNode, renameNode, showContextMenu],
  );

  useEffectOnce(() => {
    const tab = props.tab as TabProjectExplorerState;
    if (tab) {
      tab.onReload = () => {
        setResourceList([...TabProjectExplorerState.Resources]);
        if (!ForgeState.project) {
          void refreshVirtualProjects();
        }
      };
      setResourceList([...TabProjectExplorerState.Resources]);
    }
    ForgeState.addEventListener("onRecentProjectsUpdated", refreshVirtualProjects);
    void refreshVirtualProjects();
    return () => {
      ForgeState.removeEventListener("onRecentProjectsUpdated", refreshVirtualProjects);
    };
  });

  const handleOpenProject = () => {
    Project.OpenByDirectory();
  };

  const handleNewProject = () => {
    const newProjectModalState = new ModalNewProjectState();
    ForgeState.modalManager.addModal(newProjectModalState);
    newProjectModalState.open();
  };

  const restoreVirtualProject = async (entry: ListedVirtualProjectFolder) => {
    if (restoringName || ForgeState.project) {
      return;
    }
    setRestoringName(entry.name);
    try {
      const opened = await Project.OpenRecent(new RecentProject({
        name: entry.name,
        handle: entry.handle,
        virtual: true,
      }));
      if (!opened) {
        window.alert(`Could not restore "${entry.name}".`);
        await refreshVirtualProjects();
      }
    } finally {
      setRestoringName(null);
    }
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
    const canListVirtual = isOriginPrivateFileSystemAvailable() || virtualProjects.length > 0;
    return (
      <div className="project-explorer-welcome">
        <div className="project-explorer-welcome__message">
          No project is currently open.
        </div>
        <div className="project-explorer-welcome__actions">
          <ForgeButton variant="primary" onClick={handleNewProject}>
            New Project
          </ForgeButton>
          <ForgeButton variant="primary" onClick={handleOpenProject}>
            Open Project
          </ForgeButton>
        </div>
        {canListVirtual ? (
          <div className="project-explorer-welcome__virtual">
            <h2 className="project-explorer-welcome__virtual-title">Virtual Projects</h2>
            {virtualProjects.length > 0 ? (
              <ul className="project-explorer-welcome__virtual-list">
                {virtualProjects.map((entry) => (
                  <li key={entry.name}>
                    <button
                      type="button"
                      className="project-explorer-welcome__virtual-item"
                      disabled={!!restoringName}
                      title={`Restore ${entry.name}`}
                      onClick={() => { void restoreVirtualProject(entry); }}
                    >
                      <i className="fa-solid fa-folder" aria-hidden="true" />
                      <span className="project-explorer-welcome__virtual-name">{entry.name}</span>
                      <span className="project-explorer-welcome__virtual-action">
                        {restoringName === entry.name ? "Restoring..." : "Restore"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="project-explorer-welcome__virtual-hint">
                Virtual folders created in this browser are kept here so you can restore them later.
              </p>
            )}
          </div>
        ) : null}
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
              onNodeContextMenu={onNodeContextMenu}
            />
          ))}
        </ForgeTreeView>
      </div>
      {ContextMenuComponent}
    </div>
  );
};
