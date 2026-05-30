import React, { useEffect, useState } from "react";
import { useTabManager } from "@/apps/forge/context/TabManagerContext";
import { TabState } from "@/apps/forge/states/tabs";

export interface TabButtonProps {
  tab: TabState;
  index: number;
  onContextMenu?: (e: React.MouseEvent<HTMLLIElement>, tab: TabState, index: number) => void;
  onDragStart?: (e: React.DragEvent<HTMLLIElement>, index: number) => void;
  onDragOver?: (e: React.DragEvent<HTMLLIElement>, index: number) => void;
  onDrop?: (e: React.DragEvent<HTMLLIElement>, index: number) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  dragStateClassName?: string;
}

export const TabButton = function(props: TabButtonProps) {

  const tab: TabState = props.tab;
  const index = props.index;
  const [tabName, setTabName] = useState<string>(tab.tabName);

  //tabManager
  const tabManager = useTabManager();
  const [selectedTab, setSelectedTab] = tabManager.selectedTab;
  
  useEffect( () => {
    // console.log('tabName', tab.tabName);
  }, [tabName]);

  const onTabNameChange = () => {
    setTabName(tab.tabName);
  };

  useEffect(() => {
    tab.addEventListener('onTabNameChange', onTabNameChange);
    return () => {
      tab.removeEventListener('onTabNameChange', onTabNameChange);
    }
  }, [tab]);

  const onTabClick = (e: React.MouseEvent<HTMLLIElement>) => {
    e.preventDefault();
    tab.show();
    setSelectedTab(tab);
  }

  const onTabCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    //TODO: Handle unsaved changes modal
    e.stopPropagation();
    tab.remove();
  }

  return (
    <li
      className={`btn btn-tab ${tab.getTabManager()?.currentTab == tab ? `active` : ''} ${props.dragStateClassName || ''}`}
      onClick={onTabClick}
      onContextMenu={(e) => props.onContextMenu?.(e, tab, index)}
      draggable
      onDragStart={(e) => props.onDragStart?.(e, index)}
      onDragOver={(e) => props.onDragOver?.(e, index)}
      onDrop={(e) => props.onDrop?.(e, index)}
      onDragEnd={(e) => props.onDragEnd?.(e)}
    >
      {tab.file?.unsaved_changes ? (<span className="dirty-dot" aria-hidden="true"></span>) : (<></>)}
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