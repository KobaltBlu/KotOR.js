import React, { useState, useEffect } from "react";


import { LoadingScreen } from "@/apps/common/components/loadingScreen/LoadingScreen";
import { CommandPalette } from "@/apps/forge/components/CommandPalette";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { ModalChangeGame } from "@/apps/forge/components/modal/ModalChangeGame";
import ModalGrantAccess from "@/apps/forge/components/modal/ModalGrantAccess";
import { ModalManager } from "@/apps/forge/components/modal/ModalManager";
import TabManager from "@/apps/forge/components/tabs/TabManager";
import { useApp } from "@/apps/forge/context/AppContext";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { TabManagerProvider } from "@/apps/forge/context/TabManagerContext";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { createScopedLogger, LogScope } from "@/utility/Logger";
// MenuTop removed: top menu disabled
// import { MenuTop } from "@/apps/forge/components/MenuTop";




const log = createScopedLogger(LogScope.Forge);

export interface AppProps {
  [key: string]: unknown;
}

export const App = (_props: AppProps) => {

  const appContext = useApp();
  const [appReady, setAppReady] = appContext.appReady;
  const [_showGrantModal, setShowGrantModal] = appContext.showGrantModal;
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showLoadingScreen] = appContext.showLoadingScreen;
  const [loadingScreenMessage] = appContext.loadingScreenMessage;
  const [loadingScreenBackgroundURL] = appContext.loadingScreenBackgroundURL;
  const [loadingScreenLogoURL] = appContext.loadingScreenLogoURL;


  const onUserGrant = () => {
    setShowGrantModal(false);
    beginInit();
  }

  const beginInit = () => {
    ForgeState.InitializeApp().then( () => {
      onInitComplete();
    });
  };

  const onInitComplete = () => {
    setAppReady(true);
    setTimeout( () => {
      dispatchEvent( new Event('resize'));
    }, 100);

    log.trace('Forge init complete');
  };

  const onUserCancel = () => {
    setShowGrantModal(true);
    window.close();
  }

  useEffectOnce( () => {

    ForgeState.VerifyGameDirectory(() => {
      log.debug('Game Directory', 'verified');
      setShowGrantModal(false);
      beginInit();
    }, () => {
      log.warn('Game Directory', 'not found');
      setShowGrantModal(true);
    });

    return () => {
      //Deconstructor
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const westContent = (
    <div id="tabs-explorer">
      <TabManagerProvider manager={ForgeState.explorerTabManager}>
        <TabManager></TabManager>
      </TabManagerProvider>
    </div>
  );

  return (
    <>
      <div id="app" className={appReady ? 'app-ready' : ''}>
        {/* Top menu intentionally removed to hide File/Save menus */}
        <div id="container">
          <LayoutContainerProvider>
            <LayoutContainer westContent={westContent}>
              <TabManagerProvider manager={ForgeState.tabManager}>
                <TabManager></TabManager>
              </TabManagerProvider>
            </LayoutContainer>
          </LayoutContainerProvider>
        </div>
        <ModalChangeGame></ModalChangeGame>
      <CommandPalette show={showCommandPalette} onHide={() => setShowCommandPalette(false)} />
      </div>
      <ModalManager manager={ForgeState.modalManager}></ModalManager>
      <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>
      <LoadingScreen active={showLoadingScreen} message={loadingScreenMessage} backgroundURL={loadingScreenBackgroundURL} logoURL={loadingScreenLogoURL} />
    </>
  );

};
