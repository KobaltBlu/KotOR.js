import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { ModalUpdateCheckState } from "../../states/modal/ModalUpdateCheckState";
import { getRemoteToolsetUpdateInfo, isRemoteVersionNewer } from "../../config/ConfigUpdate";
import { CURRENT_VERSION } from "../../config";
import "./ModalUpdateCheck.scss";

export const ModalUpdateCheck = (props: BaseModalProps) => {
  const modal = props.modal as ModalUpdateCheckState;
  const [show, setShow] = useState(modal.visible);
  const [checking, setChecking] = useState(modal.checking);
  const [error, setError] = useState(modal.error);
  const [remoteVersion, setRemoteVersion] = useState(modal.remoteVersion);
  const [hasUpdate, setHasUpdate] = useState(modal.hasUpdate);
  const [downloadLink, setDownloadLink] = useState(modal.downloadLink);
  const [releaseNotes, setReleaseNotes] = useState(modal.releaseNotes);

  useEffect(() => {
    const showHandler = () => {
      setShow(true);
      performUpdateCheck();
    };
    const hideHandler = () => setShow(false);
    const checkingHandler = () => setChecking(modal.checking);
    const resultHandler = () => {
      setError(modal.error);
      setRemoteVersion(modal.remoteVersion);
      setHasUpdate(modal.hasUpdate);
      setDownloadLink(modal.downloadLink);
      setReleaseNotes(modal.releaseNotes);
    };

    modal.addEventListener('onShow', showHandler);
    modal.addEventListener('onHide', hideHandler);
    modal.addEventListener('onCheckingChange', checkingHandler);
    modal.addEventListener('onResultChange', resultHandler);

    return () => {
      modal.removeEventListener('onShow', showHandler);
      modal.removeEventListener('onHide', hideHandler);
      modal.removeEventListener('onCheckingChange', checkingHandler);
      modal.removeEventListener('onResultChange', resultHandler);
    };
  }, [modal]);

  const performUpdateCheck = async () => {
    modal.setChecking(true);
    modal.setResult({ error: '', remoteVersion: '', hasUpdate: false });

    try {
      const result = await getRemoteToolsetUpdateInfo({ silent: true });

      if(result instanceof Error){
        modal.setResult({ error: `Failed to check for updates: ${result.message}` });
      } else {
        const remote = result.toolsetLatestVersion || result.currentVersion || '';
        const newer = isRemoteVersionNewer(CURRENT_VERSION, remote);

        modal.setResult({
          remoteVersion: remote,
          hasUpdate: newer === true,
          downloadLink: result.toolsetDownloadLink || '',
          releaseNotes: result.toolsetLatestNotes || ''
        });
      }
    } catch(e: unknown) {
      modal.setResult({ error: `Failed to check for updates: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      modal.setChecking(false);
    }
  };

  const handleClose = () => {
    modal.hide();
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      className="modal-update-check"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {checking ? (
          <div className="update-checking">
            <div className="spinner"></div>
            <p>Checking for updates...</p>
          </div>
        ) : error ? (
          <div className="update-error">
            <h5>❌ Error</h5>
            <p>{error}</p>
          </div>
        ) : hasUpdate ? (
          <div className="update-available">
            <h5>✨ Update Available</h5>
            <div className="version-info">
              <div className="version-row">
                <span className="label">Current Version:</span>
                <span className="value">{CURRENT_VERSION}</span>
              </div>
              <div className="version-row">
                <span className="label">Latest Version:</span>
                <span className="value highlight">{remoteVersion}</span>
              </div>
            </div>
            {releaseNotes && (
              <div className="release-notes">
                <h6>Release Notes</h6>
                <p>{releaseNotes}</p>
              </div>
            )}
            {downloadLink && (
              <a
                href={downloadLink}
                target="_blank"
                rel="noopener noreferrer"
                className="download-link"
              >
                Download Update
              </a>
            )}
          </div>
        ) : (
          <div className="update-current">
            <h5>✅ You're up to date!</h5>
            <div className="version-info">
              <div className="version-row">
                <span className="label">Current Version:</span>
                <span className="value">{CURRENT_VERSION}</span>
              </div>
              {remoteVersion && (
                <div className="version-row">
                  <span className="label">Latest Version:</span>
                  <span className="value">{remoteVersion}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button onClick={handleClose} className="btn-close">
          Close
        </button>
        {!checking && (
          <button onClick={performUpdateCheck} className="btn-recheck">
            Check Again
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
