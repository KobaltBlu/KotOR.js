import React, { MouseEventHandler, useEffect, useState } from "react";
import { useTabManager } from "../../context/TabManagerContext";
import { TabState } from "../../states/tabs";
import { useEffectOnce } from "../../helpers/UseEffectOnce";

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
    e.stopPropagation();
    if (tab.file?.unsaved_changes) {
      const discard = window.confirm(
        `"${tab.tabName}" has unsaved changes. Close anyway?`
      );
      if (!discard) return;
    }
    tab.remove();
  }

  return (
    <li className={`btn btn-tab ${tab.getTabManager()?.currentTab == tab ? `active` : ''}`} onClick={onTabClick}>
      <a>{tabName}</a>&nbsp;
      {(
        tab.isClosable ? (
          <button type="button" className="close" onClick={onTabCloseClick} title="Close tab" aria-label="Close tab">
            <span className="fa-solid fa-xmark" aria-hidden></span>
          </button>
        ) : (<></>)
      )}
    </li>
  );

}

export default TabButton;
