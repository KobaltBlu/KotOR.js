import React, { useEffect, useState } from "react";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ForgeState } from "../../states/ForgeState";
import { useApp } from "../../context/AppContext";

import * as KotOR from "../../KotOR";

export type GrantAccessError = 'cancelled' | 'wrong-directory' | 'permission-denied' | null;

export interface ModalGrantAccessProps {
  onUserGrant: Function,
  onUserCancel: Function
}

export const ModalGrantAccess = function(props: ModalGrantAccessProps){

  const appContext = useApp();
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;
  const [grantError, setGrantError] = useState<GrantAccessError>(null);

  useEffect(() => {
  }, []);



  useEffectOnce( () => {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
      setShowGrantModal(true);
    }

    return () => {
      //Deconstructor
    }
  });

  const onBtnGrant = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setGrantError(null);
    let handle = await KotOR.GameFileSystem.showRequestDirectoryDialog();
    if(handle){
      KotOR.ApplicationProfile.directoryHandle = handle;
      KotOR.ConfigClient.set(`Profiles.${KotOR.ApplicationProfile.profile.key}.directory_handle`, handle);

      ForgeState.VerifyGameDirectory(() => {
        setShowGrantModal(false);
        props.onUserGrant();
      }, () => {
        setGrantError('wrong-directory');
      });
    }else{
      setGrantError('cancelled');
    }
  }

  const onBtnClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowGrantModal(false);
    props.onUserCancel();
  }

  const errorMessages: Record<NonNullable<GrantAccessError>, string> = {
    'cancelled': 'No directory selected. Please select your game install folder.',
    'wrong-directory': 'The selected folder does not appear to contain valid game files. Please select the correct game install directory.',
    'permission-denied': 'Permission was denied. Please grant read/write access to the game directory.',
  };

  return (
    <div id="modal-grant-access" className={`modal-grant-access-wrapper ${(showGrantModal ? 'show': '' )}`}>
      <div className="modal-grant-access">
        <div className="modal-content-wrapper">
          <h1>Grant Access</h1>
          <p>Please grant this application access to your game install directory to continue.</p>
          {grantError && (
            <p className="grant-error" role="alert" style={{color: 'var(--color-danger, #dc3545)', fontSize: '0.9em', marginTop: '0.5em'}}>
              {errorMessages[grantError]}
            </p>
          )}
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