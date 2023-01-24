import React, { createContext, useContext, useEffect, useState } from "react";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabState } from "../states/tabs/TabState";


export interface TabManagerProviderValues {
  manager: [EditorTabManager, React.Dispatch<any>];
  tabs: [TabState[], React.Dispatch<any>];
  selectedTab: [TabState|undefined, React.Dispatch<any>];
}
export const TabManagerContext = createContext<TabManagerProviderValues>({} as any);

export function useTabManager(){
  return useContext(TabManagerContext);
}

export interface TabManagerProviderProps {
  manager: EditorTabManager;
  children: any;
}

export const TabManagerProvider = (props: TabManagerProviderProps) => {
  console.log('props', props);
  const managerPrime = props.manager as EditorTabManager;
  const [manager, setManager] = useState<EditorTabManager>(managerPrime);
  const [tabs, setTabs] = useState<TabState[]>(managerPrime.tabs);
  const [selectedTab, setSelectedTab] = useState<TabState|undefined>(managerPrime.currentTab);

  useEffect(() => {
    console.log('TabManagerProvider');
    // managerPrime.attachComponent(this);
  }, []);

  useEffect(() => {
    if(selectedTab){
      selectedTab.Show();
    }
  }, [selectedTab]);

  const providerValue: TabManagerProviderValues = {
    manager: [manager, setManager],
    tabs: [tabs, setTabs],
    selectedTab: [selectedTab, setSelectedTab],
  };

  return (
    <TabManagerContext.Provider value={providerValue}>
      {props.children}
    </TabManagerContext.Provider>
  );
};
