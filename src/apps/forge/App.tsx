import React, { useState, useEffect } from "react";
import TabManager from "./components/tabs/TabManager";
import { TabManagerProvider } from "./context/TabManagerContext";
import { ForgeState } from "./states/ForgeState";
import { MenuTop } from "./components/MenuTop";
import { LayoutContainerProvider } from "./context/LayoutContainerContext";
import { LayoutContainer } from "./components/LayoutContainer/LayoutContainer";
import ModalGrantAccess from "./components/modal/ModalGrantAccess";
import { ModalChangeGame } from "./components/modal/ModalChangeGame";
import { useEffectOnce } from "./helpers/UseEffectOnce";
import { useApp } from "./context/AppContext";
import { ModalManager } from "./components/modal/ModalManager";
import { LoadingScreen } from "../common/components/loadingScreen/LoadingScreen";
import { CommandPalette } from "./components/CommandPalette";

export const App = (props: any) => {

  const appContext = useApp();
  const [appReady, setAppReady] = appContext.appReady;
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;
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

    // console.log('start');
    // TabResourceExplorerState.GenerateResourceList().then( () => {
    //   console.log('end');
    // })
  };

  const onUserCancel = () => {
    setShowGrantModal(true);
    window.close();
  }

  useEffectOnce( () => {

    ForgeState.VerifyGameDirectory(() => {
      console.log('Game Directory', 'verified');
      setShowGrantModal(false);
      beginInit();
    }, () => {
      console.warn('Game Directory', 'not found');
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
        <MenuTop />
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
