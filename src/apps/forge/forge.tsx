import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
(window as any).monaco = monaco;
// const Jison = (window as any).Jison = require("jison").Jison;
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import 'bootstrap';
import './forge.scss';
import MenuTop from './components/MenuTop';
import {LayoutContainer} from './components/LayoutContainer'; 
import ModalGrantAccess from './components/modal/ModalGrantAccess';
import TabManager from './components/tabs/TabManager';
import { LoadingScreen } from './components/LoadingScreen';
import { TabManagerProvider } from './context/TabManagerContext';
import { AppProvider, useApp } from './context/AppContext';
import { ForgeState } from './states/ForgeState';
import { TabQuickStartState } from './states/tabs/TabQuickStartState';
import { useLoadingScreen } from './context/LoadingScreenContext';
import { useEffectOnce } from './helpers/UseEffectOnce';
import { TabResourceExplorerState } from './states/tabs/TabResourceExplorerState';
import { TabProjectExplorerState } from './states/tabs/TabProjectExplorerState';
import { ModalChangeGame } from './components/modal/ModalChangeGame';
import { LayoutContainerProvider } from './context/LayoutContainerContext';
import * as KotOR from "./KotOR";

console.log('script', 'begin');

declare const dialog: any;

const query = new URLSearchParams(window.location.search);

switch(query.get('key')){ 
  case 'kotor':
  case 'tsl':

  break;
  default:
    query.set('key', 'kotor');
  break;
}

const App = (props: any) => {

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

  // console.log('render');
  // let modalGrantAccess: JSX.Element|undefined;
  // if(showGrantAccessModal){
  //   modalGrantAccess = ;
  // }

  const westContent = (
    <div id="tabs-explorer" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
      <TabManagerProvider manager={ForgeState.explorerTabManager}>
        <TabManager></TabManager>
      </TabManagerProvider>
    </div>
  );

  return (
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
      <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>
      <ModalChangeGame></ModalChangeGame>
    </div>
  );

};

( async () => {
  await KotOR.ConfigClient.Init();
  const getProfile = () => {
    return KotOR.ConfigClient.get(`Profiles.${query.get('key')}`);
  }
  
  KotOR.ApplicationProfile.InitEnvironment(getProfile());

  // switch(KotOR.ApplicationProfile.profile.launch.args.gameChoice){
  //   case 2:
  //     KotOR.ApplicationProfile.GameKey = GameEngineType.TSL;
  //   break;
  //   default:
  //     KotOR.ApplicationProfile.GameKey = GameEngineType.KOTOR;
  //   break;
  // }

  document.body.classList.add(KotOR.ApplicationProfile.GameKey);

  console.log('root', 'init');
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  ( async () => {
    root.render(
      // <React.StrictMode>
        <AppProvider>
          <App />
        </AppProvider>
      // </React.StrictMode>
    );
  })();
})();
