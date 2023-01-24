import * as monaco from 'monaco-editor';
(window as any).monaco = monaco;
// const Jison = (window as any).Jison = require("jison").Jison;
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import 'bootstrap';
import './forge.scss';
import MenuTop from './components/MenuTop';
import {LayoutContainer} from './components/LayoutContainer'; 
import { GameEngineType } from '../../enums/engine/GameEngineType';
import ModalGrantAccess from './components/modal/ModalGrantAccess';
import { TabManagerProvider } from './context/TabManagerContext';
import TabManager from './components/tabs/TabManager';
import { AppProvider } from './context/AppContext';
import { ForgeState } from './states/ForgeState';
import { TabQuickStartState } from './states/tabs/TabQuickStartState';
import { LoadingScreen } from './components/LoadingScreen';

declare const KotOR: any;
declare const dialog: any;
// declare const fs: any;

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

  const [showGrantAccessModal, setShowGrantAccessModal] = useState<boolean>(false);

  const onUserGrant = () => {
    setShowGrantAccessModal(false);
  }

  const onUserCancel = () => {
    setShowGrantAccessModal(true);
    window.close();
  }

  useEffect( () => {
    ForgeState.tabManager.AddTab(new TabQuickStartState());
    ForgeState.explorerTabManager.AddTab(ForgeState.resourceExplorerTab);
    ForgeState.explorerTabManager.AddTab(ForgeState.projectExplorerTab);
    return () => {
      //Deconstructor
    }
  }, []);

  console.log('render');
  let modalGrantAccess: JSX.Element|undefined;
  if(showGrantAccessModal){
    modalGrantAccess = <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>;
  }

  const westContent = (
    <div id="tabs-explorer" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
      <TabManagerProvider manager={ForgeState.explorerTabManager}>
        <TabManager></TabManager>
      </TabManagerProvider>
    </div>
  );

  return (
    <div id="app">
      <MenuTop />
      <div id="container">
        <LayoutContainer westContent={westContent}>
          <TabManagerProvider manager={ForgeState.tabManager}>
            <TabManager></TabManager>
          </TabManagerProvider>
        </LayoutContainer>
      </div>
      <LoadingScreen />
      {modalGrantAccess}
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

(window as any).test = () => {
  ForgeState.tabManager.AddTab(new TabQuickStartState());
}
