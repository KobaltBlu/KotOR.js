import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { Button, Modal } from "react-bootstrap";
import { ModalExtractionResultsState } from "@/apps/forge/states/modal/ModalExtractionResultsState";

export const ModalExtractionResults = (props: BaseModalProps) => {
  const modal = props.modal as ModalExtractionResultsState;
  const [show, setShow] = useState(modal.visible);
  const results = modal.results;

  useEffect(() => {
    const onHide = () => setShow(false);
    const onShow = () => setShow(true);
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
    };
  }, []);

  const handleClose = () => {
    modal.close();
  };

  const exported = results.exportedFiles.length;
  const skipped = results.skippedFiles.length;
  const failed = results.failedFiles.length;

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Extraction Results</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Model:</strong> {results.modelName}</p>
        <p>
          <strong>Models:</strong> {results.modelCount} ({results.modelCount * 2} files)
          &nbsp;&bull;&nbsp;
          <strong>Textures:</strong> {results.textureCount}
          &nbsp;&bull;&nbsp;
          <strong>Exported:</strong> {exported} files
          {skipped > 0 && (
            <>&nbsp;&bull;&nbsp;<strong style={{color: '#f0ad4e'}}>Skipped:</strong> {skipped}</>
          )}
          {failed > 0 && (
            <>&nbsp;&bull;&nbsp;<strong style={{color: '#d9534f'}}>Failed:</strong> {failed}</>
          )}
        </p>

        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #444', borderRadius: '4px', padding: '8px', backgroundColor: '#1a1a1a', fontSize: '12px', fontFamily: 'monospace' }}>
          {results.exportedFiles.map((file, i) => (
            <div key={`ok-${i}`} style={{ color: '#5cb85c' }}>{file}</div>
          ))}
          {results.skippedFiles.map((file, i) => (
            <div key={`skip-${i}`} style={{ color: '#f0ad4e' }}>SKIPPED: {file}</div>
          ))}
          {results.failedFiles.map((file, i) => (
            <div key={`fail-${i}`} style={{ color: '#d9534f' }}>MISSING: {file}</div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};
