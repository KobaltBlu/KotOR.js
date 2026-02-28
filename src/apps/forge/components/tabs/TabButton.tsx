import React, { useEffect, useState } from "react";

import { useTabManager } from "@/apps/forge/context/TabManagerContext";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabState } from "@/apps/forge/states/tabs";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface TabButtonProps {
  tab: TabState
}

export const TabButton = function(props: TabButtonProps) {

  const tab: TabState = props.tab;
  const [render, rerender] = useState<boolean>(false);
  const [tabName, setTabName] = useState<string>(tab.tabName);

  //tabManager
  const tabManager = useTabManager();
  const [selectedTab, setSelectedTab] = tabManager.selectedTab;
  
  useEffect( () => {
    // console.log('tabName', tab.tabName);
  }, [tabName]);

  const onTabNameChange = () => {
    console.log('onTabNameChange', tab.tabName)
    setTabName(tab.tabName);
  };

  //onCreate
  useEffectOnce( () => {
    tab.addEventListener('onTabNameChange', onTabNameChange);
    tab.addEventListener('onTabShow', onTabShow);
    tab.addEventListener('onTabHide', onTabHide);
    return () => {
      tab.removeEventListener('onTabNameChange', onTabNameChange);
      tab.removeEventListener('onTabShow', onTabShow);
      tab.removeEventListener('onTabHide', onTabHide);
    }
  });

  const onTabClick = (e: React.MouseEvent<HTMLLIElement>) => {
    e.preventDefault();
    tab.show();
    setSelectedTab(tab);
  }

  const onTabShow = () => {
    rerender(!render);
  }

  const onTabHide = () => {
    rerender(!render);
  }

  const onTabCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    //TODO: Handle unsaved changes modal
    e.stopPropagation();
    tab.remove();
  }

  return (
    <li className={`btn btn-tab ${tab.getTabManager()?.currentTab == tab ? `active` : ''}`} onClick={onTabClick}>
      <a>{tabName}</a>&nbsp;
      {(
        tab.isClosable ? (
          <button type="button" className="close" onClick={onTabCloseClick}>
            <span className="fa-solid fa-xmark"></span>
          </button>
        ) : (<></>)
      )}
    </li>
  );

}

export default TabButton;
