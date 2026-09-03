import React, { createContext, useContext, useEffect, useState } from "react";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export interface LayoutContainerProviderValues {
  westOpen?: boolean;
  toggleWest?: () => void;
  setWestOpen?: (open: boolean) => void;
}

export const LayoutContainerContext = createContext<LayoutContainerProviderValues>({});

export function useLayoutContext(){
  return useContext(LayoutContainerContext);
}

export interface LayoutContainerProviderProps {
  children: any;
  bindExplorer?: boolean;
}

export const LayoutContainerProvider = (props: LayoutContainerProviderProps) => {
  const [westOpen, setWestOpen] = useState(ForgeState.explorerPaneOpen);

  useEffect(() => {
    if (!props.bindExplorer) {
      return;
    }
    const sync = () => setWestOpen(ForgeState.explorerPaneOpen);
    ForgeState.addEventListener("onExplorerPaneToggle", sync);
    sync();
    return () => {
      ForgeState.removeEventListener("onExplorerPaneToggle", sync);
    };
  }, [props.bindExplorer]);

  const providerValue: LayoutContainerProviderValues = props.bindExplorer
    ? {
        westOpen,
        toggleWest: () => ForgeState.toggleExplorerPane(),
        setWestOpen: (open: boolean) => ForgeState.setExplorerPaneOpen(open),
      }
    : {};

  return (
    <LayoutContainerContext.Provider value={providerValue}>
      {props.children}
    </LayoutContainerContext.Provider>
  );
};
