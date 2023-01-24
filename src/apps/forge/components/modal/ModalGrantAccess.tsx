import React, { useEffect, useState } from "react";
import { ApplicationProfile } from "../../../../utility/ApplicationProfile";
import { ApplicationEnvironment } from "../../../../enums/ApplicationEnvironment";

declare const KotOR: any;

export interface ModalGrantAccessProps {
  onUserGrant: Function,
  onUserCancel: Function
}

export const ModalGrantAccess = function(props: ModalGrantAccessProps){

  const [show, setShow] = useState(false);

  useEffect(() => {
    if(ApplicationProfile.ENV == ApplicationEnvironment.BROWSER){
      // KotOR.GameFileSystem.
      setShow(true);
    }
    return () => {

    };
  }, []);

  const onBtnGrant = async (e: React.MouseEvent<HTMLButtonElement>) => {
    let handle = await KotOR.GameFileSystem.showRequestDirectoryDialog();
    if(handle){
      KotOR.GameFileSystem.rootDirectoryHandle = handle;
      KotOR.ConfigClient.set(`Profiles.${ApplicationProfile.profile.key}.directory_handle`, handle);
      // modal?.classList.remove('show');
      setShow(false);
      props.onUserGrant();
    }
  }

  const onBtnClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShow(false);
    props.onUserCancel();
  }

  return (
    <div id="modal-grant-access" className={`modal-grant-access-wrapper ${(show ? 'show': '' )}`}>
      <div className="modal-grant-access">
        <div className="modal-content-wrapper">
          <h1>Grant Access</h1>
          <p>Please grant this application access to your game install directory to continue.</p>
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