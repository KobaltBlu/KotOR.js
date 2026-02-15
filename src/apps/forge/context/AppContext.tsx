import React, { createContext, useContext, useEffect, useState } from 'react';

import { LoadingScreenProvider } from '@/apps/forge/context/LoadingScreenContext';
import { EditorTabManager } from '@/apps/forge/managers/EditorTabManager';
import { ForgeState } from '@/apps/forge/states/ForgeState';
import { createScopedLogger, LogScope } from '@/utility/Logger';


const log = createScopedLogger(LogScope.Forge);

export interface AppProviderValues {
  tabManager: [EditorTabManager | undefined, React.Dispatch<React.SetStateAction<EditorTabManager | undefined>>];
  appReady: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  showGrantModal: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  showLoadingScreen: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  loadingScreenMessage: [string, React.Dispatch<React.SetStateAction<string>>];
  loadingScreenBackgroundURL: [string, React.Dispatch<React.SetStateAction<string>>];
  loadingScreenLogoURL: [string, React.Dispatch<React.SetStateAction<string>>];
}

const defaultAppValue: AppProviderValues = {
  tabManager: [undefined, () => log.warn('setTabManager called outside AppProvider')],
  appReady: [false, () => log.warn('setAppReady called outside AppProvider')],
  showGrantModal: [false, () => log.warn('setShowGrantModal called outside AppProvider')],
  showLoadingScreen: [false, () => log.warn('setShowLoadingScreen called outside AppProvider')],
  loadingScreenMessage: ['', () => log.warn('setLoadingScreenMessage called outside AppProvider')],
  loadingScreenBackgroundURL: ['', () => log.warn('setLoadingScreenBackgroundURL called outside AppProvider')],
  loadingScreenLogoURL: ['', () => log.warn('setLoadingScreenLogoURL called outside AppProvider')],
};

export const AppContext = createContext<AppProviderValues>(defaultAppValue);

export function useApp(): AppProviderValues {
  return useContext(AppContext);
}

export interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = (props) => {
  log.trace('AppProvider render');
  const [tabManager, setTabManager] = useState<EditorTabManager | undefined>(ForgeState.tabManager);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(false);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState<string>('');
  const [loadingScreenBackgroundURL, setLoadingScreenBackgroundURL] = useState<string>('');
  const [loadingScreenLogoURL, setLoadingScreenLogoURL] = useState<string>('');

  const onLoadingScreenMessage = (message: string) => {
    log.trace('onLoadingScreenMessage message=%s', message);
    setLoadingScreenMessage(message);
  };
  const onLoadingScreenShow = () => {
    log.debug('onLoadingScreenShow');
    setShowLoadingScreen(true);
  };
  const onLoadingScreenHide = () => {
    log.debug('onLoadingScreenHide');
    setShowLoadingScreen(false);
  };
  const onLoadingScreenInit = (backgroundURL: string, logoURL: string) => {
    log.debug('onLoadingScreenInit backgroundURL=%s logoURL=%s', backgroundURL, logoURL);
    setLoadingScreenBackgroundURL(backgroundURL);
    setLoadingScreenLogoURL(logoURL);
  };

  useEffect(() => {
    log.trace('AppProvider useEffect register ForgeState loader listeners');
    ForgeState.addEventListener('on-loader-message', onLoadingScreenMessage);
    ForgeState.addEventListener('on-loader-show', onLoadingScreenShow);
    ForgeState.addEventListener('on-loader-hide', onLoadingScreenHide);
    ForgeState.addEventListener('on-loader-init', onLoadingScreenInit);
    return () => {
      log.trace('AppProvider cleanup remove ForgeState loader listeners');
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
      <LoadingScreenProvider>{props.children}</LoadingScreenProvider>
    </AppContext.Provider>
  );
};
