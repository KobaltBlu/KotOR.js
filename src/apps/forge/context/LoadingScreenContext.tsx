import React, { createContext, useContext, useEffect, useState } from "react";


export interface LoadingScreenProviderProps {
  enabled: [boolean, React.Dispatch<any>];
  message: [string, React.Dispatch<any>];
  backgroundURL: [string, React.Dispatch<any>];
  logoURL: [string, React.Dispatch<any>];
}
export const LoadingScreenContext = createContext<LoadingScreenProviderProps>({} as any);

export function useLoadingScreen(){
  return useContext(LoadingScreenContext);
}

export interface LoadingScreenProps {
  children: any;
}

export const LoadingScreenProvider = (props: LoadingScreenProps) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Loading...');
  const [backgroundURL, setBackgroundURL] = useState<string>('');
  const [logoURL, setLogoURL] = useState<string>('');

  useEffect(() => {
    //Constructor
    () => {
      //Destructor
    }
  }, []);

  const providerValue: LoadingScreenProviderProps = {
    enabled: [enabled, setEnabled],
    message: [message, setMessage],
    backgroundURL: [backgroundURL, setBackgroundURL],
    logoURL: [logoURL, setLogoURL],
  };

  return (
    <LoadingScreenContext.Provider value={providerValue}>
      {props.children}
    </LoadingScreenContext.Provider>
  );
};
