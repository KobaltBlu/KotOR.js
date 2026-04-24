import React, { createContext, useContext, useEffect } from 'react';

import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface LayoutContainerProviderValues {
  readonly _brand?: 'LayoutContainer';
}

const defaultLayoutValue: LayoutContainerProviderValues = {};

export const LayoutContainerContext = createContext<LayoutContainerProviderValues>(defaultLayoutValue);

export function useLayoutContext(): LayoutContainerProviderValues {
  return useContext(LayoutContainerContext);
}

export interface LayoutContainerProviderProps {
  children: React.ReactNode;
}

export const LayoutContainerProvider: React.FC<LayoutContainerProviderProps> = (props) => {
  log.trace('LayoutContainerProvider render');

  useEffect(() => {
    log.trace('LayoutContainerProvider mount');
  }, []);

  const providerValue: LayoutContainerProviderValues = {};

  return <LayoutContainerContext.Provider value={providerValue}>{props.children}</LayoutContainerContext.Provider>;
};
