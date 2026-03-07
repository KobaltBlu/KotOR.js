import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form } from "react-bootstrap";
import {
  ModalInsertInstanceState,
  InsertInstanceResourceType,
} from "../../states/modal/ModalInsertInstanceState";
import { ModalLoadFromModuleState } from "../../states/modal/ModalLoadFromModuleState";
import { ForgeState } from "../../states/ForgeState";
import { EditorFile } from "../../EditorFile";
import { FileTypeManager } from "../../FileTypeManager";
import * as KotOR from "../../KotOR";

export const ModalInsertInstance = (props: BaseModalProps) => {
  const modal = props.modal as ModalInsertInstanceState;
  const [show, setShow] = useState(modal.visible);
  const [selectedType, setSelectedType] = useState<InsertInstanceResourceType>(modal.selectedType);
  const [mode, setMode] = useState<"create" | "load">(modal.mode);
  const [resref, setResref] = useState(modal.resref);

  const refresh = () => {
    setSelectedType(modal.selectedType);
    setMode(modal.mode);
    setResref(modal.resref);
  };

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    refresh();
  };

  useEffect(() => {
    const onStateChange = () => refresh();
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onStateChange", onStateChange);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onStateChange", onStateChange);
    };
  }, [modal]);

  const handleClose = () => modal.close();

  const handleCreate = () => {
    const resrefName = resref.trim() || `new_${modal.selectedType}`;
    const reskey = KotOR.ResourceTypes[modal.selectedType];
    if (reskey == null) return;
    const editorFile = new EditorFile({
      resref: resrefName,
      reskey,
      ext: modal.selectedType,
    });
    FileTypeManager.onOpenResource(editorFile);
    if (modal.onSelect) modal.onSelect(resrefName, modal.selectedType, null);
    modal.close();
  };

  const handleLoadFromModule = () => {
    modal.close();
    const resType = KotOR.ResourceTypes[modal.selectedType];
    if (resType == null) return;
    const loadModal = new ModalLoadFromModuleState({
      title: "Load blueprint from MOD/ERF/RIM",
      supportedTypes: [resType],
      onSelect: (resrefName: string, ext: string, data: Uint8Array) => {
        const editorFile = new EditorFile({ buffer: data, resref: resrefName, ext, reskey: resType });
        FileTypeManager.onOpenResource(editorFile);
        if (modal.onSelect) modal.onSelect(resrefName, modal.selectedType, data);
      },
    });
    ForgeState.modalManager.addModal(loadModal);
    loadModal.open();
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Blueprint type</Form.Label>
          <Form.Select
            aria-label="Blueprint type"
            value={selectedType}
            onChange={(e) => {
              const v = e.target.value as InsertInstanceResourceType;
              setSelectedType(v);
              modal.setType(v);
            }}
          >
            {ModalInsertInstanceState.INSTANCE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="radio"
            id="insert-create"
            name="insert-mode"
            label="Create new blueprint"
            checked={mode === "create"}
            onChange={() => {
              setMode("create");
              modal.setMode("create");
            }}
          />
          <Form.Check
            type="radio"
            id="insert-load"
            name="insert-mode"
            label="Load from MOD/ERF/RIM"
            checked={mode === "load"}
            onChange={() => {
              setMode("load");
              modal.setMode("load");
            }}
          />
        </Form.Group>
        {mode === "create" && (
          <Form.Group className="mb-2">
            <Form.Label>ResRef (name)</Form.Label>
            <Form.Control
              value={resref}
              onChange={(e) => {
                const v = e.target.value;
                setResref(v);
                modal.setResref(v);
              }}
              placeholder={`e.g. new_${modal.selectedType}`}
            />
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {mode === "create" ? (
          <Button variant="primary" onClick={handleCreate}>
            Create
          </Button>
        ) : (
          <Button variant="primary" onClick={handleLoadFromModule}>
            Load from module…
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
