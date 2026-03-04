import React, { createContext, useContext, useEffect, useState } from "react";

import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Launcher);

export interface ProfileProviderValues {
  lightboxImage: [ string,  React.Dispatch<React.SetStateAction<string>>];
  lightboxActive: [ boolean, React.Dispatch<React.SetStateAction<boolean>>];
  lightboxImageWidth: [ number,  React.Dispatch<React.SetStateAction<number>>];
  lightboxImageHeight: [ number, React.Dispatch<React.SetStateAction<number>>];
}

const noop = () => {};
const defaultProfileValues: ProfileProviderValues = {
  lightboxImage: [ '', noop ],
  lightboxActive: [ false, noop ],
  lightboxImageWidth: [ 0, noop ],
  lightboxImageHeight: [ 0, noop ],
};

export const ProfileContext = createContext<ProfileProviderValues>(defaultProfileValues);

export function useProfile(){
  return useContext(ProfileContext);
}

export interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider = (props: ProfileProviderProps) => {
  const [lightboxImageValue, setLightboxImage] = useState<string>('');
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxImageWidthValue, setLightboxImageWidth] = useState<number>(0);
  const [lightboxImageHeightValue, setLightboxImageHeight] = useState<number>(0);

  useEffect(() => {
    log.trace('ProfileContext lightboxActive changed', lightboxActiveValue);
  }, [lightboxActiveValue]);

  useEffect( () => {
    if(lightboxImageValue){
      const img = new Image();
      img.onload = () => {
        log.debug('lightbox image loaded', img.width, img.height);
        setLightboxImageWidth(img.width);
        setLightboxImageHeight(img.height);
      }
      img.src = lightboxImageValue;
    }else{
      setLightboxImageWidth(0);
      setLightboxImageHeight(0);
    }
  }, [lightboxImageValue]);


  useEffect(() => {
    log.trace('ProfileContext mounted');
  }, [])

  const providerValue: ProfileProviderValues = {
    lightboxImage: [lightboxImageValue, setLightboxImage], 
    lightboxActive: [lightboxActiveValue, setLightboxActive],
    lightboxImageWidth: [lightboxImageWidthValue, setLightboxImageWidth],
    lightboxImageHeight: [lightboxImageHeightValue, setLightboxImageHeight],
  };

  return (
    <ProfileContext.Provider value={providerValue}>
      {props.children}
    </ProfileContext.Provider>
  );
};
