import React, { createContext, useContext, useEffect, useState } from 'react';

import type { EditorTabManager } from '../managers/EditorTabManager';
import type { TabState } from '../states/tabs';

import { createScopedLogger, LogScope } from '../../../utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface TabManagerProviderValues {
  manager: [EditorTabManager, React.Dispatch<React.SetStateAction<EditorTabManager>>];
  tabs: [TabState[], React.Dispatch<React.SetStateAction<TabState[]>>];
  selectedTab: [TabState | undefined, React.Dispatch<React.SetStateAction<TabState | undefined>>];
}

function noopTabManagerDispatch(): void {
  log.warn('TabManager setState called outside TabManagerProvider');
}

const defaultTabManagerValue: TabManagerProviderValues = {
  manager: [null as unknown as EditorTabManager, noopTabManagerDispatch],
  tabs: [[], noopTabManagerDispatch],
  selectedTab: [undefined, noopTabManagerDispatch],
};

export const TabManagerContext = createContext<TabManagerProviderValues>(defaultTabManagerValue);

export function useTabManager(): TabManagerProviderValues {
  return useContext(TabManagerContext);
}

export interface TabManagerProviderProps {
  manager: EditorTabManager;
  children: React.ReactNode;
}

export const TabManagerProvider: React.FC<TabManagerProviderProps> = (props) => {
  log.trace('TabManagerProvider render');
  const managerPrime = props.manager;
  const [manager, setManager] = useState<EditorTabManager>(managerPrime);
  const [tabs, setTabs] = useState<TabState[]>(managerPrime.tabs);
  const [selectedTab, setSelectedTab] = useState<TabState | undefined>(managerPrime.currentTab);

  useEffect(() => {
    log.trace('TabManagerProvider mount');
  }, []);

  useEffect(() => {
    log.trace('TabManagerProvider selectedTab changed id=%s', selectedTab?.id ?? 'none');
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
