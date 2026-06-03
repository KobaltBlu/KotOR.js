import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "@/apps/game/states/AppState";
import * as KotOR from "@/apps/game/KotOR";
import { ILoaderProgress } from '@/apps/common/loader/LoaderProgress';
import { HotReloadManager } from "@/dev/HotReloadManager";

function readPreservedSessionUiState(gameKeyFallback: KotOR.GameEngineType) {
  const preserved = HotReloadManager.shouldSkipBootstrap();
  return {
    appReady: preserved,
    gameLoaded: preserved && KotOR.GameState.Ready,
    showLoadingScreen: !preserved,
    showEULAModal: preserved ? false : !AppState.eulaAccepted,
    showGrantModal: preserved ? false : (AppState.eulaAccepted && !AppState.directoryLocated),
    gameKey: AppState.gameKey || gameKeyFallback,
  };
}

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
  loadingScreenProgress: [ILoaderProgress | null, React.Dispatch<ILoaderProgress | null>];
  loadingScreenBackgroundURL: [string, React.Dispatch<string>];
  loadingScreenLogoURL: [string, React.Dispatch<string>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const initialUi = readPreservedSessionUiState(props.gameKey || KotOR.GameEngineType.KOTOR);
  const [gameKey, setGameKey] = useState<KotOR.GameEngineType>(initialUi.gameKey);
  const [appReady, setAppReady] = useState<boolean>(initialUi.appReady);
  const [gameLoaded, setGameLoaded] = useState<boolean>(initialUi.gameLoaded);
  const [showEULAModal, setShowEULAModal] = useState<boolean>(initialUi.showEULAModal);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(initialUi.showGrantModal);
  const [showCheatConsole, setShowCheatConsole] = useState<boolean>(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState<boolean>(false);

  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(initialUi.showLoadingScreen);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState<string>('Loading...');
  const [loadingScreenProgress, setLoadingScreenProgress] = useState<ILoaderProgress | null>(null);
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
    setLoadingScreenProgress(null);
  }

  const onLoadingScreenInit = (backgroundURL: string, logoURL: string, message?: string) => {
    setLoadingScreenMessage(message || 'Loading...');
    setLoadingScreenBackgroundURL(backgroundURL);
    setLoadingScreenLogoURL(logoURL);
  }

  const onLoadingScreenMessage = (message: string) => {
    setLoadingScreenMessage(message);
    setLoadingScreenProgress(null);
  };

  const onLoadingScreenProgress = (progress: ILoaderProgress | null) => {
    setLoadingScreenProgress(progress);
    if (progress?.message) {
      setLoadingScreenMessage(progress.message);
    }
  };

  useEffect(() => { 
    const skipBootstrap = HotReloadManager.shouldSkipBootstrap();

    window.addEventListener('keypress', onKeyPress);
    AppState.addEventListener('on-preload', onPreload);
    AppState.addEventListener('on-ready', onAppReady);  
    AppState.addEventListener('on-game-loaded', onGameLoaded);
    AppState.addEventListener('on-loader-show', onLoadingScreenShow);
    AppState.addEventListener('on-loader-hide', onLoadingScreenHide);
    AppState.addEventListener('on-loader-init', onLoadingScreenInit);
    AppState.addEventListener('on-loader-message', onLoadingScreenMessage);
    AppState.addEventListener('on-loader-progress', onLoadingScreenProgress);

    if (skipBootstrap) {
      setAppReady(true);
      setGameKey(AppState.gameKey);
      setGameLoaded(KotOR.GameState.Ready);
      setShowLoadingScreen(false);
      setShowEULAModal(false);
      setShowGrantModal(false);
    } else {
      AppState.initApp();
    }

    return () => {
      window.removeEventListener('keypress', onKeyPress);
      AppState.removeEventListener('on-preload', onPreload);
      AppState.removeEventListener('on-ready', onAppReady);
      AppState.removeEventListener('on-game-loaded', onGameLoaded);
      AppState.removeEventListener('on-loader-show', onLoadingScreenShow);
      AppState.removeEventListener('on-loader-hide', onLoadingScreenHide);
      AppState.removeEventListener('on-loader-init', onLoadingScreenInit);
      AppState.removeEventListener('on-loader-message', onLoadingScreenMessage);
      AppState.removeEventListener('on-loader-progress', onLoadingScreenProgress);
    };
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
    loadingScreenProgress: [loadingScreenProgress, setLoadingScreenProgress],
    loadingScreenBackgroundURL: [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL],
    loadingScreenLogoURL: [loadingScreenLogoURL, setLoadingScreenLogoURL],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {appReady && props.children}
    </AppContext.Provider>
  );
};
