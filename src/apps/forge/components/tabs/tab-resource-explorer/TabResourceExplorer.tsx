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
      if(value.length){
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
      <ResourceListNode key={node.id} node={node} depth={0} />
    ));
  }, [visibleItems]);
  
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
        display: `${loading ? 'block' : 'none'}`, 
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
    </div>
  );

};

