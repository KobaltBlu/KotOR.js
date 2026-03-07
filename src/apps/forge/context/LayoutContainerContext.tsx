import React, { createContext, useContext, useEffect, useState } from "react";


export interface LayoutContainerProviderValues {

}
export const LayoutContainerContext = createContext<LayoutContainerProviderValues>({} as any);

export function useLayoutContext(){
  return useContext(LayoutContainerContext);
}

export interface LayoutContainerProviderProps {
  children: any;
}

export const LayoutContainerProvider = (props: LayoutContainerProviderProps) => {

  // const [parent, setParent] = useState(useContext(LayoutContainerContext));

  useEffect(() => {
  }, []);

  const providerValue: LayoutContainerProviderValues = {
    // parent: [parent, setParent],
  };

  return (
    <LayoutContainerContext.Provider value={providerValue}>
      {props.children}
    </LayoutContainerContext.Provider>
  );
};
