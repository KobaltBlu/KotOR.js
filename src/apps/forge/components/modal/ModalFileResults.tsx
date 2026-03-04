import React, { useEffect, useState } from "react";
import { Modal, Button, ListGroup } from "react-bootstrap";

import { ReferenceSearchResult } from "@/apps/forge/helpers/ReferenceFinder";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ModalFileResultsState } from "@/apps/forge/states/modal/ModalFileResultsState";

export const ModalFileResults = (props: BaseModalProps) => {
  const modal = props.modal as ModalFileResultsState;
  const [show, setShow] = useState(modal.visible);
  const [results, setResults] = useState<ReferenceSearchResult[]>(modal.results);

  const onHide = () => setShow(false);
  const onShow = () => setShow(true);

  useEffect(() => {
    const onResultsChanged = (nextResults: ReferenceSearchResult[]) => {
      setResults([...nextResults]);
    };

    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onResultsChanged", onResultsChanged);

    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onResultsChanged", onResultsChanged);
    };
  }, [modal]);

  const handleClose = () => {
    modal.close();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {results.length === 0 ? (
          <div className="text-muted">No results found.</div>
        ) : (
          <ListGroup>
            {results.map((result, index) => (
              <ListGroup.Item
                key={`${result.fileResource.resRef}-${result.fieldPath}-${index}`}
                action
                onClick={() => { void modal.openResult(result); }}
                title={modal.getTooltip(result)}
              >
                {modal.getDisplayText(result)}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
