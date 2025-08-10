import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import './app.scss';
import { AppProvider, useApp } from "./context/AppContext";

import { ApplicationEnvironment } from "../../enums/ApplicationEnvironment";
import { ConfigClient } from "../../utility/ConfigClient";
import { CategoryMenuItem } from "./components/CategoryMenuItem";
import { ProfileTabContent } from "./components/ProfileTabContent";
import { ApplicationProfile } from "../../utility/ApplicationProfile";
import { LightboxComponent } from "./components/LightboxComponenet";
import { Launcher } from "./context/Launcher";
import axios, { Axios } from "axios";
(window as any).Launcher = Launcher;

(window as any).ConfigClient = ConfigClient;

if(window.location.origin === 'file://'){
  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.isMac = window.electron.isMac();
}else{
  ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
  let menuTopRight = document.getElementById('launcher-menu-top-right');
  if(menuTopRight) menuTopRight.style.display = 'none';
}

const App = function() {
  const appContext = useApp();
  const [appReady, setAppReady] = useState<boolean>(false);

  const [selectedProfileValue, setSelectedProfile] = appContext.selectedProfile;
  const [profileCategoriesValue, setProfilesCategories] = appContext.profileCategories;
  const [backgroundImageValue, setBackgroundImage] = appContext.backgroundImage;

  const [selectedTab, setSelectedTab] = useState('apps');
  const [videos, setVideos] = useState([]);

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

    axios.get(`https://swkotor.net/api/media/youtube/latest`).then( (res) => {
      if(res.data?.videos){
        setVideos(res.data.videos);
      }
    }).catch((e) => {
      console.error(e);
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
      window.electron.minimize();
    }
  }
  const onBtnMaximize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      window.electron.maximize();
    }
  }
  const onBtnClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      window.close();
    }
  }

  const onTabClicked = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const tabId = e.currentTarget.href.split('#').pop();
    if(!tabId){ return; }
    setSelectedTab(tabId);
  }

  return (
    <>
      <div id="container" className={`${appReady ? 'ready': ''}`} style={{'backgroundImage': `url("${backgroundImageValue}")`}}>
        <div className="launcher-menu">
          <div className="launcher-menu-background"></div>
          <div className="menu-accent"><div className="inner"></div></div>
          <ul className="top-nav">
            <li className="tab-btn nav-logo"><img src="images/kotor-js-logo.png" /></li>
            <li className="tab-btn"><a href="#apps" onClick={onTabClicked}>Apps</a></li>
            <li className="tab-btn"><a href="#community" onClick={onTabClicked}>Community</a></li>
            <li className="tab-btn"><a href="#buy" onClick={onTabClicked}>Need KotOR?</a></li>
          </ul>
          <div id="launcher-menu-top-right" className="launcher-menu-top-right">
            <div className="launcher-min" title="Minimize Window" onClick={onBtnMinimize}><i className="fas fa-window-minimize"></i></div>
            <div className="launcher-max" title="Maximize Window" onClick={onBtnMaximize}><i className="far fa-clone"></i></div>
            <div className="launcher-close" title="Close Window" onClick={onBtnClose}><i className="fas fa-times"></i></div>
          </div>
        </div>
        <div className="tab-host">
          {(selectedTab == 'apps' && <div className="tab selected">
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
          </div>)}
          {(selectedTab == 'community' && <div className="tab selected">
            <div className="launcher-contents full-width">
              <div className="panel">
                <h4>Helpful Links</h4><br />
                <ul className="link-list">
                  <li><a href="https://github.com/KobaltBlu/KotOR.js" target="_new">KotOR.js GitHub Repo</a></li>
                  <li><a href="https://swkotor.net" target="_new">SWKotOR.net</a></li>
                  <li><a href="https://www.youtube.com/@KotORjs" target="_new">YouTube Channel</a></li>
                  <li><a href="https://deadlystream.com" target="_new">Deadly Stream Forum</a></li>
                </ul>

                <div className="video-wrapper">
                  {videos.map( (video: any) => {
                    return (
                      <div className="youtube-video">
                        <a href={video.link['@attributes'].href} target="_new" title={video.title}>
                          <div className="thumbnail" style={{backgroundImage: `url(${video.thumbnail})`}}></div>
                          <span className="title">{video.title}</span>
                        </a>
                      </div>
                    )
                  })}
                </div>

              </div>
            </div>
          </div>)}
          {(selectedTab == 'buy' && <div className="tab selected">
            <div className="launcher-contents full-width">
              <div className="panel">
                <p>This project does not support piracy. To use this app, you will need to have obtained a legal copy of the supported games that you wish to play.</p>
                <br />
                <div className="buy">
                  <iframe src="https://store.steampowered.com/widget/32370/" frameBorder="0" width="646" height="190"></iframe>
                </div>
                <br />
                <div className="buy">
                  <iframe src="https://store.steampowered.com/widget/208580/" frameBorder="0" width="646" height="190"></iframe>
                </div>
              </div>
            </div>
          </div>)}
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
