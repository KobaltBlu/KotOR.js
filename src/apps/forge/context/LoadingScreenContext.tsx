import React, { createContext, useContext, useEffect, useState } from 'react';

import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface LoadingScreenProviderProps {
  enabled: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  message: [string, React.Dispatch<React.SetStateAction<string>>];
  backgroundURL: [string, React.Dispatch<React.SetStateAction<string>>];
  logoURL: [string, React.Dispatch<React.SetStateAction<string>>];
}

function noopLoadingScreenDispatch(): void {
  log.warn('LoadingScreen setState called outside LoadingScreenProvider');
}

const defaultLoadingScreenValue: LoadingScreenProviderProps = {
  enabled: [false, noopLoadingScreenDispatch],
  message: ['Loading...', noopLoadingScreenDispatch],
  backgroundURL: ['', noopLoadingScreenDispatch],
  logoURL: ['', noopLoadingScreenDispatch],
};

export const LoadingScreenContext = createContext<LoadingScreenProviderProps>(defaultLoadingScreenValue);

export function useLoadingScreen(): LoadingScreenProviderProps {
  return useContext(LoadingScreenContext);
}

export interface LoadingScreenProps {
  children: React.ReactNode;
}

export const LoadingScreenProvider: React.FC<LoadingScreenProps> = (props) => {
  log.trace('LoadingScreenProvider render');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Loading...');
  const [backgroundURL, setBackgroundURL] = useState<string>('');
  const [logoURL, setLogoURL] = useState<string>('');

  useEffect(() => {
    log.trace('LoadingScreenProvider mount');
    return () => log.trace('LoadingScreenProvider unmount');
  }, []);

  const providerValue: LoadingScreenProviderProps = {
    enabled: [enabled, setEnabled],
    message: [message, setMessage],
    backgroundURL: [backgroundURL, setBackgroundURL],
    logoURL: [logoURL, setLogoURL],
  };

  return <LoadingScreenContext.Provider value={providerValue}>{props.children}</LoadingScreenContext.Provider>;
};
