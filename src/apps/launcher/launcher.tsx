import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { AppProvider, useApp } from "./context/AppContext";

import { ApplicationEnvironment } from "../../enums/ApplicationEnvironment";
import { ConfigClient } from "../../utility/ConfigClient";
import { CategoryMenuItem } from "./components/CategoryMenuItem";
import { ProfileTabContent } from "./components/ProfileTabContent";
import { ApplicationProfile } from "../../utility/ApplicationProfile";
import { LightboxComponent } from "./components/LightboxComponenet";
import { Launcher } from "./context/Launcher";
(window as any).Launcher = Launcher;

(window as any).ConfigClient = ConfigClient;

if(window.location.origin === 'file://'){
  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.isMac = (window as any).electron.isMac();
}else{
  ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
  let menuTopRight = document.getElementById('launcher-menu-top-right');
  if(menuTopRight) menuTopRight.style.display = 'none';
}

//create your forceUpdate hook
(window as any).useForceUpdate = function(){
  const [value, setValue] = React.useState(0); // integer state
  return () => setValue(value => value + 1); // update state to force render
  // A function that increment 👆🏻 the previous state like here 
  // is better than directly setting `setValue(value + 1)`
}

const App = function() {
  const appContext = useApp();
  const [appReady, setAppReady] = useState<boolean>(false);

  const [selectedProfileValue, setSelectedProfile] = appContext.selectedProfile;
  const [profileCategoriesValue, setProfilesCategories] = appContext.profileCategories;
  const [backgroundImageValue, setBackgroundImage] = appContext.backgroundImage;

  let tabRefs: React.RefObject<any>[] = Array(Object.values(profileCategoriesValue).reduce((acc, cat: any) => {
    return acc + cat.profiles.length;
  }, 0)).fill(0).map(i=> React.createRef());

  let resizeEndTimeout: ReturnType<typeof setTimeout>;
  const onResizeEnd = () => {
    console.log('end');
    ConfigClient.set(['Launcher', 'width'], window.outerWidth);
    ConfigClient.set(['Launcher', 'height'], window.outerHeight);
    console.log(tabRefs);
  };

  const onResize = () => {
    clearTimeout(resizeEndTimeout);
    resizeEndTimeout = setTimeout(onResizeEnd, 100);
  };

  const onFocus = () => {
    Launcher.InitProfiles().then( () => {
      setProfilesCategories(Launcher.AppCategories);
      setSelectedProfile(
        Launcher.GetProfileByKey(
          ConfigClient.get(['Launcher', 'selected_profile'], 'kotor')
        )
      );
      document.body.style.display = '';
      // getProfileByKey();
    })
  };

  const onFullscreenChange = (event: Event) => {
    console.log(document.fullscreenElement);
    console.log("FULL SCREEN CHANGE", event)
    if(document.fullscreenElement == null){
      if(event.target instanceof HTMLVideoElement){
        event.target.volume = 0;
        event.target.loop = true;
        if(event.target.currentTime == event.target.duration){
          event.target.currentTime = 0;
        }
        event.target.play();
      }
    }
  };

  useEffect(() => {
    console.log('sp', selectedProfileValue, tabRefs);

    if(!selectedProfileValue) return;
    if(!tabRefs[selectedProfileValue.id]?.current) return;

    tabRefs[selectedProfileValue.id].current.showTab();
  }, [selectedProfileValue])

  //on-mount
  useEffect(() => {
    console.log(tabRefs);
    window.addEventListener('resize', onResize);
    Launcher.InitProfiles().then( () => {
      setProfilesCategories(Launcher.AppCategories);
      setSelectedProfile(
        Launcher.GetProfileByKey(
          ConfigClient.get(['Launcher', 'selected_profile'], 'kotor')
        )
      );
      document.body.style.display = '';
      tabRefs = Array(Object.values(Launcher.AppCategories).reduce((acc, cat: any) => {
        return acc + cat.profiles.length;
      }, 0)).fill(0).map(i=> React.createRef());
      console.log(tabRefs);
      setAppReady(true);
    })
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    //on-unmount
    return () => {
      // console.log('destruct');
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearTimeout(resizeEndTimeout);
    }
  }, []);

  useEffect(() => {
    // console.log('cat', appContext.profileCategories);
  }, [appContext.profileCategories])

  const onBtnMinimize = (e: React.MouseEvent<HTMLDivElement>) => {
    // e.preventDefault();
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      (window as any).electron.minimize();
    }
  }
  const onBtnMaximize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      (window as any).electron.maximize();
    }
  }
  const onBtnClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      window.close();
    }
  }

  return (
    <>
      <div id="container" className={`${appReady ? 'ready': ''}`} style={{'backgroundImage': `url("${backgroundImageValue}")`}}>
        <div className="launcher-menu">
          <div className="launcher-menu-background"></div>
          <div className="menu-accent"><div className="inner"></div></div>
          <ul className="top-nav">
            <li className="tab-btn nav-logo"><img src="images/kotor-js-logo.png" /></li>
            <li className="tab-btn"><a href="#apps">Apps</a></li>
          </ul>
          <div id="launcher-menu-top-right" className="launcher-menu-top-right">
            <div className="launcher-min" title="Minimize Window" onClick={onBtnMinimize}><i className="fas fa-window-minimize"></i></div>
            <div className="launcher-max" title="Maximize Window" onClick={onBtnMaximize}><i className="far fa-clone"></i></div>
            <div className="launcher-close" title="Close Window" onClick={onBtnClose}><i className="fas fa-times"></i></div>
          </div>
        </div>
        <div className="tab-host">
          <div className="tab selected" data-tab-id="apps">
            <div className="launcher-options">
              {Object.values(profileCategoriesValue).map((category: any, i: number) => {
                return (
                  <CategoryMenuItem category={category} key={`cat-menu-item-${i}`}></CategoryMenuItem>
                )
              })}
            </div>
            <div className="launcher-contents">
              {Object.values(profileCategoriesValue).map((category: any, index: number) => {
                return (
                  category.profiles.map((profile: any, index: number) => {
                    return (
                      <ProfileTabContent ref={tabRefs[profile.id]} profile={profile} active={selectedProfileValue == profile ? true : false} key={`profile-content-item-${profile.id}`}></ProfileTabContent>
                    )
                  })
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );

}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
( async () => {
  (window as any).launcherView = root.render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
})();
