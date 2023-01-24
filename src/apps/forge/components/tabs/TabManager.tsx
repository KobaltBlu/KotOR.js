import React, { useEffect, useRef, useState } from "react";
import TabButton from "./TabButton";
import { TabManagerProvider, useTabManager } from "../../context/TabManagerContext";
import { ForgeState } from "../../states/ForgeState";
declare const KotOR: any;
export interface TabManagerProps {
  // manager: EditorTabManager
}

export const TabManager = function(props: TabManagerProps){

  const tabManagerContext = useTabManager();
  const [render, rerender] = useState(false);
  const [manager, setTabManager] = tabManagerContext.manager;
  const [tabs, setTabs] = tabManagerContext.tabs;
  const [selectedTab, setSelectedTab] = tabManagerContext.selectedTab;

  const tabsMenuRef = useRef<HTMLUListElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('tabs', tabs);
  }, [tabs]);

  const onTabAdded = () => {
    console.log('added', manager.tabs, ForgeState.tabManager);
    // setSelectedTab(manager.tabs);
    rerender(!render);
  };

  const onTabRemoved = () => {
    console.log('removed', manager.tabs, ForgeState.tabManager);
    // manager.tabs[0].Show();
    // setSelectedTab(manager.tabs[0]);
    rerender(!render);
  };

  useEffect( () => {
    manager.addEventListener('onTabAdded', onTabAdded);
    manager.addEventListener('onTabRemoved', onTabRemoved);
    return () => {
      //Destructor
      manager.removeEventListener('onTabAdded', onTabAdded);
      manager.removeEventListener('onTabRemoved', onTabRemoved);
    }
  })

  return (
    <div id="tabs-container">
      <div className="tabManager">
        <ul ref={tabsMenuRef} className="tabs-menu">
          {
            tabs.map( (tab: any) => {
              return <TabButton key={tab.id} tab={tab} ></TabButton>
            })
          }
        </ul>
        <div ref={tabsContainerRef} className="tabs tab-content">
          {
            tabs.map( (tab: any) => {
              return (
                <div key={tab.id} className={`tab-pane ${tab.constructor.name} ${tab.visible ? 'active' : ''}`}>
                  {tab.render()}
                </div>
              )
            })
          }
        </div> 
      </div>
    </div>
  );

}

export default TabManager;
