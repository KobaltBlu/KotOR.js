import React, { createContext, useContext, useEffect, useState } from "react";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabState } from "../states/tabs";


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
  const managerPrime = props.manager as EditorTabManager;
  const [manager, setManager] = useState<EditorTabManager>(managerPrime);
  const [tabs, setTabs] = useState<TabState[]>(managerPrime.tabs);
  const [selectedTab, setSelectedTab] = useState<TabState|undefined>(managerPrime.currentTab);

  useEffect(() => {
  }, []);

  useEffect(() => {
    // if(selectedTab){
    //   selectedTab.show();
    // }
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
