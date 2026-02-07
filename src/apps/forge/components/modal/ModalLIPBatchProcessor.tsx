import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form, ListGroup } from "react-bootstrap";
import { ModalLIPBatchProcessorState, AudioFileEntry } from "../../states/modal/ModalLIPBatchProcessorState";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import { processAudioToLIP } from "../../helpers/LIPBatchProcessor";
import * as KotOR from "../../KotOR";
import * as fs from "fs";

export const ModalLIPBatchProcessor = (props: BaseModalProps) => {
  const modal = props.modal as ModalLIPBatchProcessorState;
  const [show, setShow] = useState(modal.visible);
  const [audioFiles, setAudioFiles] = useState<AudioFileEntry[]>([]);
  const [outputPath, setOutputPath] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ processed: number; errors: number } | null>(null);

  const refresh = () => {
    setAudioFiles([...modal.audioFiles]);
    setOutputPath(modal.outputDirPath);
    setError(modal.error);
    setLoading(modal.loading);
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

  const handleAddAudio = async () => {
    const response = await ForgeFileSystem.OpenFile({
      multiple: true,
      ext: [".wav", ".mp3"],
    });
    const entries: AudioFileEntry[] = [];
    if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
      if (response.paths && response.paths.length > 0) {
        for (const p of response.paths) {
          const name = p.split(/[/\\]/).pop() || "unknown";
          const buf = await fs.promises.readFile(p);
          entries.push({ name, path: p, buffer: buf.buffer as ArrayBuffer });
        }
      }
    } else {
      if (response.handles && response.handles.length > 0) {
        for (const h of response.handles as FileSystemFileHandle[]) {
          const file = await h.getFile();
          entries.push({
            name: file.name,
            handle: h,
            buffer: await file.arrayBuffer(),
          });
        }
      }
    }
    if (entries.length) modal.addAudioFiles(entries);
  };

  const handleRemoveAudio = (index: number) => modal.removeAudioFile(index);
  const handleClearAudio = () => modal.clearAudioFiles();

  const handleBrowseOutput = async () => {
    const response = await ForgeFileSystem.OpenDirectory({});
    if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
      if (response.paths && response.paths.length > 0) {
        modal.setOutputDir(response.paths[0]);
      }
    } else {
      if (response.handles && response.handles.length > 0) {
        const h = response.handles[0] as FileSystemDirectoryHandle;
        modal.setOutputDir(h.name, h);
      }
    }
  };

  const handleProcess = async () => {
    if (modal.audioFiles.length === 0) {
      modal.setError("No audio files selected.");
      return;
    }
    if (!modal.outputDirPath && !modal.outputDirHandle) {
      modal.setError("No output directory selected.");
      return;
    }
    modal.setError("");
    modal.setLoading(true);
    let processed = 0;
    let errors = 0;

    for (const entry of modal.audioFiles) {
      let buf = entry.buffer;
      if (!buf && entry.path && KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON) {
        try {
          const b = await fs.promises.readFile(entry.path);
          buf = b.buffer as ArrayBuffer;
        } catch (e) {
          errors++;
          continue;
        }
      }
      if (!buf && entry.handle) {
        try {
          const file = await entry.handle.getFile();
          buf = await file.arrayBuffer();
        } catch (e) {
          errors++;
          continue;
        }
      }
      if (!buf) {
        errors++;
        continue;
      }
      const result = await processAudioToLIP(buf);
      if (!result.success || !result.lipBuffer) {
        errors++;
        continue;
      }
      const stem = entry.name.replace(/\.[^/.]+$/, "");
      const lipName = `${stem}.lip`;

      if (KotOR.ApplicationProfile.ENV === (KotOR as any).ApplicationEnvironment.ELECTRON && modal.outputDirPath) {
        const sep = process?.platform === "win32" ? "\\" : "/";
        const outPath = `${modal.outputDirPath}${sep}${lipName}`;
        try {
          await fs.promises.writeFile(outPath, Buffer.from(result.lipBuffer));
          processed++;
        } catch (e) {
          errors++;
        }
      } else if (modal.outputDirHandle) {
        try {
          const ws = await (modal.outputDirHandle as FileSystemDirectoryHandle).getFileHandle(lipName, { create: true });
          const writable = await (ws as any).createWritable?.();
          if (writable) {
            await writable.write(result.lipBuffer);
            await writable.close();
            processed++;
          } else {
            errors++;
          }
        } catch (e) {
          errors++;
        }
      }
    }

    modal.setLoading(false);
    modal.setLastResult(processed, errors);
    setLastResult({ processed, errors });
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Audio Files (WAV)</Form.Label>
            <div className="d-flex gap-2 mb-2">
              <Button variant="primary" size="sm" onClick={handleAddAudio}>
                Add Files…
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleClearAudio} disabled={audioFiles.length === 0}>
                Clear
              </Button>
            </div>
            <ListGroup style={{ maxHeight: 180, overflowY: "auto" }}>
              {audioFiles.map((f, i) => (
                <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center py-1">
                  <small>{f.name}</small>
                  <Button variant="outline-danger" size="sm" onClick={() => handleRemoveAudio(i)}>
                    Remove
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Output Directory</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control type="text" readOnly value={outputPath || "(not selected)"} />
              <Button variant="outline-secondary" onClick={handleBrowseOutput}>
                Browse…
              </Button>
            </div>
          </Form.Group>
          {error && (
            <Form.Text className="text-danger d-block mb-2">{error}</Form.Text>
          )}
          {lastResult && (
            <Form.Text className="text-muted d-block mb-2">
              Last run: {lastResult.processed} processed, {lastResult.errors} errors
            </Form.Text>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={handleProcess}
          disabled={loading || audioFiles.length === 0 || (!outputPath && !modal.outputDirHandle)}
        >
          {loading ? "Processing…" : "Process"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
