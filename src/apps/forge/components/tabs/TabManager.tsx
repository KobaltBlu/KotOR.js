import React, { useEffect, useRef, useState } from "react";
import TabButton from "@/apps/forge/components/tabs/TabButton";
import { useTabManager } from "@/apps/forge/context/TabManagerContext";
import { TabState } from "@/apps/forge/states/tabs";
import { ContextMenuItem, useContextMenu } from "@/apps/forge/components/common/ContextMenu";

export interface TabManagerProps {
  renderEmptyState?: () => React.ReactNode;
}

export const TabManager = function(props: TabManagerProps){

  const tabManagerContext = useTabManager();
  const [manager, setTabManager] = tabManagerContext.manager;
  const [tabs, setTabs] = tabManagerContext.tabs;
  const [selectedTab, setSelectedTab] = tabManagerContext.selectedTab;

  const tabsMenuRef = useRef<HTMLUListElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dragFromIndexRef = useRef<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);
  const { showContextMenu, ContextMenuComponent } = useContextMenu('dark');

  useEffect(() => {
    // console.log('tabs', tabs);
  }, [tabs]);

  const syncFromManager = () => {
    setTabs([...(manager?.tabs || [])]);
    setSelectedTab(manager?.currentTab);
  };

  useEffect( () => {
    manager.addEventListener('onTabAdded', syncFromManager);
    manager.addEventListener('onTabRemoved', syncFromManager);
    manager.addEventListener('onTabShow', syncFromManager);
    manager.addEventListener('onTabHide', syncFromManager);
    manager.addEventListener('onTabsReordered', syncFromManager);
    syncFromManager();
    return () => {
      //Destructor
      manager.removeEventListener('onTabAdded', syncFromManager);
      manager.removeEventListener('onTabRemoved', syncFromManager);
      manager.removeEventListener('onTabShow', syncFromManager);
      manager.removeEventListener('onTabHide', syncFromManager);
      manager.removeEventListener('onTabsReordered', syncFromManager);
    }
  }, [manager, setTabs, setSelectedTab])

  const visibleTabs = manager?.tabs || tabs;
  const hasTabs = visibleTabs.length > 0;

  const closeOthers = (tab: TabState) => {
    const managerTabs = [...(manager?.tabs || [])];
    for(let i = 0; i < managerTabs.length; i++){
      const t = managerTabs[i];
      if(t !== tab && t.isClosable){
        t.remove();
      }
    }
    tab.show();
    setSelectedTab(tab);
  };

  const closeToRight = (tab: TabState) => {
    const managerTabs = [...(manager?.tabs || [])];
    const selectedIdx = managerTabs.indexOf(tab);
    if(selectedIdx < 0){ return; }
    for(let i = managerTabs.length - 1; i > selectedIdx; i--){
      const t = managerTabs[i];
      if(t?.isClosable){
        t.remove();
      }
    }
    tab.show();
    setSelectedTab(tab);
  };

  const onTabContextMenu = (e: React.MouseEvent<HTMLLIElement>, tab: TabState, tabIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    tab.show();
    setSelectedTab(tab);

    const managerTabs = manager?.tabs || [];
    const rightTabs = managerTabs.slice(tabIndex + 1).filter((t: TabState) => t.isClosable);
    const closableOthers = managerTabs.filter((t: TabState) => t !== tab && t.isClosable);
    const items: ContextMenuItem[] = [
      {
        id: `close-${tab.id}`,
        label: 'Close',
        shortcut: 'Ctrl/Cmd+W',
        disabled: !tab.isClosable,
        onClick: () => tab.remove(),
      },
      {
        id: `close-others-${tab.id}`,
        label: 'Close Others',
        disabled: closableOthers.length === 0,
        onClick: () => closeOthers(tab),
      },
      {
        id: `close-right-${tab.id}`,
        label: 'Close to the Right',
        disabled: rightTabs.length === 0,
        onClick: () => closeToRight(tab),
      },
    ];
    showContextMenu(e.clientX, e.clientY, items);
  };

  const onTabDragStart = (e: React.DragEvent<HTMLLIElement>, tabIndex: number) => {
    e.stopPropagation();
    dragFromIndexRef.current = tabIndex;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(tabIndex));
  };

  const onTabDragOver = (e: React.DragEvent<HTMLLIElement>, tabIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if(dragOverIndex !== tabIndex){
      setDragOverIndex(tabIndex);
    }
  };

  const onTabDrop = (e: React.DragEvent<HTMLLIElement>, tabIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragFromIndexRef.current;
    dragFromIndexRef.current = -1;
    setDragOverIndex(-1);
    if(fromIndex < 0 || fromIndex === tabIndex){
      return;
    }
    manager.moveTab(fromIndex, tabIndex);
    syncFromManager();
  };

  const onTabDragEnd = () => {
    dragFromIndexRef.current = -1;
    setDragOverIndex(-1);
  };

  return (
    <div id="tabs-container">
      <div className="tabManager">
        <ul ref={tabsMenuRef} className="tabs-menu">
          {
            visibleTabs.map( (tab: any, index: number) => {
              return <TabButton
                key={tab.id}
                tab={tab}
                index={index}
                onContextMenu={onTabContextMenu}
                onDragStart={onTabDragStart}
                onDragOver={onTabDragOver}
                onDrop={onTabDrop}
                onDragEnd={onTabDragEnd}
                dragStateClassName={dragOverIndex === index ? 'drag-over' : ''}
              ></TabButton>
            })
          }
        </ul>
        <div ref={tabsContainerRef} className="tabs tab-content">
          {!hasTabs && typeof props.renderEmptyState === 'function' && props.renderEmptyState()}
          {
            visibleTabs.map( (tab: any) => {
              return (
                <div key={tab.id} className={`tab-pane ${tab.constructor.name} ${tab.visible ? 'active' : ''}`}>
                  {tab.render()}
                </div>
              )
            })
          }
        </div> 
      </div>
      {ContextMenuComponent}
    </div>
  );

}

export default TabManager;
