import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigClient } from "../../../utility/ConfigClient";


export interface AppProviderValues {
  profileCategories: [any, React.Dispatch<any>]
  selectedProfile: [any, React.Dispatch<any>],
  lightboxImage: [ any,  React.Dispatch<any>],
  lightboxActive: [ any, React.Dispatch<any>],
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  /* ENVIRONMENT API URL */
  const [profileCategoriesValue, setProfilesCategories] = useState<any>({});
  const [selectedProfileValue, setSelectedProfile] = useState<any|undefined>();

  const [lightboxImageValue, setLightboxImage] = useState<string>('');
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);

  useEffect(() => {
    console.log('useEffect selectedProfile', selectedProfileValue);
    ConfigClient.set(['Launcher', 'selected_profile'], selectedProfileValue?.key || 'kotor');
  }, [selectedProfileValue]);

  useEffect(() => {
    // console.log('useEffect lightboxActive', lightboxActiveValue);
  }, [lightboxActiveValue]);

  useEffect( () => {
    // console.log('useEffect lightboxImage', lightboxImageValue);
  }, [lightboxImageValue]);


  useEffect(() => {
    // console.log('Global', 'useEffect');
  }, [])

  const providerValue: AppProviderValues = {
    profileCategories: [profileCategoriesValue, setProfilesCategories], 
    selectedProfile: [selectedProfileValue, setSelectedProfile], 
    lightboxImage: [lightboxImageValue, setLightboxImage], 
    lightboxActive: [lightboxActiveValue, setLightboxActive],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
