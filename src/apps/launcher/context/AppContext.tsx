import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigClient } from "../../../utility/ConfigClient";


export interface AppProviderValues {
  profileCategories: [any, React.Dispatch<any>]
  selectedProfile: [any, React.Dispatch<any>],
  backgroundImage: [ any,  React.Dispatch<any>],
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [profileCategoriesValue, setProfilesCategories] = useState<any>({});
  const [selectedProfileValue, setSelectedProfile] = useState<any|undefined>();
  const [backgroundImageValue, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    ConfigClient.set(['Launcher', 'selected_profile'], selectedProfileValue?.key || 'kotor');
    if(selectedProfileValue){
      try{
        const img = new Image();
        img.onload = async () => {
          const width = img.width;
          const height = img.height;
          const canvas = new OffscreenCanvas(width, height);
          const ctx = canvas.getContext('2d');
          const gradientStart = {x: 0, y: (height-(height * 0.25))};
          const gradientEnd = {x: width, y: height};
          if(ctx instanceof OffscreenCanvasRenderingContext2D){
            ctx.drawImage(img, 0, 0);
            const gradient = ctx.createLinearGradient(0, gradientStart.y, 0, gradientEnd.y);
            gradient.addColorStop(1, "black");
            gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = gradient;
            ctx.fillRect(gradientStart.x, gradientStart.y, gradientEnd.x, gradientEnd.y);
            const newBackgroundURL = URL.createObjectURL(await canvas.convertToBlob({type: 'image/webp', quality:  100}));
            setBackgroundImage(newBackgroundURL);
          }
        }
        img.onerror = () => {
          setBackgroundImage(selectedProfileValue.background);
        }
        img.src = selectedProfileValue.background;
      }catch(e){
        setBackgroundImage(selectedProfileValue?.background);
      }
    }
  }, [selectedProfileValue]);

  useEffect( () => {

  }, [backgroundImageValue]);


  useEffect(() => {
    // console.log('Global', 'useEffect');
  }, [])

  const providerValue: AppProviderValues = {
    profileCategories: [profileCategoriesValue, setProfilesCategories], 
    selectedProfile: [selectedProfileValue, setSelectedProfile], 
    backgroundImage: [backgroundImageValue, setBackgroundImage],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
