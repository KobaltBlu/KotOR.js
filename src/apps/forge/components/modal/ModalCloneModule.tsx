import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form } from "react-bootstrap";
import { ModalCloneModuleState } from "../../states/modal/ModalCloneModuleState";

export const ModalCloneModule = (props: BaseModalProps) => {
  const modal = props.modal as ModalCloneModuleState;
  const [show, setShow] = useState(modal.visible);
  const [identifier, setIdentifier] = useState("");
  const [prefix, setPrefix] = useState("");
  const [name, setName] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [error, setError] = useState("");
  const [copyTextures, setCopyTextures] = useState(true);
  const [copyLightmaps, setCopyLightmaps] = useState(true);
  const [keepDoors, setKeepDoors] = useState(true);
  const [keepPlaceables, setKeepPlaceables] = useState(true);
  const [keepSounds, setKeepSounds] = useState(true);
  const [keepPathing, setKeepPathing] = useState(true);

  const refresh = () => {
    setIdentifier(modal.identifier);
    setPrefix(modal.prefix);
    setName(modal.name);
    setSourcePath(modal.sourceModPath);
    setError(modal.error);
    setCopyTextures(modal.copyTextures);
    setCopyLightmaps(modal.copyLightmaps);
    setKeepDoors(modal.keepDoors);
    setKeepPlaceables(modal.keepPlaceables);
    setKeepSounds(modal.keepSounds);
    setKeepPathing(modal.keepPathing);
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
  const handleBrowse = () => modal.browseSource();
  const handleCreate = async () => {
    if (!modal.sourceModBuffer || !modal.identifier.trim()) {
      modal.error = "Select a source MOD and enter a module filename.";
      modal.processEventListener("onStateChange", [modal]);
      return;
    }
    const { ForgeFileSystem } = await import("../../ForgeFileSystem");
    const KotOR = await import("../../KotOR");
    let outputPath: string | undefined;
    if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
      const dialog = (window as any).dialog;
      if (dialog?.showSaveDialog) {
        const result = await dialog.showSaveDialog({
          title: "Save Cloned Module",
          defaultPath: `${modal.identifier}.mod`,
          filters: [{ name: "Module", extensions: ["mod"] }],
        });
        if (result?.canceled || !result?.filePath) return;
        outputPath = result.filePath;
      }
    }
    if (!outputPath) {
      modal.error = "Please choose a destination file (Save dialog).";
      modal.processEventListener("onStateChange", [modal]);
      return;
    }
    modal.loading = true;
    modal.processEventListener("onStateChange", [modal]);
    const ok = await modal.runClone(outputPath);
    modal.loading = false;
    modal.processEventListener("onStateChange", [modal]);
    if (ok) modal.close();
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Button variant="outline-primary" size="sm" onClick={handleBrowse}>
            Browse source MOD…
          </Button>
          {sourcePath && <span className="ms-2 small text-muted">{sourcePath}</span>}
        </div>
        {error && <div className="text-danger small mb-2">{error}</div>}
        <Form.Group className="mb-2">
          <Form.Label>Module filename (identifier)</Form.Label>
          <Form.Control
            maxLength={16}
            value={identifier}
            onChange={(e) => {
              const v = e.target.value;
              setIdentifier(v);
              modal.setIdentifier(v);
            }}
            placeholder="e.g. mymodule"
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Module prefix (3 chars)</Form.Label>
          <Form.Control
            maxLength={3}
            value={prefix}
            onChange={(e) => {
              const v = e.target.value;
              setPrefix(v);
              modal.setPrefix(v);
            }}
            placeholder="e.g. MYM"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Module name (display)</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              modal.setName(v);
            }}
            placeholder="e.g. My Clone"
          />
        </Form.Group>
        <div className="mb-2">
          <Form.Check
            type="checkbox"
            id="clone-copy-textures"
            label="Copy textures"
            checked={copyTextures}
            onChange={(e) => {
              setCopyTextures(e.target.checked);
              modal.setCopyTextures(e.target.checked);
            }}
          />
          <Form.Check
            type="checkbox"
            id="clone-copy-lightmaps"
            label="Copy lightmaps"
            checked={copyLightmaps}
            onChange={(e) => {
              setCopyLightmaps(e.target.checked);
              modal.setCopyLightmaps(e.target.checked);
            }}
          />
          <Form.Check
            type="checkbox"
            id="clone-keep-doors"
            label="Keep doors"
            checked={keepDoors}
            onChange={(e) => {
              setKeepDoors(e.target.checked);
              modal.setKeepDoors(e.target.checked);
            }}
          />
          <Form.Check
            type="checkbox"
            id="clone-keep-placeables"
            label="Keep placeables"
            checked={keepPlaceables}
            onChange={(e) => {
              setKeepPlaceables(e.target.checked);
              modal.setKeepPlaceables(e.target.checked);
            }}
          />
          <Form.Check
            type="checkbox"
            id="clone-keep-sounds"
            label="Keep sounds"
            checked={keepSounds}
            onChange={(e) => {
              setKeepSounds(e.target.checked);
              modal.setKeepSounds(e.target.checked);
            }}
          />
          <Form.Check
            type="checkbox"
            id="clone-keep-pathing"
            label="Keep pathing"
            checked={keepPathing}
            onChange={(e) => {
              setKeepPathing(e.target.checked);
              modal.setKeepPathing(e.target.checked);
            }}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!modal.sourceModBuffer || !modal.identifier.trim() || modal.loading}
        >
          {modal.loading ? "Cloning…" : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
