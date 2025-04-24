import React from "react";
import { useApp } from "./context/AppContext";
import { ModalEULA } from "./components/modal-eula/modalEULA";
import { ModalGrantAccess } from "./components/modal-grant-access/modalGrantAccess";

export const GameApp = () => {
  const appContext = useApp();
  const [showEULAModal] = appContext.showEULAModal;
  const [showGrantModal] = appContext.showGrantModal;
  return (
    <>
      {showEULAModal && (
        <ModalEULA />
      )}
      {showGrantModal && (
        <ModalGrantAccess />
      )}
    </>
  )
}
