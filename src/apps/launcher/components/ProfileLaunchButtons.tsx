import React, { useEffect, useState } from "react";

import { launchOpenVSCodeBeta } from "@/apps/forge/integration/OpenVSCodeBeta";
import { useApp } from "@/apps/launcher/context/AppContext";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { ConfigClient } from "@/utility/ConfigClient";

export interface ProfileLaunchButtonsProps {
  profile: any
}

export const ProfileLaunchButtons = function(props: ProfileLaunchButtonsProps) {
  const profile = props.profile;
  const appContext = useApp();
  const [profileCategoriesValue, setProfileCategories] = appContext.profileCategories;

  const [render, rerender] = useState(false);
  const [selectValue, setSelectValue] = useState<any>("js");
  const [forgeSelectValue, setForgeSelectValue] = useState<any>();
  const forgeCompatibleProfiles = (profileCategoriesValue?.game?.profiles || []).filter((p: any) => p.isForgeCompatible);
  const isLocateRequired = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && !!profile.locate_required) && !profile.directory

  const launchLabel = profile.category == 'game' ? 'PLAY' : 'OPEN';

  const hasExecutableSupport = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && profile.executable) ? true: false;

  const isForge = (profile.name == 'KotOR Forge');

  useEffect(() => {
    if (isForge && !forgeSelectValue && forgeCompatibleProfiles.length > 0) {
      setForgeSelectValue(forgeCompatibleProfiles[0].key);
    }
  }, [forgeCompatibleProfiles, forgeSelectValue, isForge]);

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectValue(e.target.value);
  }

  const onForgeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value)
    setForgeSelectValue(e.target.value);
  }

  const onLocateClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    btnLocate();
  };

  const onLaunchClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    btnLaunch();
  };

  const btnLocate = () => {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      window.electron.locate_game_directory(profile).then( (directory: string) => {
        console.log('directory', directory);
        if(directory){
          ConfigClient.set(`Profiles.${profile.key}.directory`, directory);
          profile.directory = directory;
          rerender(!render);
        }
      }).catch( (e: unknown) => {
        console.error(e);
      });
    }else{
      // let handle = await window.showDirectoryPicker({
      //   mode: "readwrite"
      // });
      // if(handle){
      //   if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
      //     ConfigClient.set(`Profiles.${profile.key}.directory_handle`, handle);
      //     buildProfileElement(ConfigClient.get(`Profiles.${profile.key}`));
      //     setLauncherOption(profile.key);
      //   }
      // }
    }
  };

  const btnLaunch = () => {
    const clean_profile = Object.assign({}, profile);
    if(isForge){
      const clean_game_profile = Object.assign({}, forgeCompatibleProfiles.find( (p: any) => {
        return p.key == forgeSelectValue;
      }) || forgeCompatibleProfiles[0]);
      console.log('s', forgeSelectValue, clean_game_profile);
      if(!clean_game_profile?.key){
        return;
      }
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        clean_profile.key = clean_game_profile.key;
        window.electron.launchProfile(clean_profile);
      }else{
        window.open(`/${clean_profile.launch.path}?key=${clean_game_profile.key}`);
      }
    }else{
      if(hasExecutableSupport && selectValue == 'executable'){
        //TODO: Add EXE/APP Support
      }else{
        if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
          window.electron.launchProfile(clean_profile);
        }else{
          window.open(`/${clean_profile.launch.path}?key=${clean_profile.key}`);
        }
      }
    }
  };

  const btnOpenVSCodeBeta = () => {
    const selectedGameKey = forgeSelectValue || forgeCompatibleProfiles[0]?.key || 'kotor';
    const profileConfig = profile.openVSCodeBeta || {};
    const baseUrl = profileConfig.url || '';
    if(!baseUrl){
      window.alert('OpenVSCode (beta) URL is not configured for this profile.');
      return;
    }

    launchOpenVSCodeBeta({
      baseUrl,
      gameKey: selectedGameKey,
      promptMessage: profileConfig.promptMessage,
      openExternal: ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON
        ? (url) => window.electron.openExternal(url)
        : undefined,
    });
  };

  if(isLocateRequired){
    return (
      <div className="launch-btns">
        <a href="#" className="btn-launch locate" key="launch-btn-locate" onClick={onLocateClick}>LOCATE</a>
      </div>
    );
  }else{
    return (
      <>
        { hasExecutableSupport ?
          <div className="launch-select">
            <select className="select" onChange={onSelectChange} value={selectValue}>
              <option value="js">{profile.name} - JS</option>
              <option value="executable">{profile.name} - Retail</option>
            </select>
          </div> : isForge ? (
            <div className="launch-select">
              <select className="select" onChange={onForgeSelectChange} value={forgeSelectValue}>
                {forgeCompatibleProfiles
                  .map((p: any) => {
                    return (
                      <option key={p.name} value={p.key}>{p.name}</option>
                    )
                  }
                )}
              </select>
            </div>
          ) : <></>
        }
        <div className="launch-btns">
          <a href="#" className="btn-launch" key="launch-btn-launch" onClick={onLaunchClick}>{launchLabel}</a>
          {isForge && (
            <a href="#" className="btn-launch" key="launch-btn-openvscode-beta" onClick={(e) => { e.preventDefault(); btnOpenVSCodeBeta(); }}>
              OpenVSCode (beta)
            </a>
          )}
        </div>
      </>  
    );
  }
};