import React, { createContext, useContext, useEffect, useState } from "react";

export interface ProfileProviderValues {
  lightboxImage: [ string,  React.Dispatch<any>],
  lightboxActive: [ boolean, React.Dispatch<any>],
  lightboxImageWidth: [ number,  React.Dispatch<any>],
  lightboxImageHeight: [ number, React.Dispatch<any>],
}
export const ProfileContext = createContext<ProfileProviderValues>({} as any);

export function useProfile(){
  return useContext(ProfileContext);
}

export const ProfileProvider = (props: any) => {
  const [lightboxImageValue, setLightboxImage] = useState<string>('');
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxImageWidthValue, setLightboxImageWidth] = useState<number>(0);
  const [lightboxImageHeightValue, setLightboxImageHeight] = useState<number>(0);

  useEffect(() => {
    // console.log('useEffect lightboxActive', lightboxActiveValue);
  }, [lightboxActiveValue]);

  useEffect( () => {
    if(lightboxImageValue){
      let img = new Image();
      img.onload = () => {
        console.log('img', img.width, img.height);
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
    // console.log('Global', 'useEffect');
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
