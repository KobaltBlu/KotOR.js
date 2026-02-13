import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { MenuBar, MenuItem } from "../../common/MenuBar";

import { DLGTreeNode, DLGNodeReference } from "../../../interfaces/DLGTreeNode";
import * as KotOR from "../../../KotOR";
import { TabDLGEditorState } from "../../../states/tabs";
import { DLGClipboardManager } from "../../../utils/DLGClipboardManager";
import { DLGDragDropManager } from "../../../utils/DLGDragDropManager";
import { DLGNavigationManager } from "../../../utils/DLGNavigationManager";
import { DLGTreeModel } from "../../../utils/DLGTreeModel";
import { DLGUndoManager } from "../../../utils/DLGUndoManager";
import { DLGValidation, ValidationSeverity } from "../../../utils/DLGValidation";

import { DLGDialogPropertiesPanel } from "./DLGDialogPropertiesPanel";
import { DLGNodePropertiesPanel } from "./DLGNodePropertiesPanel";
import { DLGReferenceChooser } from "./DLGReferenceChooser";
import { DLGSearchBar } from "./DLGSearchBar";
import { DLGTreeView } from "./DLGTreeView";

import "./TabDLGEditor.scss";

interface BaseTabProps {
  tab: TabDLGEditorState;
}

type ViewMode = 'tree' | 'list' | 'split';
type PanelMode = 'node' | 'dialog' | 'both';
type SearchMode = 'search' | 'goto' | 'filter';

