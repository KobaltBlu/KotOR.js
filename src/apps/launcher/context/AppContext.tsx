import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigClient } from "../../../utility/ConfigClient";
import axios from "axios";


export interface AppProviderValues {
  profileCategories: [any, React.Dispatch<any>]
  selectedProfile: [any, React.Dispatch<any>],
  backgroundImage: [ any,  React.Dispatch<any>],
  videos: [ any[], React.Dispatch<any[]>],
  discordWidgetOpen: [ boolean, React.Dispatch<React.SetStateAction<boolean>>],
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

function rasterizeRemoteImage(img: HTMLImageElement): Promise<ImageBitmap> {
  return new Promise<ImageBitmap>( (resolve, reject) => {
    const canvas = document.createElement( 'canvas' );
    const ctx = canvas.getContext('2d');
    if(ctx){
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas).then(bmp => {
        resolve(bmp);
      });
    }
  })
}

function beautifyBackgroundImage(url: string|undefined = undefined): Promise<string> {
  return new Promise<string>( (resolve ,reject) => {
    if(url){
      const img = new Image();
      img.onload = async () => {
        const width = img.width;
        const height = img.height;
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const gradientStart = {x: 0, y: (height-(height * 0.25))};
        const gradientEnd = {x: width, y: height};
        if(ctx instanceof OffscreenCanvasRenderingContext2D){
          try{
            const bmp = await rasterizeRemoteImage(img);
            ctx.drawImage(bmp, 0, 0);
            const gradient = ctx.createLinearGradient(0, gradientStart.y, 0, gradientEnd.y);
            gradient.addColorStop(1, "black");
            gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = gradient;
            ctx.fillRect(gradientStart.x, gradientStart.y, gradientEnd.x, gradientEnd.y);
            const newBackgroundURL = URL.createObjectURL(await canvas.convertToBlob({type: 'image/webp', quality:  100}));
            resolve(newBackgroundURL);
          }catch(e){
            console.error(e);
            reject();
          }
        }
      }
      img.onerror = (e) => {
        console.error(e);
        reject();
      }
      img.src = url;
    }else{
      reject();
    }
  })
}

export const AppProvider = (props: any) => {
  const [profileCategoriesValue, setProfilesCategories] = useState<any>({});
  const [selectedProfileValue, setSelectedProfile] = useState<any|undefined>();
  const [backgroundImageValue, setBackgroundImage] = useState<string>('');
  const [videos, setVideos] = useState<any[]>([]);
  const [discordWidgetOpen, setDiscordWidgetOpen] = useState<boolean>(false);

  useEffect(() => {
    ConfigClient.set(['Launcher', 'selected_profile'], selectedProfileValue?.key || 'kotor');
    if(selectedProfileValue){
      try{
        // if(img.src == selectedProfileValue.background ){
        //   img.src = selectedProfileValue.background_fallback;
        // }else{
        //   setBackgroundImage(selectedProfileValue.background);
        // }
        beautifyBackgroundImage(selectedProfileValue?.background).then( (background: string) => {
          setBackgroundImage(background);
        }).catch( () => {
          beautifyBackgroundImage(selectedProfileValue?.background_fallback).then( (background: string) => {
            setBackgroundImage(background);
          }).catch( () => {
            setBackgroundImage(selectedProfileValue?.background);
          })
        })
      }catch(e){
        console.error(e);
        setBackgroundImage(selectedProfileValue?.background);
      }
    }
  }, [selectedProfileValue]);

  useEffect( () => {

  }, [backgroundImageValue]);


  useEffect(() => {
    // console.log('Global', 'useEffect');
    axios.get(`https://swkotor.net/api/media/youtube/latest`).then( (res) => {
      if(res.data?.videos){
        setVideos([...res.data.videos]);
      }
    }).catch((e) => {
      console.error(e);
    })
  }, [])

  const providerValue: AppProviderValues = {
    profileCategories: [profileCategoriesValue, setProfilesCategories], 
    selectedProfile: [selectedProfileValue, setSelectedProfile], 
    backgroundImage: [backgroundImageValue, setBackgroundImage],
    videos: [videos, setVideos],
    discordWidgetOpen: [discordWidgetOpen, setDiscordWidgetOpen],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
