import React, { useEffect, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";

import "@/apps/launcher/app.scss";


import { CategoryMenuItem } from "@/apps/launcher/components/CategoryMenuItem";
import { CommunityTabContent } from "@/apps/launcher/components/CommunityTabContent";
import DiscordWidget from "@/apps/launcher/components/DiscordWidget";
import { GOGWidget } from "@/apps/launcher/components/GOGWidget";
import type { ProfileTabContentHandle } from "@/apps/launcher/components/ProfileTabContent";
import { ProfileTabContent } from "@/apps/launcher/components/ProfileTabContent";
import { AppProvider, useApp } from "@/apps/launcher/context/AppContext";
import { Launcher } from "@/apps/launcher/context/Launcher";
import type { ProfileCategory } from "@/apps/launcher/types";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { ConfigClient } from "@/utility/ConfigClient";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Launcher);

type LauncherRoot = Root;

window.Launcher = Launcher;
window.ConfigClient = ConfigClient;

if(window.location.origin === 'file://'){
  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.isMac = window.electron.isMac();
}else{
  ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
  const menuTopRight = document.getElementById('launcher-menu-top-right');
  if(menuTopRight) menuTopRight.style.display = 'none';
}

const App = function() {
  const appContext = useApp();
  const [appReady, setAppReady] = useState<boolean>(false);

  const [selectedProfileValue, setSelectedProfile] = appContext.selectedProfile;
  const [profileCategoriesValue, setProfilesCategories] = appContext.profileCategories;
  const [backgroundImageValue] = appContext.backgroundImage;
  const [discordWidgetOpen, setDiscordWidgetOpen] = appContext.discordWidgetOpen;
  const [showMenuTopRight, setShowMenuTopRight] = useState(ApplicationProfile.ENV != ApplicationEnvironment.BROWSER);

  const [selectedTab, setSelectedTab] = useState('apps');

  let tabRefs: React.RefObject<ProfileTabContentHandle | null>[] = Array(Object.values(profileCategoriesValue).reduce((acc: number, cat: ProfileCategory) => {
    return acc + cat.profiles.length;
  }, 0)).fill(0).map(() => React.createRef<ProfileTabContentHandle | null>());

  let resizeEndTimeout: ReturnType<typeof setTimeout>;
  const onResizeEnd = () => {
    log.trace('resize end');
    ConfigClient.set(['Launcher', 'width'], window.outerWidth);
    ConfigClient.set(['Launcher', 'height'], window.outerHeight);
    log.debug('tabRefs count', tabRefs.length);
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
          String(ConfigClient.get(['Launcher', 'selected_profile'], 'kotor') ?? 'kotor')
        )
      );
      document.body.style.display = '';
      // getProfileByKey();
    })
  };

  const onFullscreenChange = (event: Event) => {
    log.debug('fullscreenchange', document.fullscreenElement, event)
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
    log.trace('selectedProfile', selectedProfileValue?.key, 'tabRefs', tabRefs.length);

    if(!selectedProfileValue) return;
    if(!tabRefs[selectedProfileValue.id]?.current) return;

    tabRefs[selectedProfileValue.id].current.showTab();
  }, [selectedProfileValue])

  //on-mount
  useEffect(() => {
    log.trace('mount: tabRefs initial', tabRefs.length);
    window.addEventListener('resize', onResize);
    setShowMenuTopRight(!(ApplicationProfile.ENV == ApplicationEnvironment.BROWSER));
    Launcher.InitProfiles().then( () => {
      setProfilesCategories(Launcher.AppCategories);
      setSelectedProfile(
        Launcher.GetProfileByKey(
          String(ConfigClient.get(['Launcher', 'selected_profile'], 'kotor') ?? 'kotor')
        )
      );
      document.body.style.display = '';
      tabRefs = Array(Object.values(Launcher.AppCategories).reduce((acc: number, cat: ProfileCategory) => {
        return acc + cat.profiles.length;
      }, 0)).fill(0).map(() => React.createRef<ProfileTabContentHandle | null>());
      log.debug('mount: tabRefs after InitProfiles', tabRefs.length);
      setAppReady(true);
    })

    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    //on-unmount
    return () => {
      log.trace('launcher unmount: removing resize/focus/fullscreen listeners');
      window.removeEventListener('resize', onResize);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearTimeout(resizeEndTimeout);
    }
  }, []);

  useEffect(() => {
    log.trace('profileCategories changed', Object.keys(appContext.profileCategories).length);
  }, [appContext.profileCategories]);

  const onBtnMinimize = (_e: React.MouseEvent<HTMLDivElement>) => {
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

  const onDiscordToggle = (e: React.MouseEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDiscordWidgetOpen(!discordWidgetOpen);
  }

  return (
    <>
      <div id="container" className={`${appReady ? 'ready': ''} ${discordWidgetOpen ? 'discord_widget_open' : ''}`} style={{'backgroundImage': `url("${backgroundImageValue}")`}}>
        <div className="launcher-menu">
          <div className="launcher-menu-background"></div>
          <div className="menu-accent"><div className="inner"></div></div>
          <ul className="top-nav">
            <li className="tab-btn nav-logo"><img src="images/kotor-js-logo.png" /></li>
            <li className="tab-btn"><a href="#apps" onClick={onTabClicked}>Apps</a></li>
            <li className="tab-btn"><a href="#community" onClick={onTabClicked}>Community</a></li>
            <li className="tab-btn"><a href="#buy" onClick={onTabClicked}>Need KotOR?</a></li>
            <li className="tab-btn discord-toggle" onClick={onDiscordToggle} title={discordWidgetOpen ? "Hide Discord" : "Show Discord"}>
              <i className={`fab fa-discord ${discordWidgetOpen ? 'active' : ''}`}></i>
            </li>
          </ul>
          {showMenuTopRight && (
            <div id="launcher-menu-top-right" className="launcher-menu-top-right">
              <div className="launcher-min" title="Minimize Window" onClick={onBtnMinimize}><i className="fas fa-window-minimize"></i></div>
              <div className="launcher-max" title="Maximize Window" onClick={onBtnMaximize}><i className="far fa-clone"></i></div>
              <div className="launcher-close" title="Close Window" onClick={onBtnClose}><i className="fas fa-times"></i></div>
            </div>
          )}
        </div>
        <div className="tab-host">
          {(selectedTab == 'apps' && <div className="tab selected">
            <div className="launcher-options">
              {Object.values(profileCategoriesValue).map((category: ProfileCategory, i: number) => {
                return (
                  <CategoryMenuItem category={category} key={`cat-menu-item-${i}`}></CategoryMenuItem>
                )
              })}
            </div>
            <div className="launcher-contents">
              {Object.values(profileCategoriesValue).map((category: ProfileCategory, _index: number) => {
                return (
                  category.profiles.map((profile, _index: number) => {
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
              <CommunityTabContent />
            </div>
          </div>)}
          {(selectedTab == 'buy' && <div className="tab selected">
            <div className="launcher-contents full-width d-flex">
              <div className="panel scroll-y">
                <p>This project does not support piracy. To use this app, you will need to have obtained a legal copy of the supported games that you wish to play.</p>
                <br />

                <h3 className="title">GOG Store</h3>
                <div className="buy-widgets" style={{display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px'}}>
                  <GOGWidget
                    productId="1207666283" // KotOR 1 GOG ID
                    onError={(error) => log.error('GOG Widget Error', error)}
                    onProductLoaded={(product) => log.info('GOG Widget product loaded', product)}
                    showPrice={true}
                    showDiscount={true}
                  />
                  <GOGWidget
                    productId="1421404581" // KotOR 2 GOG ID
                    onError={(error) => log.error('GOG Widget Error', error)}
                    onProductLoaded={(product) => log.info('GOG Widget product loaded', product)}
                    showPrice={true}
                    showDiscount={true}
                  />
                </div>

                <br />
                <h3 className="title">Steam Store</h3>
                <div className="buy">
                  <br />
                  <iframe src="https://store.steampowered.com/widget/32370/" frameBorder="0" width="646" height="190"></iframe>
                  <br />
                  <iframe src="https://store.steampowered.com/widget/208580/" frameBorder="0" width="646" height="190"></iframe>
                </div>
              </div>
            </div>
          </div>)}
          <div className="version">{process.env.VERSION}</div>
        </div>
        <DiscordWidget serverId="739590575359262792" />
      </div>
    </>
  );

}

/** Launcher exposes root (React root instance) on window for tooling. */
interface WindowWithLauncherView extends Window {
  launcherView?: LauncherRoot;
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
(async () => {
  (window as WindowWithLauncherView).launcherView = root;
  root.render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
})();
