import React, { createContext, useContext, useEffect, useState } from "react";

import { createScopedLogger, LogScope } from "../../../utility/Logger";

const log = createScopedLogger(LogScope.Launcher);

/** Video item from community API (e.g. YouTube latest). */
export interface CommunityVideoItem {
  id?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CommunityProviderValues {
  lightboxImage: [ string,  React.Dispatch<React.SetStateAction<string>>],
  lightboxActive: [ boolean, React.Dispatch<React.SetStateAction<boolean>>],
  lightboxImageWidth: [ number,  React.Dispatch<React.SetStateAction<number>>],
  lightboxImageHeight: [ number, React.Dispatch<React.SetStateAction<number>>],
  videos: [ CommunityVideoItem[], React.Dispatch<React.SetStateAction<CommunityVideoItem[]>>],
}
const noop = () => {};
const defaultCommunityValues: CommunityProviderValues = {
  lightboxImage: [ '', noop ],
  lightboxActive: [ false, noop ],
  lightboxImageWidth: [ 0, noop ],
  lightboxImageHeight: [ 0, noop ],
  videos: [ [], noop ],
};
export const CommunityContext = createContext<CommunityProviderValues>(defaultCommunityValues);

export function useCommunity(){
  return useContext(CommunityContext);
}

export interface CommunityProviderProps {
  children: React.ReactNode;
}

export const CommunityProvider = (props: CommunityProviderProps) => {
  const [lightboxImageValue, setLightboxImage] = useState<string>('');
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxImageWidthValue, setLightboxImageWidth] = useState<number>(0);
  const [lightboxImageHeightValue, setLightboxImageHeight] = useState<number>(0);
  const [videos, setVideos] = useState<CommunityVideoItem[]>([]);

  useEffect(() => {
    // console.log('useEffect lightboxActive', lightboxActiveValue);
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
    fetch(`https://swkotor.net/api/media/youtube/latest`).then( (res) => {
      if(res.ok){
        return res.json();
      }
      throw new Error('Failed to fetch YouTube videos');
    }).then( (data: { videos?: CommunityVideoItem[] }) => {
      if(data?.videos){
        setVideos([...data.videos]);
      }
    }).catch((e) => {
      log.error('Failed to fetch community videos', e instanceof Error ? e : String(e));
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
