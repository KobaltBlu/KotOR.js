import React, {forwardRef, useImperativeHandle, useState, useMemo, useCallback, memo} from "react";
import { TabResourceExplorerState } from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { EditorFile } from "@/apps/forge/EditorFile";
import { Form, ProgressBar } from "react-bootstrap";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ResourceListNode } from "@/apps/forge/components/treeview/ResourceListNode";
import { useContextMenu, ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { promptForDirectory, fileExists, writeFile } from "@/apps/forge/helpers/AssetExtraction";
import { createProgressModal, showExtractionResults } from "@/apps/forge/helpers/AssetExtraction";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabGFFEditorState } from "@/apps/forge/states/tabs";


export interface TabResourceExplorerProps extends BaseTabProps {
  tab: TabResourceExplorerState;
  nodes: FileBrowserNode[];
}

export const TabResourceExplorer = function(props: TabResourceExplorerProps){
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [visibleItems, setVisibleItems] = useState<FileBrowserNode[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const ITEMS_PER_PAGE = 100; // Virtual scrolling chunk size
  const { showContextMenu, ContextMenuComponent } = useContextMenu('dark');
  let searchQuery = '';
  let searchDelay: any;
  let currentSearchId = 0;

  const joinRelativePath = (...parts: string[]) => {
    return parts
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '');
  };

  const collectNodeResources = useCallback((node: FileBrowserNode, basePath = ''): Array<{ relativePath: string; path: string }> => {
    if (node.type === 'resource' && node.data?.path) {
      return [{
        relativePath: joinRelativePath(basePath, node.name),
        path: node.data.path,
      }];
    }

    const nextBase = node.type === 'group' ? joinRelativePath(basePath, node.name) : basePath;
    let results: Array<{ relativePath: string; path: string }> = [];
    for (const child of node.nodes || []) {
      results = results.concat(collectNodeResources(child, nextBase));
    }
    return results;
  }, []);

  const exportEntries = useCallback(async (entries: Array<{ relativePath: string; path: string }>, defaultName: string) => {
    if (!entries.length) {
      alert('No exportable resources found.');
      return;
    }

    const target = await promptForDirectory(defaultName);
    if (!target) {
      return;
    }

    const exportedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const failedFiles: string[] = [];
    const progressModal = createProgressModal();
    const total = entries.length;

    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const current = i + 1;
        progressModal.setProgress(current, total, `Exporting: ${entry.relativePath}`);
        try {
          const exists = await fileExists(entry.relativePath, target);
          if (exists) {
            skippedFiles.push(entry.relativePath);
            continue;
          }

          const editorFile = new EditorFile({
            path: entry.path,
            useGameFileSystem: true,
          });
          const response = await editorFile.readFile();
          if (!response?.buffer?.length) {
            failedFiles.push(entry.relativePath);
            continue;
          }

          await writeFile(entry.relativePath, response.buffer, target);
          exportedFiles.push(entry.relativePath);
        } catch (e) {
          console.error('Resource export failed for', entry.relativePath, e);
          failedFiles.push(entry.relativePath);
        }
      }
    } finally {
      showExtractionResults({
        modelName: defaultName,
        modelCount: 0,
        textureCount: 0,
        exportedFiles,
        skippedFiles,
        failedFiles,
      }, progressModal);
    }
  }, []);

  const handleExportNode = useCallback(async (node: FileBrowserNode) => {
    const baseName = (node.name || 'resource-export').replace(/[\\/:*?"<>|]/g, '_');
    if (node.type === 'resource') {
      await exportEntries([{ relativePath: node.name, path: node.data?.path }], baseName);
      return;
    }
    await exportEntries(collectNodeResources(node), baseName);
  }, [collectNodeResources, exportEntries]);

  const handleExportAllFromNode = useCallback(async (node: FileBrowserNode) => {
    const exportRoot = node.type === 'resource' && node.parent ? node.parent : node;
    const baseName = (exportRoot.name || 'resource-export').replace(/[\\/:*?"<>|]/g, '_');
    await exportEntries(collectNodeResources(exportRoot), baseName);
  }, [collectNodeResources, exportEntries]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: FileBrowserNode) => {
    const nodeExt = (node.name?.split('.').pop() || '').toLowerCase();
    const gffLikeExtensions = new Set([
      'are', 'bic', 'dlg', 'fac', 'git', 'gff', 'ifo', 'jrl', 'res',
      'utc', 'utd', 'ute', 'uti', 'utm', 'utp', 'uts', 'utt', 'utw'
    ]);
    const canOpenWithGff = node.type === 'resource' && !!node.data?.path && gffLikeExtensions.has(nodeExt);

    const items: ContextMenuItem[] = [
      {
        id: 'export-node',
        label: 'Export',
        onClick: () => {
          void handleExportNode(node);
        },
      },
      {
        id: 'export-all',
        label: 'Export All',
        onClick: () => {
          void handleExportAllFromNode(node);
        },
      },
    ];

    if (canOpenWithGff) {
      items.push(
        { id: 'sep-open-with-gff', separator: true },
        {
          id: 'open-with-gff',
          label: 'Open with GFF',
          onClick: () => {
            ForgeState.tabManager.addTab(new TabGFFEditorState({
              editorFile: new EditorFile({
                path: node.data.path,
                useGameFileSystem: true,
              }),
            }));
          },
        }
      );
    }

    showContextMenu(event.clientX, event.clientY, items);
  }, [handleExportNode, handleExportAllFromNode, showContextMenu]);

  const onNodeToggle = useCallback(async (node: FileBrowserNode) => {
    if (node.data?.lazyArchive && !node.data?.lazyLoaded) {
      await TabResourceExplorerState.ExpandLazyArchiveNode(node);
    }
  }, []);

  useEffectOnce(() => {
    const tab = props.tab as TabResourceExplorerState;
    if(tab){
      tab.onReload = () => {
        updateVisibleItems(TabResourceExplorerState.Resources);
      }
    }
  });

  const onSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(searchDelay);
    searchQuery = e.target.value.trim();
    setLoading(true);
    searchDelay = setTimeout(() => {
      search(searchQuery);
    }, 300); // Reduced debounce time for better responsiveness
  }, []);

  const search = useCallback(async (value: string) => {
    // Increment search ID to cancel previous searches
    const searchId = ++currentSearchId;
    
    try {
      if(!!value.length){
        // Process each root node asynchronously
        const searchPromises = TabResourceExplorerState.Resources.map( n => n.searchFor(value) );
        const searchResults = await Promise.all(searchPromises);
        
        // Only update if this is still the current search
        if(searchId === currentSearchId){
          updateVisibleItems(searchResults.flat());
        }
      }else{
        if(searchId === currentSearchId){
          updateVisibleItems(TabResourceExplorerState.Resources);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      if(searchId === currentSearchId){
        updateVisibleItems(TabResourceExplorerState.Resources);
      }
    } finally {
      if(searchId === currentSearchId){
        setLoading(false);
      }
    }
  }, []);

  // Handle pagination for large lists
  const updateVisibleItems = useCallback((items: FileBrowserNode[]) => {
    setResourceList(items);
    setCurrentPage(0);
    setVisibleItems(items.slice(0, ITEMS_PER_PAGE));
  }, [ITEMS_PER_PAGE]);

  const loadMoreItems = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newItems = resourceList.slice(startIndex, endIndex);
    
    if (newItems.length > 0) {
      setVisibleItems(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
    }
  }, [currentPage, resourceList, ITEMS_PER_PAGE]);

  // Memoize the resource list rendering to prevent unnecessary re-renders
  const resourceListItems = useMemo(() => {
    return visibleItems.map((node: FileBrowserNode) => (
      <ResourceListNode
        key={node.id}
        node={node}
        depth={0}
        onContextMenu={onNodeContextMenu}
        onToggleNode={onNodeToggle}
      />
    ));
  }, [visibleItems, onNodeContextMenu, onNodeToggle]);
  
  return (
    <div className="flex-vertical" style={{
      position: 'absolute',
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px',
    }}>
      <Form className="d-flex align-items-start" style={{
        padding: '5px 0',
      }}>
        <span style={{padding: '5px'}}>
          <i className="fa-solid fa-magnifying-glass"></i>
        </span>
        <Form.Control
          type="search"
          placeholder="Search"
          className="me-2"
          aria-label="Search"
          onChange={onSearchInput}
        />
      </Form>
      
      <div style={{
        display: `${!!loading ? 'block' : 'none'}`, 
        padding: '5px',
        width: '100%', 
        height: '100px',
      }}>
        <div style={{}}>
          <ProgressBar striped animated={true} now={100} label={`Searching...`} style={{
            minWidth: '100%',
            minHeight: '25px',
          }}/>
        </div>
      </div>
      <div className="scroll-container" style={{ 
        display: `${!loading ? 'block' : 'none'}`, 
        width:'100%', 
        overflow: 'auto',
      }}>
        <ForgeTreeView>
          {resourceListItems}
        </ForgeTreeView>
        {resourceList.length > visibleItems.length && (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={loadMoreItems}
            >
              Load More ({resourceList.length - visibleItems.length} remaining)
            </button>
          </div>
        )}
      </div>
      {ContextMenuComponent}
    </div>
  );

};

