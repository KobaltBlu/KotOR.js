import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "../states/AppState";
import * as KotOR from "../KotOR";

export interface AppProviderValues {
  appState: [typeof AppState];
  gameKey: [KotOR.GameEngineType, React.Dispatch<KotOR.GameEngineType>];
  appReady: [boolean, React.Dispatch<boolean>];
  showEULAModal: [boolean, React.Dispatch<boolean>];
  showGrantModal: [boolean, React.Dispatch<boolean>];
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [gameKey, setGameKey] = useState<KotOR.GameEngineType>(props.gameKey || KotOR.GameEngineType.KOTOR);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [showEULAModal, setShowEULAModal] = useState<boolean>(props.showEULAModal || false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(props.showGrantModal || false);

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

  useEffect(() => { 
    AppState.addEventListener('on-preload', onPreload);
    AppState.addEventListener('on-ready', onAppReady);  
    AppState.initApp();
    return () => {
      AppState.removeEventListener('on-preload', onPreload);
      AppState.removeEventListener('on-ready', onAppReady);
    }
  }, []);

  const providerValue: AppProviderValues = {
    appState: [AppState],
    gameKey: [gameKey, setGameKey],
    appReady: [appReady, setAppReady],
    showEULAModal: [showEULAModal, setShowEULAModal],
    showGrantModal: [showGrantModal, setShowGrantModal]
  };

  return (
    <AppContext.Provider value={providerValue}>
      {appReady && props.children}
    </AppContext.Provider>
  );
};
