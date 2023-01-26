import React, { createContext, useContext, useEffect, useState } from "react";
import { ForgeState } from "../states/ForgeState";
import { EditorTabManager } from "../managers/EditorTabManager";
import { LoadingScreenProvider } from "./LoadingScreenContext";
declare const KotOR: any;

export interface AppProviderValues {
  // someValue: [any, React.Dispatch<any>];
  tabManager: [EditorTabManager|undefined, React.Dispatch<any>];
  appReady: [boolean, React.Dispatch<any>];
  showGrantModal: [boolean, React.Dispatch<any>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [tabManager, setTabManager] = useState<EditorTabManager>(ForgeState.tabManager);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);

  useEffect(() => { 
    // ForgeState.tabManager = tabManager;
  }, []);

  const providerValue: AppProviderValues = {
    tabManager: [tabManager, setTabManager],
    appReady: [appReady, setAppReady],
    showGrantModal: [showGrantModal, setShowGrantModal],
  };

  return (
    <AppContext.Provider value={providerValue}>
      <LoadingScreenProvider>
        {props.children}
      </LoadingScreenProvider>
    </AppContext.Provider>
  );
};
