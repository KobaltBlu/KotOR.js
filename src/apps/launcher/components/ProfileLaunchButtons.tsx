import React, { useState } from "react";

import { useApp } from "../context/AppContext";
import type { LauncherProfile } from "../types";

import { ApplicationEnvironment } from "../../../enums/ApplicationEnvironment";
import { ApplicationProfile } from "../../../utility/ApplicationProfile";
import { ConfigClient } from "../../../utility/ConfigClient";
import { createScopedLogger, LogScope } from "../../../utility/Logger";

const log = createScopedLogger(LogScope.Launcher);

export interface ProfileLaunchButtonsProps {
  profile: LauncherProfile;
}

export const ProfileLaunchButtons = function(props: ProfileLaunchButtonsProps) {
  const profile = props.profile;
  const appContext = useApp();
  const [profileCategoriesValue, setProfileCategories] = appContext.profileCategories;

  const [render, rerender] = useState(false);
  const [selectValue, setSelectValue] = useState<string>("js");
  const [forgeSelectValue, setForgeSelectValue] = useState<string | undefined>(undefined);
  const isLocateRequired = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && !!profile.locate_required) && !profile.directory

  const launchLabel = profile.category == 'game' ? 'PLAY' : 'OPEN';

  const hasExecutableSupport = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && profile.executable) ? true: false;

  const isForge = (profile.name == 'KotOR Forge');

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectValue(e.target.value);
  }

  const onForgeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    log.trace('onForgeSelectChange', e.target.value);
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
        log.debug('locate_game_directory result', directory);
        if(directory){
          ConfigClient.set(`Profiles.${profile.key}.directory`, directory);
          profile.directory = directory;
          rerender(!render);
        }
      }).catch( (e: Error) => {
        log.error('locate_game_directory failed', e);
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
      const clean_game_profile = Object.assign({}, profileCategoriesValue?.game?.profiles.find( (p: LauncherProfile) => {
        return p.key == forgeSelectValue;
      }));
      log.debug('forge select', forgeSelectValue, clean_game_profile?.key);
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
                {(
                  profileCategoriesValue?.game?.profiles || [])
                  .filter( (p: LauncherProfile) => p.isForgeCompatible )
                  .map((p: LauncherProfile, index: number) => {
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
        </div>
      </>  
    );
  }
};