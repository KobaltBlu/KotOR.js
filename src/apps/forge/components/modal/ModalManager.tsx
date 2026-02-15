import React, { useState } from "react";

import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalManagerState } from "@/apps/forge/states/modal/ModalManagerState";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface ModalManagerProps {
  manager: ModalManagerState;
}

export const ModalManager = function(props: ModalManagerProps){
  const manager: ModalManagerState = props.manager;

  const [modals, setModals] = useState<ModalState[]>([]);

  const onModalAdded = () => {
    log.debug('onModalAdded', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalRemoved = () => {
    log.debug('onModalRemoved', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalShow = () => {
    log.debug('onModalShow', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalHide = () => {
    log.debug('onModalHide', manager.modals);
    setModals([...manager.modals]);
  };

  useEffectOnce( () => { //constructor
    manager.addEventListener('onModalAdded', onModalAdded);
    manager.addEventListener('onModalRemoved', onModalRemoved);
    manager.addEventListener('onModalShow', onModalShow);
    manager.addEventListener('onModalHide', onModalHide);
    return () => { //destructor
      manager.removeEventListener('onModalAdded', onModalAdded);
      manager.removeEventListener('onModalRemoved', onModalRemoved);
      manager.removeEventListener('onModalShow', onModalShow);
      manager.removeEventListener('onModalHide', onModalHide);
    }
  });

  return (
    <>
      {
        modals.map( (modal: ModalState) => {
          return modal.getView();
        })
      }
    </>
  )
};
