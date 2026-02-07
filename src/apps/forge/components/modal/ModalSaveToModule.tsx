import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form } from "react-bootstrap";
import { ModalSaveToModuleState } from "../../states/modal/ModalSaveToModuleState";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import { SaveDestination } from "../../enum/SaveDestination";
import { saveResourceToOverride } from "../../helpers/SaveToOverride";
import { saveResourceToRim } from "../../helpers/SaveToRim";
import * as KotOR from "../../KotOR";

export const ModalSaveToModule = (props: BaseModalProps) => {
  const modal = props.modal as ModalSaveToModuleState;
  const [show, setShow] = useState(modal.visible);
  const [modPath, setModPath] = useState("");
  const [overridePath, setOverridePath] = useState(modal.overridePath);
  const [rimPath, setRimPath] = useState(modal.rimPath);
  const [resref, setResref] = useState("");
  const [destination, setDestination] = useState(modal.destination);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setModPath(modal.modPath);
    setOverridePath(modal.overridePath);
    setRimPath(modal.rimPath);
    setResref(modal.resref);
    setDestination(modal.destination);
    setError(modal.error);
  };

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    setResref(modal.resref);
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

  const handleBrowse = async () => {
    const response = await ForgeFileSystem.OpenFile({ ext: [".mod"] });
    if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
      if (response.paths && response.paths.length > 0) {
        modal.setModPath(response.paths[0]);
        setModPath(response.paths[0]);
        const buf = await ForgeFileSystem.ReadFileBufferFromResponse(response);
        modal.setModBuffer(buf);
      }
    } else {
      if (response.handles && response.handles.length > 0) {
        const name = (response.handles[0] as FileSystemFileHandle).name;
        modal.setModPath(name);
        setModPath(name);
        const buf = await ForgeFileSystem.ReadFileBufferFromResponse(response);
        modal.setModBuffer(buf);
      }
    }
    modal.setError("");
    setError("");
  };

  const handleBrowseOverride = async () => {
    if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
      const dialog = (window as any).dialog;
      if (!dialog?.showOpenDialog) return;
      const result = await dialog.showOpenDialog({
        title: "Choose Override folder",
        properties: ["openDirectory", "createDirectory"],
      });
      if (result?.canceled || !result?.filePaths?.length) return;
      modal.setOverridePath(result.filePaths[0]);
      modal.setOverrideDirHandle(undefined);
      setOverridePath(result.filePaths[0]);
    } else if (typeof window?.showDirectoryPicker === "function") {
      try {
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        modal.setOverridePath(handle.name);
        modal.setOverrideDirHandle(handle);
        setOverridePath(handle.name);
      } catch {
        return;
      }
    }
    modal.setError("");
    setError("");
  };

  const handleBrowseRim = async () => {
    if (KotOR.ApplicationProfile.ENV !== (KotOR as any).ApplicationEnvironment.ELECTRON) {
      modal.setError("Save to RIM requires Electron.");
      return;
    }
    const dialog = (window as any).dialog;
    if (!dialog?.showSaveDialog) return;
    const result = await dialog.showSaveDialog({
      title: "Save as RIM",
      defaultPath: `${modal.resref || "resource"}.rim`,
      filters: [{ name: "RIM", extensions: ["rim"] }],
    });
    if (result?.canceled || !result?.filePath) return;
    modal.setRimPath(result.filePath);
    setRimPath(result.filePath);
    modal.setError("");
    setError("");
  };

  const handleSave = async () => {
    const targetResref = resref.trim() || modal.resref;
    if (!targetResref) {
      modal.setError("ResRef is required.");
      return;
    }
    if (modal.destination === SaveDestination.RIM) {
      const outPath = rimPath.trim() || modal.rimPath;
      if (!outPath) {
        modal.setError("Choose a RIM output file (Browse).");
        return;
      }
      setSaving(true);
      modal.setError("");
      try {
        const writtenPath = await saveResourceToRim({
          resref: targetResref,
          resType: modal.resType,
          data: modal.data,
          outputPath: outPath,
        });
        if (modal.onSaved) modal.onSaved(writtenPath);
        modal.close();
      } catch (e: unknown) {
        modal.setError(e instanceof Error ? e.message : "Save to RIM failed.");
        setError(modal.error);
      }
      setSaving(false);
      return;
    }
    if (modal.destination === SaveDestination.Override) {
      setSaving(true);
      modal.setError("");
      const dirHandle = modal.overrideDirHandle;
      let outputDir = overridePath.trim() || modal.overridePath;
      if (!outputDir && !dirHandle && KotOR.ApplicationProfile.directory) {
        const pathMod = typeof require !== "undefined" && require("path") ? require("path") : null;
        outputDir = pathMod ? pathMod.join(KotOR.ApplicationProfile.directory, "Override") : `${KotOR.ApplicationProfile.directory}/Override`;
        modal.setOverridePath(outputDir);
        setOverridePath(outputDir);
      }
      if (!outputDir && !dirHandle) {
        modal.setError("Choose the game Override folder (Browse) or set the game directory first (File → Change Game).");
        setSaving(false);
        return;
      }
      try {
        const writtenPath = await saveResourceToOverride({
          resref: targetResref,
          resType: modal.resType,
          data: modal.data,
          outputDir: outputDir || undefined,
          outputDirHandle: dirHandle,
        });
        if (modal.onSaved) modal.onSaved(writtenPath);
        modal.close();
      } catch (e: unknown) {
        modal.setError(e instanceof Error ? e.message : "Save to Override failed.");
        setError(modal.error);
      }
      setSaving(false);
      return;
    }
    if (!modal.modBuffer || modal.modBuffer.length < 4) {
      modal.setError("Select a MOD file first.");
      return;
    }
    const sig = String.fromCharCode(modal.modBuffer[0], modal.modBuffer[1], modal.modBuffer[2], modal.modBuffer[3]);
    if (sig !== "MOD " && sig !== "ERF ") {
      modal.setError("Selected file is not a valid MOD/ERF.");
      return;
    }
    setSaving(true);
    modal.setError("");
    try {
      const erf = new KotOR.ERFObject(modal.modBuffer);
      await erf.load();
      erf.addResource(targetResref, modal.resType, modal.data);
      const outBuffer = erf.getExportBuffer();
      const fs = (typeof require !== "undefined" && require("fs")) || (typeof window !== "undefined" && (window as any).require?.("fs"));
      if (fs?.promises?.writeFile && KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
        const path = modal.modPath;
        if (path) {
          await fs.promises.writeFile(path, Buffer.from(outBuffer));
          if (modal.onSaved) modal.onSaved(path);
          modal.close();
        } else {
          modal.setError("Could not determine MOD file path (use Electron for Save to MOD).");
        }
      } else {
        modal.setError("Saving to MOD is only supported in Electron with an existing MOD path.");
      }
    } catch (e: unknown) {
      modal.setError(e instanceof Error ? e.message : "Save failed.");
      setError(modal.error);
    }
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted mb-2">
          Save the current resource to MOD, Override, or RIM (Holocron-style). MOD requires picking an existing file.
        </p>
        <Form.Group className="mb-2">
          <Form.Label>Destination</Form.Label>
          <Form.Select
            aria-label="Save destination (MOD, Override, or RIM)"
            title="Save destination (MOD, Override, or RIM)"
            value={destination}
            onChange={(e) => {
              const d = Number(e.target.value) as SaveDestination;
              setDestination(d);
              modal.setDestination(d);
            }}
          >
            <option value={SaveDestination.MOD}>MOD (ERF)</option>
            <option value={SaveDestination.Override}>Override folder</option>
            <option value={SaveDestination.RIM}>RIM file</option>
          </Form.Select>
        </Form.Group>
        {destination === SaveDestination.MOD && (
          <>
            <Button variant="outline-primary" size="sm" className="mb-2" onClick={handleBrowse}>
              Browse MOD file…
            </Button>
            {modPath && <div className="small text-muted mb-2">{modPath}</div>}
          </>
        )}
        {destination === SaveDestination.Override && (
          <>
            <Button variant="outline-primary" size="sm" className="mb-2" onClick={handleBrowseOverride}>
              Browse Override folder…
            </Button>
            {(overridePath || modal.overrideDirHandle?.name) && (
              <div className="small text-muted mb-2">{overridePath || modal.overrideDirHandle?.name}</div>
            )}
          </>
        )}
        {destination === SaveDestination.RIM && (
          <>
            <Button variant="outline-primary" size="sm" className="mb-2" onClick={handleBrowseRim}>
              Browse RIM output file…
            </Button>
            {rimPath && <div className="small text-muted mb-2">{rimPath}</div>}
          </>
        )}
        <Form.Group className="mb-2">
          <Form.Label>ResRef</Form.Label>
          <Form.Control
            value={resref}
            onChange={(e) => setResref(e.target.value)}
            placeholder={modal.resref}
          />
        </Form.Group>
        {error && <div className="text-danger small mb-2">{error}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={
            saving ||
            (destination === SaveDestination.MOD && !modal.modBuffer) ||
            (destination === SaveDestination.Override && !(overridePath || modal.overridePath) && !(typeof KotOR !== "undefined" && KotOR.ApplicationProfile?.directory)) ||
            (destination === SaveDestination.RIM && !(rimPath || modal.rimPath))
          }
        >
          {saving ? "Saving…" : destination === SaveDestination.MOD ? "Save to MOD" : destination === SaveDestination.Override ? "Save to Override" : "Save to RIM"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
