import React, { useEffect, useRef, useState } from "react";
import TabButton from "./TabButton";
import { TabManagerProvider, useTabManager } from "../../context/TabManagerContext";
import { ForgeState } from "../../states/ForgeState";
import { TabState } from "../../states/tabs/TabState";
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
    // console.log('tabs', tabs);
  }, [tabs]);

  const onTabAdded = () => {
    // console.log('added', ForgeState.tabManager.tabs);
    rerender(!render);
  };

  const onTabRemoved = () => {
    // console.log('removed', ForgeState.tabManager.tabs);
    rerender(!render);
  };

  const onTabShow = (tab: TabState) => {
    // console.log('show', tab);
    rerender(!render);
  };

  const onTabHide = (tab: TabState) => {
    // console.log('hide', tab);
    rerender(!render);
  };

  useEffect( () => {
    manager.addEventListener('onTabAdded', onTabAdded);
    manager.addEventListener('onTabRemoved', onTabRemoved);
    manager.addEventListener('onTabShow', onTabShow);
    manager.addEventListener('onTabHide', onTabHide);
    return () => {
      //Destructor
      manager.removeEventListener('onTabAdded', onTabAdded);
      manager.removeEventListener('onTabRemoved', onTabRemoved);
      manager.removeEventListener('onTabShow', onTabShow);
      manager.removeEventListener('onTabHide', onTabHide);
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
