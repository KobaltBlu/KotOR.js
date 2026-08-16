import React, { useEffect, useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { useApp } from "@/apps/forge/context/AppContext";
import GrantAccessModalContent from "@/apps/common/components/grantAccess/GrantAccessModalContent";

import * as KotOR from "@/apps/forge/KotOR";

export interface ModalGrantAccessProps {
  onUserGrant: Function,
  onUserCancel: Function
  onContinueWithoutGame?: Function
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
    e.preventDefault();
    const bound = await ForgeState.promptAndBindGameDirectory();
    if(bound){
      console.log('Game Directory', 'verified');
      setShowGrantModal(false);
      props.onUserGrant();
      return;
    }
    console.warn('Game Directory', 'not found');
    window.alert('The selected folder does not contain chitin.key. Choose a KotOR or TSL install, or continue without game data.');
  }

  const onBtnContinue = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowGrantModal(false);
    props.onContinueWithoutGame?.();
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
          <GrantAccessModalContent gameKey={KotOR.ApplicationProfile.GameKey} />
          <p className="grant-access-editor-only">
            You can continue without game data to create and edit local files and projects.
            The BIF browser, 2DA dropdowns, and TLK preview need a game folder — use File → Load Game Directory… later.
          </p>
        </div>
        <div className="modal-button-wrapper">
          <button id="btn-grant-access" className="modal-button grant" onClick={onBtnGrant}>Grant Access</button>
          {props.onContinueWithoutGame ? (
            <button id="btn-continue-without-game" className="modal-button skip" onClick={onBtnContinue}>Continue without game data</button>
          ) : null}
          <button id="btn-quit" className="modal-button quit" onClick={onBtnClose}>Quit</button>
        </div>
      </div>
    </div>
  );

}

export default ModalGrantAccess;