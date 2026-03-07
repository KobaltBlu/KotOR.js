import React, {forwardRef, useImperativeHandle, useState, useMemo, useCallback, memo} from "react";
import { TabResourceExplorerState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { FileTypeManager } from "../../../FileTypeManager";
import { EditorFile } from "../../../EditorFile";
import { Form, ProgressBar } from "react-bootstrap";
import { FileBrowserNode } from "../../../FileBrowserNode";
import { ForgeTreeView } from "../../treeview/ForgeTreeView";
import { ResourceListNode } from "../../treeview/ResourceListNode";
import { useContextMenu, ContextMenuItem } from "../../common/ContextMenu";
import { ForgeState } from "../../../states/ForgeState";
import { TabReferenceFinderState } from "../../../states/tabs/TabReferenceFinderState";
import "./TabResourceExplorer.scss";


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
  let searchQuery = '';
  let searchDelay: any;
  let currentSearchId = 0;

  const { showContextMenu, ContextMenuComponent } = useContextMenu();

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
        onContextMenu={(e, n) => {
          if(n.type !== 'resource') return;
          e.preventDefault();
          e.stopPropagation();

          const resref = (n.data?.resref || (n.name || '').split('.')[0] || '').toString();
          const items: ContextMenuItem[] = [
            {
              id: 'open-file',
              label: 'Open File',
              onClick: () => {
                FileTypeManager.onOpenResource(
                  new EditorFile({
                    path: n.data.path,
                    useGameFileSystem: true,
                  })
                );
              }
            },
            {
              id: 'copy-resref',
              label: 'Copy ResRef',
              disabled: !resref.length,
              onClick: async () => {
                if (resref && navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(resref);
                }
              }
            },
            { id: 'sep-1', separator: true },
            {
              id: 'find-references',
              label: 'Find References…',
              disabled: !resref.length,
              onClick: () => {
                ForgeState.tabManager.addTab(
                  new TabReferenceFinderState({ query: resref, scope: 'project' })
                );
              }
            }
          ];

          showContextMenu((e as any).clientX, (e as any).clientY, items);
        }}
      />
    ));
  }, [visibleItems, showContextMenu]);

  return (
    <div className="tab-resource-explorer flex-vertical">
      <Form className="tab-resource-explorer__form d-flex align-items-start">
        <span className="tab-resource-explorer__search-icon">
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

      <div className={`tab-resource-explorer__loading${loading ? '' : ' tab-resource-explorer__loading--hidden'}`}>
        <ProgressBar
          className="tab-resource-explorer__progress"
          striped
          animated={true}
          now={100}
          label="Searching..."
        />
      </div>
      <div className={`scroll-container tab-resource-explorer__scroll${loading ? ' tab-resource-explorer__scroll--hidden' : ''}`}>
        <ForgeTreeView>
          {resourceListItems}
        </ForgeTreeView>
        {resourceList.length > visibleItems.length && (
          <div className="tab-resource-explorer__load-more">
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

