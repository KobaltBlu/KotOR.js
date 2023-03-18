import React, { useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Button, Modal } from "react-bootstrap";
import { useEffectOnce } from "../../helpers/UseEffectOnce";

export const ModalNewProject = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);

  const onHide = () => {
    setShow(false);
  };

  const onShow = () => {
    setShow(true);
  };

  useEffectOnce( () => {
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
    }
  });

  const handleHide = () => {
    modal.close();
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    modal.close();
  };

  return (
    <Modal 
      show={show} 
      onHide={handleHide} 
      backdrop="static" 
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>Hello World</p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};