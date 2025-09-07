import React, { createContext, useContext, useEffect, useState } from "react";
import { ForgeState } from "../states/ForgeState";
import { EditorTabManager } from "../managers/EditorTabManager";
import { LoadingScreenProvider } from "./LoadingScreenContext";

import * as KotOR from "../KotOR";

export interface AppProviderValues {
  // someValue: [any, React.Dispatch<any>];
  tabManager: [EditorTabManager|undefined, React.Dispatch<any>];
  appReady: [boolean, React.Dispatch<any>];
  showGrantModal: [boolean, React.Dispatch<any>];
  showLoadingScreen: [boolean, React.Dispatch<any>];
  loadingScreenMessage: [string, React.Dispatch<any>];
  loadingScreenBackgroundURL: [string, React.Dispatch<any>];
  loadingScreenLogoURL: [string, React.Dispatch<any>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [tabManager, setTabManager] = useState<EditorTabManager>(ForgeState.tabManager);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(false);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState<string>('');
  const [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL] = useState<string>('');
  const [loadingScreenLogoURL, setLoadingScreenLogoURL] = useState<string>('');

  const onLoadingScreenMessage = (message: string) => {
    setLoadingScreenMessage(message);
  }
  const onLoadingScreenShow = () => {
    setShowLoadingScreen(true);
  }
  const onLoadingScreenHide = () => {
    setShowLoadingScreen(false);
  }
  const onLoadingScreenInit = (backgroundURL: string, logoURL: string) => {
    setLoadingScreenBackgroundURL(backgroundURL);
    setLoadingScreenLogoURL(logoURL);
  }

  useEffect(() => { 
    // ForgeState.tabManager = tabManager;
    ForgeState.addEventListener('on-loader-message', onLoadingScreenMessage);
    ForgeState.addEventListener('on-loader-show', onLoadingScreenShow);
    ForgeState.addEventListener('on-loader-hide', onLoadingScreenHide);
    ForgeState.addEventListener('on-loader-init', onLoadingScreenInit);
    return () => {
      ForgeState.removeEventListener('on-loader-message', onLoadingScreenMessage);
      ForgeState.removeEventListener('on-loader-show', onLoadingScreenShow);
      ForgeState.removeEventListener('on-loader-hide', onLoadingScreenHide);
      ForgeState.removeEventListener('on-loader-init', onLoadingScreenInit);
    };
  }, []);

  const providerValue: AppProviderValues = {
    tabManager: [tabManager, setTabManager],
    appReady: [appReady, setAppReady],
    showGrantModal: [showGrantModal, setShowGrantModal],
    showLoadingScreen: [showLoadingScreen, setShowLoadingScreen],
    loadingScreenMessage: [loadingScreenMessage, setLoadingScreenMessage],
    loadingScreenBackgroundURL: [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL],
    loadingScreenLogoURL: [loadingScreenLogoURL, setLoadingScreenLogoURL],
  };

  return (
    <AppContext.Provider value={providerValue}>
      <LoadingScreenProvider>
        {props.children}
      </LoadingScreenProvider>
    </AppContext.Provider>
  );
};
