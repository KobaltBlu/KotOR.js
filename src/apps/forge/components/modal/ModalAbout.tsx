import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Alert, Spinner } from "react-bootstrap";
import { ModalAboutState } from "../../states/modal/ModalAboutState";

export const ModalAbout = (props: BaseModalProps) => {
  const modal = props.modal as ModalAboutState;
  const [show, setShow] = useState(modal.visible);
  const [updateResult, setUpdateResult] = useState(modal.updateCheckResult);
  const [checking, setChecking] = useState(false);

  const onHide = () => setShow(false);
  const onShow = () => setShow(true);

  useEffect(() => {
    const onResult = (r: ModalAboutState["updateCheckResult"]) => {
      setUpdateResult(r ?? null);
      setChecking(r?.checking ?? false);
    };
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onUpdateCheckResult", onResult);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onUpdateCheckResult", onResult);
    };
  }, [modal]);

  const handleClose = () => {
    modal.close();
  };

  const handleOpenRepo = () => {
    if (typeof window !== "undefined" && modal.repoUrl) {
      window.open(modal.repoUrl, "_blank");
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    await modal.checkForUpdates();
    setChecking(false);
  };

  const handleOpenDownload = () => {
    if (typeof window !== "undefined" && modal.downloadLink) {
      window.open(modal.downloadLink, "_blank");
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-2">
          <strong>KotOR Forge</strong> – Module and resource editor for KotOR I &amp; II.
        </p>
        <p className="mb-2 text-muted small">
          Version {modal.version}
        </p>
        {updateResult?.checking && (
          <Alert variant="info" className="py-1 px-2 small">
            Checking for updates…
          </Alert>
        )}
        {updateResult && !updateResult.checking && updateResult.error && (
          <Alert variant="warning" className="py-1 px-2 small">
            Update check failed: {updateResult.error}
          </Alert>
        )}
        {updateResult && !updateResult.checking && updateResult.newer && updateResult.remoteVersion && (
          <Alert variant="success" className="py-1 px-2 small">
            A new version ({updateResult.remoteVersion}) is available.
          </Alert>
        )}
        {updateResult && !updateResult.checking && !updateResult.newer && !updateResult.error && updateResult.remoteVersion && (
          <Alert variant="secondary" className="py-1 px-2 small mb-2">
            You are on the latest version.
          </Alert>
        )}
        <p className="mb-0 small">
          KotOR JS – A remake of the Odyssey Game Engine that powered Knights of the Old Republic I &amp; II.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" size="sm" onClick={handleOpenRepo}>
          GitHub
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={handleCheckUpdates}
          disabled={checking}
        >
          {checking ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="me-2" />
              Checking…
            </>
          ) : (
            "Check for updates"
          )}
        </Button>
        {updateResult?.newer && modal.downloadLink && (
          <Button variant="outline-success" size="sm" onClick={handleOpenDownload}>
            Download update
          </Button>
        )}
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
