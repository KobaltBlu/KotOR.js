import React, { MouseEventHandler, useEffect } from "react";
import { useTabManager } from "../../context/TabManagerContext";
import { TabState } from "../../states/tabs/TabState";

export interface TabButtonProps {
  tab: TabState
}

export const TabButton = function(props: TabButtonProps) {

  const tab: TabState = props.tab;
  const tabManager = useTabManager();

  const [selectedTab, setSelectedTab] = tabManager.selectedTab;

  // constructor(){
  //   super(props);
  //   this.onTabClick = this.onTabClick.bind(this);
  //   this.onTabCloseClick = this.onTabCloseClick.bind(this);
  // }

  // componentDidMount(): void {
  //   this.props.tab.attachTabView(this);
  // }
  useEffect( () => {
    console.log('tabName', tab.tabName);
  }, [tab.tabName]);

  //onCreate
  useEffect( () => {
    console.log('tab', 'onCreate');
  }, []);

  const onTabClick = (e: React.MouseEvent<HTMLLIElement>) => {
    e.preventDefault();
    tab.Show();
    setSelectedTab(tab);
  }

  const onTabCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    //TODO: Handle unsaved changes modal
    e.isPropagationStopped();
    tab.Remove();
  }

  return (
    <li className={`btn btn-tab ${selectedTab == tab ? `active` : ''}`} onClick={onTabClick}>
      <a>{tab.tabName}</a>&nbsp;
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