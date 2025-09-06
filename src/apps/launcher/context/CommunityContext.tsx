import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export interface CommunityProviderValues {
  lightboxImage: [ string,  React.Dispatch<string>],
  lightboxActive: [ boolean, React.Dispatch<boolean>],
  lightboxImageWidth: [ number,  React.Dispatch<number>],
  lightboxImageHeight: [ number, React.Dispatch<number>],
  videos: [ any[], React.Dispatch<any[]>],
}
export const CommunityContext = createContext<CommunityProviderValues>({} as any);

export function useCommunity(){
  return useContext(CommunityContext);
}

export const CommunityProvider = (props: any) => {
  const [lightboxImageValue, setLightboxImage] = useState<string>('');
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxImageWidthValue, setLightboxImageWidth] = useState<number>(0);
  const [lightboxImageHeightValue, setLightboxImageHeight] = useState<number>(0);
  const [videos, setVideos] = useState<any[]>([]);

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
    axios.get(`https://swkotor.net/api/media/youtube/latest`).then( (res) => {
      if(res.data?.videos){
        setVideos([...res.data.videos]);
      }
    }).catch((e) => {
      console.error(e);
    })
  }, [])

  const providerValue: CommunityProviderValues = {
    lightboxImage: [lightboxImageValue, setLightboxImage], 
    lightboxActive: [lightboxActiveValue, setLightboxActive],
    lightboxImageWidth: [lightboxImageWidthValue, setLightboxImageWidth],
    lightboxImageHeight: [lightboxImageHeightValue, setLightboxImageHeight],
    videos: [videos, setVideos],
  };

  return (
    <CommunityContext.Provider value={providerValue}>
      {props.children}
    </CommunityContext.Provider>
  );
};
