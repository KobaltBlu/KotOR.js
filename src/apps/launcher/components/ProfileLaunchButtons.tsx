import React, { useState } from "react";
import { ApplicationEnvironment } from "../../../enums/ApplicationEnvironment";
import { ApplicationProfile } from "../../../utility/ApplicationProfile";
import { ConfigClient } from "../../../utility/ConfigClient";
import { RuntimeConfig } from "../../../utility/RuntimeConfig";
import { useApp } from "../context/AppContext";

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
  const isLocateRequired = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && !!profile.locate_required) && !profile.directory

  const launchLabel = profile.category == 'game' ? 'PLAY' : 'OPEN';

  const hasExecutableSupport = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && profile.executable) ? true: false;

  const isForge = (profile.name == 'KotOR Forge');

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
      }).catch( (e: any) => {
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
    let clean_profile = Object.assign({}, profile);
    if(isForge){
      let clean_game_profile = Object.assign({}, profileCategoriesValue?.game?.profiles.find( (p: any) => {
        return p.key == forgeSelectValue;
      }));
      console.log('s', forgeSelectValue, clean_game_profile);
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        clean_profile.key = clean_game_profile.key;
        window.electron.launchProfile(clean_profile);
      }else{
        const url = new URL(RuntimeConfig.toPublicUrl(`/${clean_profile.launch.path}`), window.location.origin);
        url.searchParams.set('key', String(clean_game_profile.key));
        window.open(url.toString());
      }
    }else{
      if(hasExecutableSupport && selectValue == 'executable'){
        //TODO: Add EXE/APP Support
      }else{
        if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
          window.electron.launchProfile(clean_profile);
        }else{
          const url = new URL(RuntimeConfig.toPublicUrl(`/${clean_profile.launch.path}`), window.location.origin);
          url.searchParams.set('key', String(clean_profile.key));
          window.open(url.toString());
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
                  .filter( (p: any) => p.isForgeCompatible )
                  .map((p: any, index: number) => {
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
