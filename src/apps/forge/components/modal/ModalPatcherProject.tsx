import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { ModalPatcherProjectState, PatcherFile } from "../../states/modal/ModalPatcherProjectState";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import * as KotOR from "../../KotOR";
import "./ModalPatcherProject.scss";

declare const dialog: any;

export const ModalPatcherProject = (props: BaseModalProps) => {
  const modal = props.modal as ModalPatcherProjectState;
  const [show, setShow] = useState(modal.visible);
  const [projectPath, setProjectPath] = useState(modal.projectPath);
  const [projectName, setProjectName] = useState(modal.projectName);
  const [files, setFiles] = useState(modal.files);
  const [status, setStatus] = useState(modal.status);
  const [error, setError] = useState(modal.error);

  useEffect(() => {
    const showHandler = () => setShow(true);
    const hideHandler = () => setShow(false);
    const pathHandler = () => setProjectPath(modal.projectPath);
    const nameHandler = () => setProjectName(modal.projectName);
    const filesHandler = () => setFiles([...modal.files]);
    const statusHandler = () => setStatus(modal.status);
    const errorHandler = () => setError(modal.error);

    modal.addEventListener('onShow', showHandler);
    modal.addEventListener('onHide', hideHandler);
    modal.addEventListener('onProjectPathChange', pathHandler);
    modal.addEventListener('onProjectNameChange', nameHandler);
    modal.addEventListener('onFilesChange', filesHandler);
    modal.addEventListener('onStatusChange', statusHandler);
    modal.addEventListener('onErrorChange', errorHandler);

    return () => {
      modal.removeEventListener('onShow', showHandler);
      modal.removeEventListener('onHide', hideHandler);
      modal.removeEventListener('onProjectPathChange', pathHandler);
      modal.removeEventListener('onProjectNameChange', nameHandler);
      modal.removeEventListener('onFilesChange', filesHandler);
      modal.removeEventListener('onStatusChange', statusHandler);
      modal.removeEventListener('onErrorChange', errorHandler);
    };
  }, [modal]);

  const handleClose = () => {
    modal.hide();
  };

  const browseProjectFolder = async () => {
    if(KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON){
      const result = await dialog.locateDirectoryDialog();
      if(result){
        modal.setProjectPath(result);
      }
    } else {
      const dirHandle = await window.showDirectoryPicker();
      if(dirHandle){
        modal.setProjectPath(dirHandle.name);
      }
    }
  };

  const addFiles = async () => {
    try {
      const result = await ForgeFileSystem.OpenFile();
      if (!result) return;
      const buffer = await ForgeFileSystem.ReadFileBufferFromResponse(result);
      if (buffer.length === 0) return;
      const pathStr = result.paths?.[0] ?? '';
      const filename = pathStr ? pathStr.replace(/^.*[\\/]/, '') : 'unknown';
      const ext = pathStr ? (pathStr.includes('.') ? pathStr.slice(pathStr.lastIndexOf('.')) : '') : '';
      const file: PatcherFile = {
        path: pathStr,
        filename,
        type: ext,
        size: buffer.length
      };
      modal.addFile(file);
    } catch(e: unknown) {
      modal.setError(`Failed to add file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const generateConfig = () => {
    const config = modal.generateConfig();
    modal.setConfigText(config);
    modal.setStatus('Config generated successfully');
  };

  const exportProject = async () => {
    modal.setStatus('Exporting project...');
    try {
      // Generate config
      const config = modal.generateConfig();

      // For now, just download the config as a text file
      const blob = new Blob([config], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_config.ini`;
      a.click();
      URL.revokeObjectURL(url);

      modal.setStatus('Config exported successfully');
    } catch(e: unknown) {
      modal.setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      className="modal-patcher-project"
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="patcher-project-content">
          <div className="info-section">
            <p>
              Create a patcher project to package mod files with configuration.
              This tool helps you prepare files for distribution as a mod package.
            </p>
          </div>

          <div className="project-section">
            <h5>Project Settings</h5>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => modal.setProjectName(e.target.value)}
                placeholder="My Mod Name"
              />
            </div>
            <div className="form-group">
              <label>Project Folder</label>
              <div className="path-input-group">
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => modal.setProjectPath(e.target.value)}
                  placeholder="Select a folder..."
                  readOnly
                />
                <button onClick={browseProjectFolder} className="btn-browse">
                  Browse
                </button>
              </div>
            </div>
          </div>

          <div className="files-section">
            <div className="section-header">
              <h5>Files to Package ({files.length})</h5>
              <button onClick={addFiles} className="btn-add">
                + Add Files
              </button>
            </div>

            {files.length === 0 ? (
              <div className="no-files">
                <p>No files added yet. Click "Add Files" to include files in your patcher project.</p>
              </div>
            ) : (
              <div className="files-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <span className="file-name">{file.filename}</span>
                      <span className="file-details">{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => modal.removeFile(index)}
                      className="btn-remove"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status && (
            <div className="status-message">
              {status}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={handleClose} className="btn-secondary">
          Close
        </button>
        <button
          onClick={generateConfig}
          className="btn-primary"
          disabled={files.length === 0}
        >
          Generate Config
        </button>
        <button
          onClick={exportProject}
          className="btn-primary"
          disabled={files.length === 0 || !projectName}
        >
          Export Project
        </button>
      </Modal.Footer>
    </Modal>
  );
};
