import React, { useState } from "react";
import { ApplicationEnvironment } from "../../../enums/ApplicationEnvironment";
import { ApplicationProfile } from "../../../utility/ApplicationProfile";
import { ConfigClient } from "../../../utility/ConfigClient";
import { GameFileSystem } from "../../../utility/GameFileSystem";
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
  const [locateError, setLocateError] = useState<string | null>(null);
  const isLocateRequired = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && !!profile.locate_required) && !profile.directory

  const launchLabel = profile.category == 'game' ? 'PLAY' : 'OPEN';

  const hasExecutableSupport = (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON && profile.executable) ? true: false;

  const isForge = (profile.name == 'KotOR Forge');

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectValue(e.target.value);
  }

  const onForgeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    setLocateError(null);
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      window.electron.locate_game_directory(profile).then( (directory: string) => {
        if(directory){
          ConfigClient.set(`Profiles.${profile.key}.directory`, directory);
          profile.directory = directory;
          rerender(!render);
        }
      }).catch( (e: any) => {
        console.error(e);
        setLocateError('Could not locate game directory. Please try again.');
      });
    }else{
      GameFileSystem.showRequestDirectoryDialog().then( (handle) => {
        if(handle){
          ApplicationProfile.directoryHandle = handle;
          ConfigClient.set(`Profiles.${profile.key}.directory_handle`, handle);
          profile.directoryHandle = handle;
          rerender(!render);
        }else{
          setLocateError('No directory selected. Please select your game install folder.');
        }
      }).catch( (e: any) => {
        if(e?.name !== 'AbortError'){
          console.error(e);
          setLocateError('Failed to access the directory. Please try again.');
        }
      });
    }
  };

  const btnLaunch = () => {
    let clean_profile = Object.assign({}, profile);
    if(isForge){
      let clean_game_profile = Object.assign({}, profileCategoriesValue?.game?.profiles.find( (p: any) => {
        return p.key == forgeSelectValue;
      }));
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
        {locateError && <p className="locate-error" role="alert" style={{color: 'red', fontSize: '0.85em', marginTop: '0.4em'}}>{locateError}</p>}
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