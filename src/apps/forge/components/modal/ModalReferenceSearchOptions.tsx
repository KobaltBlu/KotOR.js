import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form, FormCheck, FormControl } from "react-bootstrap";
import { ModalReferenceSearchOptionsState } from "../../states/modal/ModalReferenceSearchOptionsState";

export const ModalReferenceSearchOptions = (props: BaseModalProps) => {
  const modal = props.modal as ModalReferenceSearchOptionsState;
  const [show, setShow] = useState(modal.visible);
  const [partialMatch, setPartialMatch] = useState(modal.getPartialMatch());
  const [caseSensitive, setCaseSensitive] = useState(modal.getCaseSensitive());
  const [filePattern, setFilePattern] = useState(modal.getFilePattern() || "");
  const [selectedTypes, setSelectedTypes] = useState(new Set(modal.getFileTypes() ?? []));

  const onHide = () => setShow(false);
  const onShow = () => setShow(true);

  useEffect(() => {
    const onOptionsChanged = () => {
      setPartialMatch(modal.getPartialMatch());
      setCaseSensitive(modal.getCaseSensitive());
      setFilePattern(modal.getFilePattern() || "");
      setSelectedTypes(new Set(modal.getFileTypes() ?? []));
    };

    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onOptionsChanged", onOptionsChanged);

    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onOptionsChanged", onOptionsChanged);
    };
  }, [modal]);

  const handleClose = () => {
    modal.close();
  };

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
    modal.toggleFileType(type);
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
            id="reference-partial-match"
            label="Partial Match"
            checked={partialMatch}
            onChange={(e) => {
              setPartialMatch(e.target.checked);
              modal.setPartialMatch(e.target.checked);
            }}
          />
          <FormCheck
            type="checkbox"
            id="reference-case-sensitive"
            label="Case Sensitive"
            checked={caseSensitive}
            onChange={(e) => {
              setCaseSensitive(e.target.checked);
              modal.setCaseSensitive(e.target.checked);
            }}
          />
          <Form.Group className="mt-3">
            <Form.Label>File Pattern</Form.Label>
            <FormControl
              type="text"
              placeholder="e.g. *.mod"
              value={filePattern}
              onChange={(e) => {
                setFilePattern(e.target.value);
                modal.setFilePattern(e.target.value);
              }}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label>File Types</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {modal.fileTypeOptions.map((type) => (
                <FormCheck
                  key={type}
                  type="checkbox"
                  id={`reference-filetype-${type}`}
                  label={type}
                  checked={selectedTypes.has(type)}
                  onChange={() => toggleType(type)}
                />
              ))}
            </div>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => modal.apply()}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
