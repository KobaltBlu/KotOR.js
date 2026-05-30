import React, { createContext, useContext } from 'react';

export type LoadingConsoleSeverity = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LoadingConsoleEntry {
  id: number;
  time: number;
  severity: LoadingConsoleSeverity;
  message: string;
  args: string[];
}

export interface LoadingConsoleContextValue {
  enabled: boolean;
  entries: LoadingConsoleEntry[];
  clear: () => void;
}

const defaultValue: LoadingConsoleContextValue = {
  enabled: false,
  entries: [],
  clear: () => {},
};

export const LoadingConsoleContext = createContext<LoadingConsoleContextValue>(defaultValue);

export function useLoadingConsole(): LoadingConsoleContextValue {
  return useContext(LoadingConsoleContext);
}
