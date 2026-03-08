import React from "react";

import { LoadingScreen } from "@/apps/common/components/loadingScreen/LoadingScreen";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { MenuTop } from "@/apps/forge/components/MenuTop";
import { ModalChangeGame } from "@/apps/forge/components/modal/ModalChangeGame";
import ModalGrantAccess from "@/apps/forge/components/modal/ModalGrantAccess";
import { ModalManager } from "@/apps/forge/components/modal/ModalManager";
import TabManager from "@/apps/forge/components/tabs/TabManager";
import { useApp } from "@/apps/forge/context/AppContext";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { TabManagerProvider } from "@/apps/forge/context/TabManagerContext";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export const App = (props: any) => {

  const appContext = useApp();
  const [appReady, setAppReady] = appContext.appReady;
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;
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

  const westContent = (
    <div id="tabs-explorer" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
      <TabManagerProvider manager={ForgeState.explorerTabManager}>
        <TabManager></TabManager>
      </TabManagerProvider>
    </div>
  );

  return (
    <>
      <div id="app" style={{ opacity: (appReady) ? '1': '0' }}>
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
      </div>
      <ModalManager manager={ForgeState.modalManager}></ModalManager>
      <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>
      <LoadingScreen active={showLoadingScreen} message={loadingScreenMessage} backgroundURL={loadingScreenBackgroundURL} logoURL={loadingScreenLogoURL} />
    </>
  );

};