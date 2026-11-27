import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigClient } from "@/utility/ConfigClient";
import { startLauncherBackground } from "@/apps/launcher/context/launcherBackground";

export interface AppProviderValues {
  version: string,
  profileCategories: [any, React.Dispatch<any>]
  selectedProfile: [any, React.Dispatch<any>],
  backgroundImage: [ any,  React.Dispatch<any>],
  videos: [ any[], React.Dispatch<any[]>],
  discordWidgetOpen: [ boolean, React.Dispatch<React.SetStateAction<boolean>>],
  profilesDrawerOpen: [ boolean, React.Dispatch<React.SetStateAction<boolean>>],
}
export const AppContext = createContext<AppProviderValues>({} as any);

export function useApp(){
  return useContext(AppContext);
}

export const AppProvider = (props: any) => {
  const [profileCategoriesValue, setProfilesCategories] = useState<any>({});
  const [selectedProfileValue, setSelectedProfile] = useState<any|undefined>();
  const [backgroundImageValue, setBackgroundImage] = useState<string>('');
  const [videos, setVideos] = useState<any[]>([]);
  const [discordWidgetOpen, setDiscordWidgetOpen] = useState<boolean>(false);
  const [profilesDrawerOpen, setProfilesDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    ConfigClient.set(['Launcher', 'selected_profile'], selectedProfileValue?.key || 'kotor');
    return startLauncherBackground(
      selectedProfileValue?.background,
      selectedProfileValue?.background_fallback,
      setBackgroundImage,
    );
  }, [selectedProfileValue]);

  useEffect(() => {
    // console.log('Global', 'useEffect');
    fetch(`https://swkotor.net/api/media/youtube/latest`).then( (res) => {
      if(res.ok){
        return res.json();
      }
      throw new Error('Failed to fetch YouTube videos');
    }).then( (data) => {
      if(data?.videos){
        setVideos([...data.videos]);
      }
    }).catch((e) => {
      console.error(e);
    });
  }, [])

  const providerValue: AppProviderValues = {
    version: process.env.VERSION || 'N/A',
    profileCategories: [profileCategoriesValue, setProfilesCategories], 
    selectedProfile: [selectedProfileValue, setSelectedProfile], 
    backgroundImage: [backgroundImageValue, setBackgroundImage],
    videos: [videos, setVideos],
    discordWidgetOpen: [discordWidgetOpen, setDiscordWidgetOpen],
    profilesDrawerOpen: [profilesDrawerOpen, setProfilesDrawerOpen],
  };

  return (
    <AppContext.Provider value={providerValue}>
      {props.children}
    </AppContext.Provider>
  );
};
