import React, { useState } from "react";
import { ModalManagerState } from "../../states/modal/ModalManagerState";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ModalState } from "../../states/modal/ModalState";

export const ModalManager = function(props: any){
  const manager: ModalManagerState = props.manager;

  const [modals, setModals] = useState<ModalState[]>([]);

  const onModalAdded = () => {
    console.log('onModalAdded', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalRemoved = () => {
    console.log('onModalRemoved', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalShow = () => {
    console.log('onModalShow', manager.modals);
    setModals([...manager.modals]);
  };

  const onModalHide = () => {
    console.log('onModalHide', manager.modals);
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
