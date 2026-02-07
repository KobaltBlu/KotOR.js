import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form, FormCheck } from "react-bootstrap";
import { ModalExtractOptionsState } from "../../states/modal/ModalExtractOptionsState";

/**
 * Dialog for configuring extraction options (ported from Holocron ExtractOptionsDialog).
 * Options: TPC decompile, TPC TXI extract, MDL decompile, MDL texture extract.
 */
export const ModalExtractOptions = (props: BaseModalProps) => {
  const modal = props.modal as ModalExtractOptionsState;
  const [show, setShow] = useState(modal.visible);
  const [tpcDecompile, setTpcDecompile] = useState(modal.getTpcDecompile());
  const [tpcExtractTxi, setTpcExtractTxi] = useState(modal.getTpcExtractTxi());
  const [mdlDecompile, setMdlDecompile] = useState(modal.getMdlDecompile());
  const [mdlExtractTextures, setMdlExtractTextures] = useState(modal.getMdlExtractTextures());

  const onHide = () => setShow(false);
  const onShow = () => setShow(true);

  useEffect(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, [modal]);

  const handleClose = () => {
    modal.close();
  };

  const handleApply = () => {
    modal.apply();
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <FormCheck
            type="checkbox"
            id="extract-tpc-decompile"
            label="TPC: Decompile textures when extracting"
            checked={tpcDecompile}
            onChange={(e) => {
              setTpcDecompile(e.target.checked);
              modal.setTpcDecompile(e.target.checked);
            }}
          />
          <FormCheck
            type="checkbox"
            id="extract-tpc-txi"
            label="TPC: Extract TXI metadata"
            checked={tpcExtractTxi}
            onChange={(e) => {
              setTpcExtractTxi(e.target.checked);
              modal.setTpcExtractTxi(e.target.checked);
            }}
          />
          <FormCheck
            type="checkbox"
            id="extract-mdl-decompile"
            label="MDL: Decompile models when extracting"
            checked={mdlDecompile}
            onChange={(e) => {
              setMdlDecompile(e.target.checked);
              modal.setMdlDecompile(e.target.checked);
            }}
          />
          <FormCheck
            type="checkbox"
            id="extract-mdl-textures"
            label="MDL: Extract embedded textures"
            checked={mdlExtractTextures}
            onChange={(e) => {
              setMdlExtractTextures(e.target.checked);
              modal.setMdlExtractTextures(e.target.checked);
            }}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleApply}>
          Apply
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
