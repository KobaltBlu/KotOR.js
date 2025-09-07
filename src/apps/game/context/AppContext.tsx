import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "../states/AppState";
import * as KotOR from "../KotOR";

export interface AppProviderValues {
  appState: [typeof AppState];
  gameKey: [KotOR.GameEngineType, React.Dispatch<KotOR.GameEngineType>];
  appReady: [boolean, React.Dispatch<boolean>];
  gameLoaded: [boolean, React.Dispatch<boolean>];
  showEULAModal: [boolean, React.Dispatch<boolean>];
  showGrantModal: [boolean, React.Dispatch<boolean>];
  showCheatConsole: [boolean, React.Dispatch<boolean>];
  showPerformanceMonitor: [boolean, React.Dispatch<boolean>];
  showLoadingScreen: [boolean, React.Dispatch<boolean>];
  loadingScreenMessage: [string, React.Dispatch<string>];
  loadingScreenBackgroundURL: [string, React.Dispatch<string>];
  loadingScreenLogoURL: [string, React.Dispatch<string>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [gameKey, setGameKey] = useState<KotOR.GameEngineType>(props.gameKey || KotOR.GameEngineType.KOTOR);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [gameLoaded, setGameLoaded] = useState<boolean>(false);
  const [showEULAModal, setShowEULAModal] = useState<boolean>(props.showEULAModal || false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(props.showGrantModal || false);
  const [showCheatConsole, setShowCheatConsole] = useState<boolean>(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState<boolean>(false);

  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(true);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState<string>('Loading...');
  const [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL] = useState<string>('');
  const [loadingScreenLogoURL, setLoadingScreenLogoURL] = useState<string>('');

  const onAppReady = () => {
    console.log('onAppReady', AppState.eulaAccepted, AppState.directoryLocated);
    setAppReady(true);
    setGameKey(AppState.gameKey);
    setShowEULAModal(!AppState.eulaAccepted);
    setShowGrantModal(AppState.eulaAccepted && !AppState.directoryLocated);
  }

  const onPreload = () => {
    console.log('onPreload', AppState.eulaAccepted, AppState.directoryLocated);
    setShowEULAModal(!AppState.eulaAccepted);
    setShowGrantModal(AppState.eulaAccepted && !AppState.directoryLocated);
  }

  const onGameLoaded = () => {
    setGameLoaded(true);
  }

  const onKeyPress = (e: KeyboardEvent) => {
    if(e.key === '`'){
      e.preventDefault();
      e.stopPropagation();
      setShowCheatConsole(!showCheatConsole);
      return false;
    }
  }

  const onLoadingScreenShow = () => {
    setShowLoadingScreen(true);
  }

  const onLoadingScreenHide = () => {
    setShowLoadingScreen(false);
  }

  const onLoadingScreenInit = (backgroundURL: string, logoURL: string, message?: string) => {
    setLoadingScreenMessage(message || 'Loading...');
    setLoadingScreenBackgroundURL(backgroundURL);
    setLoadingScreenLogoURL(logoURL);
  }

  const onLoadingScreenMessage = (message: string) => {
    setLoadingScreenMessage(message);
  }

  useEffect(() => { 
    window.addEventListener('keypress', onKeyPress);
    AppState.addEventListener('on-preload', onPreload);
    AppState.addEventListener('on-ready', onAppReady);  
    AppState.addEventListener('on-game-loaded', onGameLoaded);
    AppState.addEventListener('on-loader-show', onLoadingScreenShow);
    AppState.addEventListener('on-loader-hide', onLoadingScreenHide);
    AppState.addEventListener('on-loader-init', onLoadingScreenInit);
    AppState.addEventListener('on-loader-message', onLoadingScreenMessage);
    AppState.initApp();
    return () => {
      window.removeEventListener('keypress', onKeyPress);
      AppState.removeEventListener('on-preload', onPreload);
      AppState.removeEventListener('on-ready', onAppReady);
      AppState.removeEventListener('on-game-loaded', onGameLoaded);
      AppState.removeEventListener('on-loader-show', onLoadingScreenShow);
      AppState.removeEventListener('on-loader-hide', onLoadingScreenHide);
      AppState.removeEventListener('on-loader-init', onLoadingScreenInit);
      AppState.removeEventListener('on-loader-message', onLoadingScreenMessage);
    }
  }, []);

  useEffect(() => { 
    window.addEventListener('keypress', onKeyPress);
    return () => {
      window.removeEventListener('keypress', onKeyPress);
    }
  }, [gameLoaded, showCheatConsole, appReady]);

  const providerValue: AppProviderValues = {
    appState: [AppState],
    gameKey: [gameKey, setGameKey],
    appReady: [appReady, setAppReady],
    gameLoaded: [gameLoaded, setGameLoaded],
    showEULAModal: [showEULAModal, setShowEULAModal],
    showGrantModal: [showGrantModal, setShowGrantModal],
    showCheatConsole: [showCheatConsole, setShowCheatConsole],
    showPerformanceMonitor: [showPerformanceMonitor, setShowPerformanceMonitor],
    showLoadingScreen: [showLoadingScreen, setShowLoadingScreen],
    loadingScreenMessage: [loadingScreenMessage, setLoadingScreenMessage],
    loadingScreenBackgroundURL: [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL],
    loadingScreenLogoURL: [loadingScreenLogoURL, setLoadingScreenLogoURL],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {appReady && props.children}
    </AppContext.Provider>
  );
};
