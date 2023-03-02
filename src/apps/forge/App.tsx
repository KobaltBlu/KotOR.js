import React from "react";
import TabManager from "./components/tabs/TabManager";
import { TabManagerProvider } from "./context/TabManagerContext";
import { ForgeState } from "./states/ForgeState";
import { MenuTop } from "./components/MenuTop";
import { LayoutContainerProvider } from "./context/LayoutContainerContext";
import { LayoutContainer } from "./components/LayoutContainer";
import ModalGrantAccess from "./components/modal/ModalGrantAccess";
import { ModalChangeGame } from "./components/modal/ModalChangeGame";
import { useEffectOnce } from "./helpers/UseEffectOnce";
import { useApp } from "./context/AppContext";

export const App = (props: any) => {

  const appContext = useApp();
  const [appReady, setAppReady] = appContext.appReady;
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;


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
      <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>
    </>
  );

};