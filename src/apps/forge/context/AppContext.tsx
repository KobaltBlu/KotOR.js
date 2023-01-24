import React, { createContext, useContext, useEffect, useState } from "react";
import { ForgeState } from "../states/ForgeState";
import { EditorTabManager } from "../managers/EditorTabManager";
declare const KotOR: any;

export interface AppProviderValues {
  // someValue: [any, React.Dispatch<any>];
  tabManager: [EditorTabManager|undefined, React.Dispatch<any>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [tabManager, setTabManager] = useState(ForgeState.tabManager);

  useEffect(() => { 
    // ForgeState.tabManager = tabManager;
  }, []);

  const providerValue: AppProviderValues = {
    tabManager: [tabManager, setTabManager],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
