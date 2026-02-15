import React, { useEffect, useRef, useState } from "react";

import TabButton from "@/apps/forge/components/tabs/TabButton";
import { useTabManager } from "@/apps/forge/context/TabManagerContext";
import { TabState } from "@/apps/forge/states/tabs";

/** Props for TabManager; currently none required */
export type TabManagerProps = object;

export const TabManager = function(_props: TabManagerProps){

  const tabManagerContext = useTabManager();
  const [render, rerender] = useState(false);
  const [manager, _setTabManager] = tabManagerContext.manager;
  const [tabs, _setTabs] = tabManagerContext.tabs;
  const [_selectedTab, _setSelectedTab] = tabManagerContext.selectedTab;

  const tabsMenuRef = useRef<HTMLUListElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // log.info('tabs', tabs);
  }, [tabs]);

  const onTabAdded = () => {
    // log.info('added', ForgeState.tabManager.tabs);
    rerender(!render);
  };

  const onTabRemoved = () => {
    // log.info('removed', ForgeState.tabManager.tabs);
    rerender(!render);
  };

  const onTabShow = (_tab: TabState) => {
    // log.info('show', tab);
    rerender(!render);
  };

  const onTabHide = (_tab: TabState) => {
    // log.info('hide', tab);
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
            tabs.map( (tab: unknown) => {
              const typedTab = tab as TabState;
              return <TabButton key={typedTab.id} tab={typedTab} ></TabButton>
            })
          }
        </ul>
        <div ref={tabsContainerRef} className="tabs tab-content">
          {
            tabs.map( (tab: unknown) => {
              const typedTab = tab as TabState;
              return (
                <div key={typedTab.id} className={`tab-pane ${typedTab.constructor.name} ${typedTab.visible ? 'active' : ''}`}>
                  {typedTab.render()}
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