export const TabDLGEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabDLGEditorState;

  // Core state
  const [dlg, setDlg] = useState(tab.dlg);
  const [selectedNode, setSelectedNode] = useState<KotOR.DLGNode | undefined>(tab.selectedNode);
  const [_selectedNodeIndex, setSelectedNodeIndex] = useState(tab.selectedNodeIndex);
  const [selectedNodeType, setSelectedNodeType] = useState<'starting' | 'entry' | 'reply' | null>(tab.selectedNodeType);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [panelMode, setPanelMode] = useState<PanelMode>('node');
  const [showSearch, setShowSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('search');

  // Tree state
  const [treeModel, setTreeModel] = useState<DLGTreeModel | null>(null);
  const [selectedTreeNode, setSelectedTreeNode] = useState<DLGTreeNode | null>(null);

  // Reference chooser state
  const [showReferenceChooser, setShowReferenceChooser] = useState(false);
  const [references, setReferences] = useState<DLGNodeReference[]>([]);

  // Validation state
  const [validationIssues, setValidationIssues] = useState<ReturnType<DLGValidation['validate']>>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Managers
  const undoManager = useRef(new DLGUndoManager(100));
  const navigationManager = useRef(new DLGNavigationManager(50));
  const clipboardManager = useRef(new DLGClipboardManager());
  const dragDropManager = useRef<DLGDragDropManager | null>(null);

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Navigation state
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Initialize tree model when dialog loads
  useEffect(() => {
    if (dlg) {
      const model = new DLGTreeModel(dlg);
      setTreeModel(model);
      dragDropManager.current = new DLGDragDropManager(model);

      // Run validation
      const validation = new DLGValidation(dlg);
      setValidationIssues(validation.validate());
    }
  }, [dlg]);

  // Subscribe to undo manager changes
  useEffect(() => {
    const unsubscribe = undoManager.current.onChange(() => {
      setCanUndo(undoManager.current.canUndo());
      setCanRedo(undoManager.current.canRedo());
      tab.file.unsaved_changes = true;
    });
    return unsubscribe;
  }, [tab]);

  // Subscribe to navigation manager changes
  useEffect(() => {
    const unsubscribe = navigationManager.current.onChange(() => {
      setCanGoBack(navigationManager.current.canGoBack());
      setCanGoForward(navigationManager.current.canGoForward());
    });
    return unsubscribe;
  }, []);

  // Subscribe to tab events
  useEffect(() => {
    const loadHandler = () => {
      setDlg(tab.dlg);
    };
    const selectHandler = () => {
      setSelectedNode(tab.selectedNode);
      setSelectedNodeIndex(tab.selectedNodeIndex);
      setSelectedNodeType(tab.selectedNodeType);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onNodeSelected', selectHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onNodeSelected', selectHandler);
    };
  }, [tab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (modKey && e.key === 'f') {
        e.preventDefault();
        setSearchMode('search');
        setShowSearch(true);
      } else if (modKey && e.key === 'g') {
        e.preventDefault();
        setSearchMode('goto');
        setShowSearch(true);
      } else if (modKey && e.key === 's') {
        e.preventDefault();
        tab.save();
      } else if (modKey && e.key === 'c' && selectedTreeNode) {
        e.preventDefault();
        handleCopy();
      } else if (modKey && e.key === 'x' && selectedTreeNode) {
        e.preventDefault();
        handleCut();
      } else if (modKey && e.key === 'v' && clipboardManager.current.hasClipboard()) {
        e.preventDefault();
        handlePaste();
      } else if (e.key === 'Escape') {
        setShowSearch(false);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setSearchMode('search');
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTreeNode, canUndo, canRedo]);

  // Handlers
  const handleUndo = useCallback(() => {
    if (undoManager.current.undo()) {
      treeModel?.refresh();
    }
  }, [treeModel]);

  const handleRedo = useCallback(() => {
    if (undoManager.current.redo()) {
      treeModel?.refresh();
    }
  }, [treeModel]);

  const handleCopy = useCallback(() => {
    if (!selectedTreeNode) return;
    clipboardManager.current.copy(
      selectedTreeNode.dlgNode,
      selectedTreeNode.nodeType,
      selectedTreeNode.listIndex
    );
  }, [selectedTreeNode]);

  const handleCut = useCallback(() => {
    if (!selectedTreeNode) return;
    clipboardManager.current.cut(
      selectedTreeNode.dlgNode,
      selectedTreeNode.nodeType,
      selectedTreeNode.listIndex
    );
  }, [selectedTreeNode]);

  const handlePaste = useCallback(() => {
    const clipboard = clipboardManager.current.getClipboard();
    if (!clipboard || !selectedTreeNode) return;

    // Add link to clipboard node
    treeModel?.addLink(
      selectedTreeNode.id,
      clipboard.listIndex,
      clipboard.nodeType
    );

    tab.file.unsaved_changes = true;
  }, [selectedTreeNode, treeModel, tab]);

  const handleNavigateBack = useCallback(() => {
    const nodeId = navigationManager.current.goBack();
    if (nodeId && treeModel) {
      treeModel.selectNode(nodeId);
    }
  }, [treeModel]);

  const handleNavigateForward = useCallback(() => {
    const nodeId = navigationManager.current.goForward();
    if (nodeId && treeModel) {
      treeModel.selectNode(nodeId);
    }
  }, [treeModel]);

  const handleTreeNodeSelect = useCallback((node: DLGTreeNode | null) => {
    setSelectedTreeNode(node);
    if (node) {
      setSelectedNode(node.dlgNode);
      setSelectedNodeIndex(node.listIndex);
      setSelectedNodeType(
        node.nodeType === 0 ? 'starting' : node.nodeType === 1 ? 'entry' : 'reply'
      );
      navigationManager.current.navigateTo(node.id);
      tab.selectNode(node.dlgNode, node.listIndex, node.nodeType === 0 ? 'starting' : node.nodeType === 1 ? 'entry' : 'reply');
    } else {
      setSelectedNode(undefined);
      setSelectedNodeIndex(-1);
      setSelectedNodeType(null);
    }
  }, [tab]);

  const handleTreeNodeDoubleClick = useCallback((node: DLGTreeNode) => {
    // Check for references
    if (treeModel) {
      const refs = treeModel.getNodeReferences(node.listIndex, node.nodeType);
      if (refs.length > 1) {
        setReferences(refs);
        setShowReferenceChooser(true);
      }
    }
  }, [treeModel]);

  const handleTreeNodeContextMenu = useCallback((_node: DLGTreeNode, _event: React.MouseEvent) => {
    // Show context menu
    // TODO: Implement context menu
  }, []);

  const handleNodeUpdate = useCallback(() => {
    tab.file.unsaved_changes = true;
    treeModel?.refresh();

    // Re-run validation
    if (dlg) {
      const validation = new DLGValidation(dlg);
      setValidationIssues(validation.validate());
    }
  }, [tab, treeModel, dlg]);

  const handleReferenceSelect = useCallback((reference: DLGNodeReference) => {
    setShowReferenceChooser(false);
    if (treeModel) {
      treeModel.selectNode(reference.sourceNode.id);
    }
  }, [treeModel]);

  const handleRunValidation = useCallback(() => {
    if (dlg) {
      const validation = new DLGValidation(dlg);
      setValidationIssues(validation.validate());
      setShowValidation(true);
    }
  }, [dlg]);

  const handleAutoFix = useCallback(() => {
    if (dlg) {
      const validation = new DLGValidation(dlg);
      const fixed = validation.autoFix();
      setValidationIssues(validation.validate());
      treeModel?.refresh();
      tab.file.unsaved_changes = true;
      alert(`Fixed ${fixed} issue(s)`);
    }
  }, [dlg, treeModel, tab]);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save(), disabled: !tab.file.unsaved_changes },
        { label: 'Save As', onClick: () => tab.saveAs() },
        { label: 'Revert', onClick: () => tab.revert(), disabled: !tab.file.unsaved_changes }
      ]
    },
    {
      label: 'Edit',
      children: [
        { label: 'Undo', onClick: handleUndo, disabled: !canUndo },
        { label: 'Redo', onClick: handleRedo, disabled: !canRedo },
        { label: '---' },
        { label: 'Copy', onClick: handleCopy, disabled: !selectedTreeNode },
        { label: 'Cut', onClick: handleCut, disabled: !selectedTreeNode },
        { label: 'Paste', onClick: handlePaste, disabled: !clipboardManager.current.hasClipboard() },
        { label: '---' },
        { label: 'Find', onClick: () => { setSearchMode('search'); setShowSearch(true); } },
        { label: 'Go To', onClick: () => { setSearchMode('goto'); setShowSearch(true); } }
      ]
    },
    {
      label: 'View',
      children: [
        { label: 'Tree View', onClick: () => setViewMode('tree'), disabled: viewMode === 'tree' },
        { label: 'List View', onClick: () => setViewMode('list'), disabled: viewMode === 'list' },
        { label: 'Split View', onClick: () => setViewMode('split'), disabled: viewMode === 'split' },
        { label: '---' },
        { label: 'Node Properties', onClick: () => setPanelMode('node'), disabled: panelMode === 'node' },
        { label: 'Dialog Properties', onClick: () => setPanelMode('dialog'), disabled: panelMode === 'dialog' },
        { label: 'Both Panels', onClick: () => setPanelMode('both'), disabled: panelMode === 'both' },
        { label: '---' },
        { label: 'Expand All', onClick: () => treeModel?.expandAll() },
        { label: 'Collapse All', onClick: () => treeModel?.collapseAll() }
      ]
    },
    {
      label: 'Navigate',
      children: [
        { label: 'Back', onClick: handleNavigateBack, disabled: !canGoBack },
        { label: 'Forward', onClick: handleNavigateForward, disabled: !canGoForward },
        { label: '---' },
        { label: 'Go To Node', onClick: () => { setSearchMode('goto'); setShowSearch(true); } },
        { label: 'Find References', onClick: () => { /* TODO */ }, disabled: !selectedTreeNode }
      ]
    },
    {
      label: 'Tools',
      children: [
        { label: 'Validate Dialog', onClick: handleRunValidation },
        { label: 'Auto-Fix Issues', onClick: handleAutoFix, disabled: validationIssues.length === 0 },
        { label: 'Show Validation Results', onClick: () => setShowValidation(!showValidation) }
      ]
    }
  ], [
    tab,
    viewMode,
    panelMode,
    canUndo,
    canRedo,
    canGoBack,
    canGoForward,
    selectedTreeNode,
    clipboardManager.current.hasClipboard(),
    validationIssues.length,
    showValidation,
    treeModel,
    handleUndo,
    handleRedo,
    handleCopy,
    handleCut,
    handlePaste,
    handleNavigateBack,
    handleNavigateForward,
    handleRunValidation,
    handleAutoFix
  ]);

  // Statistics
  const stats = useMemo(() => {
    if (!dlg) return null;
    return {
      starting: dlg.startingList.length,
      entries: dlg.entryList.length,
      replies: dlg.replyList.length,
      totalNodes: dlg.startingList.length + dlg.entryList.length + dlg.replyList.length,
      errors: validationIssues.filter(i => i.severity === ValidationSeverity.Error).length,
      warnings: validationIssues.filter(i => i.severity === ValidationSeverity.Warning).length,
      info: validationIssues.filter(i => i.severity === ValidationSeverity.Info).length
    };
  }, [dlg, validationIssues]);

  // Toolbar
  const renderToolbar = () => (
    <div className="forge-dlg-editor__toolbar">
      <button
        className="toolbar-button"
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        className="toolbar-button"
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
      <div className="toolbar-separator" />
      <button
        className="toolbar-button"
        onClick={handleNavigateBack}
        disabled={!canGoBack}
        title="Navigate Back"
      >
        ←
      </button>
      <button
        className="toolbar-button"
        onClick={handleNavigateForward}
        disabled={!canGoForward}
        title="Navigate Forward"
      >
        →
      </button>
      <div className="toolbar-separator" />
      <button
        className="toolbar-button"
        onClick={handleCopy}
        disabled={!selectedTreeNode}
        title="Copy (Ctrl+C)"
      >
        📋
      </button>
      <button
        className="toolbar-button"
        onClick={handlePaste}
        disabled={!clipboardManager.current.hasClipboard()}
        title="Paste (Ctrl+V)"
      >
        📄
      </button>
      <div className="toolbar-separator" />
      <button
        className="toolbar-button"
        onClick={() => { setSearchMode('search'); setShowSearch(true); }}
        title="Search (Ctrl+F)"
      >
        🔍
      </button>
      <button
        className="toolbar-button"
        onClick={() => { setSearchMode('goto'); setShowSearch(true); }}
        title="Go To (Ctrl+G)"
      >
        🎯
      </button>
      <div className="toolbar-separator" />
      <button
        className="toolbar-button"
        onClick={handleRunValidation}
        title="Validate Dialog"
      >
        ✓
      </button>
      {stats && (
        <div className="toolbar-stats">
          {stats.errors > 0 && <span className="stat-error">❌ {stats.errors}</span>}
          {stats.warnings > 0 && <span className="stat-warning">⚠ {stats.warnings}</span>}
          {stats.info > 0 && <span className="stat-info">ℹ {stats.info}</span>}
        </div>
      )}
    </div>
  );

  // Validation panel
  const renderValidationPanel = () => {
    if (!showValidation || validationIssues.length === 0) return null;

    return (
      <div className="forge-dlg-editor__validation">
        <div className="validation-header">
          <h4>Validation Results</h4>
          <button onClick={() => setShowValidation(false)}>×</button>
        </div>
        <div className="validation-content">
          {validationIssues.map((issue, idx) => (
            <div
              key={idx}
              className={`validation-issue validation-${issue.severity}`}
              onClick={() => {
                if (issue.nodeIndex !== undefined && issue.nodeType !== undefined && treeModel) {
                  const nodeId = `${issue.nodeType}-${issue.nodeIndex}`;
                  treeModel.selectNode(nodeId);
                }
              }}
            >
              <span className="issue-severity">
                {issue.severity === ValidationSeverity.Error ? '❌' :
                  issue.severity === ValidationSeverity.Warning ? '⚠' : 'ℹ'}
              </span>
              <span className="issue-message">{issue.message}</span>
              {issue.autoFix && <span className="issue-fixable">🔧</span>}
            </div>
          ))}
        </div>
        {validationIssues.some(i => i.autoFix) && (
          <div className="validation-footer">
            <button onClick={handleAutoFix}>Auto-Fix All</button>
          </div>
        )}
      </div>
    );
  };

  if (!dlg || !treeModel) {
    return (
      <div className="forge-dlg-editor">
        <MenuBar items={menuItems} />
        <div className="forge-dlg-editor__loading">Loading dialog...</div>
      </div>
    );
  }

  return (
    <div className="forge-dlg-editor">
      <MenuBar items={menuItems} />
      {renderToolbar()}

      {showSearch && (
        <DLGSearchBar
          model={treeModel}
          mode={searchMode}
          onClose={() => setShowSearch(false)}
          onNavigate={(node: DLGTreeNode) => {
            treeModel.selectNode(node.id);
            setShowSearch(false);
          }}
        />
      )}

      <div className="forge-dlg-editor__container">
        <div className="forge-dlg-editor__sidebar">
          <DLGTreeView
            model={treeModel}
            onNodeSelect={handleTreeNodeSelect}
            onNodeDoubleClick={handleTreeNodeDoubleClick}
            onNodeContextMenu={handleTreeNodeContextMenu}
          />
        </div>

        <div className="forge-dlg-editor__main">
          {panelMode === 'node' && selectedNode && (
            <DLGNodePropertiesPanel
              node={selectedNode}
              nodeType={selectedNodeType}
              undoManager={undoManager.current}
              onUpdate={handleNodeUpdate}
            />
          )}

          {panelMode === 'dialog' && (
            <DLGDialogPropertiesPanel
              dlg={dlg}
              onUpdate={handleNodeUpdate}
            />
          )}

          {panelMode === 'both' && (
            <>
              {selectedNode && (
                <DLGNodePropertiesPanel
                  node={selectedNode}
                  nodeType={selectedNodeType}
                  undoManager={undoManager.current}
                  onUpdate={handleNodeUpdate}
                />
              )}
              <DLGDialogPropertiesPanel
                dlg={dlg}
                onUpdate={handleNodeUpdate}
              />
            </>
          )}

          {!selectedNode && panelMode === 'node' && (
            <div className="forge-dlg-editor__no-selection">
              <h3>No Node Selected</h3>
              <p>Select a node from the tree to view and edit its properties.</p>
              {stats && (
                <div className="forge-dlg-editor__stats">
                  <h4>Dialog Statistics</h4>
                  <table>
                    <tbody>
                      <tr>
                        <td>Starting Nodes:</td>
                        <td>{stats.starting}</td>
                      </tr>
                      <tr>
                        <td>Entries (NPC):</td>
                        <td>{stats.entries}</td>
                      </tr>
                      <tr>
                        <td>Replies (PC):</td>
                        <td>{stats.replies}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Nodes:</strong></td>
                        <td><strong>{stats.totalNodes}</strong></td>
                      </tr>
                      {dlg.vo_id && (
                        <tr>
                          <td>VO ID:</td>
                          <td>{dlg.vo_id}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renderValidationPanel()}

      {showReferenceChooser && (
        <DLGReferenceChooser
          references={references}
          model={treeModel}
          onSelect={handleReferenceSelect}
          onCancel={() => setShowReferenceChooser(false)}
          isOpen={showReferenceChooser}
        />
      )}
    </div>
  );
};
