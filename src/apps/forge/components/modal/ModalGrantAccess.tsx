import React, { useEffect, useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { useApp } from "@/apps/forge/context/AppContext";
import GrantAccessInfo from "@/apps/common/components/grantAccess/GrantAccessInfo";

import * as KotOR from "@/apps/forge/KotOR";

export interface ModalGrantAccessProps {
  onUserGrant: Function,
  onUserCancel: Function
}

export const ModalGrantAccess = function(props: ModalGrantAccessProps){

  const appContext = useApp();
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;

  useEffect(() => {
  }, []);

  

  useEffectOnce( () => {
    return () => {
      //Deconstructor
    }
  });

  const onBtnGrant = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const handle = await KotOR.GameFileSystem.showRequestDirectoryDialog();
    if(handle){
      KotOR.ApplicationProfile.directoryHandle = handle;
      KotOR.ConfigClient.set(`Profiles.${KotOR.ApplicationProfile.profile.key}.directory_handle`, handle);
      

      ForgeState.VerifyGameDirectory(() => {
        console.log('Game Directory', 'verified');
        setShowGrantModal(false);
        props.onUserGrant();
      }, () => {
        console.warn('Game Directory', 'not found');
        // setShowGrantModal(true);
      });
    }
  }

  const onBtnClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowGrantModal(false);
    props.onUserCancel();
  }

  return (
    <div id="modal-grant-access" className={`modal-grant-access-wrapper ${(showGrantModal ? 'show': '' )}`}>
      <div className="modal-grant-access">
        <div className="modal-content-wrapper">
          <h1>Grant Access</h1>
          <GrantAccessInfo />
        </div>
        <div className="modal-button-wrapper">
          <button id="btn-grant-access" className="modal-button grant" onClick={onBtnGrant}>Grant Access</button>
          <button id="btn-quit" className="modal-button quit" onClick={onBtnClose}>Quit</button>
        </div>
      </div>
    </div>
  );

}

export default ModalGrantAccess;