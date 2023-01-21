import React, { useEffect, useState } from "react";
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
  const myContext = useApp();
  const [appReady, setAppReady] = useState<boolean>(false);

  const [selectedProfileValue, setSelectedProfile] = myContext.selectedProfile;
  const [profileCategoriesValue, setProfilesCategories] = myContext.profileCategories;

  let resizeEndTimeout: ReturnType<typeof setTimeout>;
  const onResizeEnd = () => {
    ConfigClient.set(['Launcher', 'width'], window.outerWidth);
    ConfigClient.set(['Launcher', 'height'], window.outerHeight);
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

  //on-mount
  useEffect(() => {
    window.addEventListener('resize', onResize);
    Launcher.InitProfiles().then( () => {
      setProfilesCategories(Launcher.AppCategories);
      setSelectedProfile(
        Launcher.GetProfileByKey(
          ConfigClient.get(['Launcher', 'selected_profile'], 'kotor')
        )
      );
      document.body.style.display = '';
      setAppReady(true);
    })
    window.addEventListener('focus', onFocus);
    //on-unmount
    return () => {
      // console.log('destruct');
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', onFocus);
      clearTimeout(resizeEndTimeout);
    }
  }, []);

  useEffect(() => {
    // console.log('cat', myContext.profileCategories);
  }, [myContext.profileCategories])

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
      <div id="container" className={`${appReady ? 'ready': ''}`} style={{'backgroundImage': `url("${selectedProfileValue?.background}")`}}>
        <div className="launcher-menu">
          <div className="launcher-menu-background"></div>
          <div className="menu-accent"><div className="inner"></div></div>
          <ul className="top-nav">
            <li className="tab-btn nav-logo"><img src="images/kotor-js-logo.png" /></li>
            <li className="tab-btn"><a href="#games">Games</a></li>
          </ul>
          <div id="launcher-menu-top-right" className="launcher-menu-top-right">
            <div className="launcher-min" title="Minimize Window" onClick={onBtnMinimize}><i className="fas fa-window-minimize"></i></div>
            <div className="launcher-max" title="Maximize Window" onClick={onBtnMaximize}><i className="far fa-clone"></i></div>
            <div className="launcher-close" title="Close Window" onClick={onBtnClose}><i className="fas fa-times"></i></div>
          </div>
        </div>
        <div className="tab-host">
          <div id="games" className="tab selected">
            <div className="launcher-options">
              {Object.values(profileCategoriesValue).map((category: any, i: number) => {
                return (
                  <CategoryMenuItem category={category} key={`cat-menu-item-${i}`}></CategoryMenuItem>
                )
              })}
            </div>
            <div className="launcher-contents">
              {Object.values(profileCategoriesValue).map((category: any, catI: number) => {
                return (
                  category.profiles.map((profile: any, profI: number) => {
                    return (
                      <ProfileTabContent profile={profile} active={selectedProfileValue == profile ? true : false} key={`profile-content-item-${((catI*100) + profI)}`}></ProfileTabContent>
                    )
                  })
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <LightboxComponent />
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
