import React, { createContext, useContext, useEffect, useState } from "react";


export interface LayoutContainerProviderValues {

}
export const LayoutContainerContext = createContext<LayoutContainerProviderValues>({} as any);

export function useLayoutContainer(){
  return useContext(LayoutContainerContext);
}

export interface LayoutContainerProviderProps {
  children: any;
}

export const LayoutContainerProvider = (props: LayoutContainerProviderProps) => {
  console.log('props', props);
  // const managerPrime = props.manager as EditorLayoutContainer;

  useEffect(() => {
  }, []);

  const providerValue: LayoutContainerProviderValues = {
    // manager: [manager, setManager],
  };

  return (
    <LayoutContainerContext.Provider value={providerValue}>
      {props.children}
    </LayoutContainerContext.Provider>
  );
};
