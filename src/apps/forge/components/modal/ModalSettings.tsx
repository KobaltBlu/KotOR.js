import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { ModalSettingsState } from "../../states/modal/ModalSettingsState";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import * as KotOR from "../../KotOR";
import "./ModalSettings.scss";

declare const dialog: any;

export const ModalSettings = (props: BaseModalProps) => {
  const modal = props.modal as ModalSettingsState;
  const [show, setShow] = useState(modal.visible);
  const [activeTab, setActiveTab] = useState(modal.activeTab);
  const [settings, setSettings] = useState(modal.settings);

  useEffect(() => {
    const showHandler = () => setShow(true);
    const hideHandler = () => setShow(false);
    const tabHandler = () => setActiveTab(modal.activeTab);
    const settingsHandler = () => setSettings({...modal.settings});

    modal.addEventListener('onShow', showHandler);
    modal.addEventListener('onHide', hideHandler);
    modal.addEventListener('onActiveTabChange', tabHandler);
    modal.addEventListener('onSettingsChange', settingsHandler);

    return () => {
      modal.removeEventListener('onShow', showHandler);
      modal.removeEventListener('onHide', hideHandler);
      modal.removeEventListener('onActiveTabChange', tabHandler);
      modal.removeEventListener('onSettingsChange', settingsHandler);
    };
  }, [modal]);

  const handleClose = () => {
    modal.hide();
  };

  const handleSave = () => {
    modal.saveSettings();
    modal.hide();
  };

  const browseKotorPath = async () => {
    if(KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON){
      const result = await dialog.locateDirectoryDialog();
      if(result){
        modal.updateSetting('kotorPath', result);
      }
    }
  };

  const browseKotor2Path = async () => {
    if(KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON){
      const result = await dialog.locateDirectoryDialog();
      if(result){
        modal.updateSetting('kotor2Path', result);
      }
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      className="modal-settings"
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="settings-content">
          <div className="settings-tabs">
            <button
              className={activeTab === 'installations' ? 'active' : ''}
              onClick={() => modal.setActiveTab('installations')}
            >
              Installations
            </button>
            <button
              className={activeTab === 'editor' ? 'active' : ''}
              onClick={() => modal.setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={activeTab === 'updates' ? 'active' : ''}
              onClick={() => modal.setActiveTab('updates')}
            >
              Updates
            </button>
            <button
              className={activeTab === 'appearance' ? 'active' : ''}
              onClick={() => modal.setActiveTab('appearance')}
            >
              Appearance
            </button>
          </div>

          <div className="settings-panel">
            {activeTab === 'installations' && (
              <div className="settings-section">
                <h4>Game Installations</h4>
                <p className="section-description">
                  Configure paths to your KotOR I and KotOR II installations.
                </p>

                <div className="form-group">
                  <label>KotOR I Path</label>
                  <div className="path-input-group">
                    <input
                      type="text"
                      value={settings.kotorPath}
                      onChange={(e) => modal.updateSetting('kotorPath', e.target.value)}
                      placeholder="C:\Program Files\KOTOR"
                    />
                    <button onClick={browseKotorPath} className="btn-browse">
                      Browse
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>KotOR II Path</label>
                  <div className="path-input-group">
                    <input
                      type="text"
                      value={settings.kotor2Path}
                      onChange={(e) => modal.updateSetting('kotor2Path', e.target.value)}
                      placeholder="C:\Program Files\KOTOR2"
                    />
                    <button onClick={browseKotor2Path} className="btn-browse">
                      Browse
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-section">
                <h4>Editor Preferences</h4>
                <p className="section-description">
                  Configure editor behavior and display options.
                </p>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.gffSpecializedEditors}
                      onChange={(e) => modal.updateSetting('gffSpecializedEditors', e.target.checked)}
                    />
                    Use specialized editors for GFF files
                  </label>
                  <small>When enabled, GFF files open in type-specific editors (e.g. UTC, UTI) instead of generic GFF editor</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => modal.updateSetting('autoSave', e.target.checked)}
                    />
                    Auto-save on file change
                  </label>
                  <small>Automatically save files when switching tabs or closing the editor</small>
                </div>

                <div className="form-group">
                  <label>Script Editor Font Size</label>
                  <input
                    title="Script Editor Font Size"
                    placeholder="Script Editor Font Size"
                    type="number"
                    value={settings.scriptEditorFontSize}
                    onChange={(e) => modal.updateSetting('scriptEditorFontSize', parseInt(e.target.value) || 14)}
                    min="8"
                    max="24"
                  />
                </div>
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="settings-section">
                <h4>Update Settings</h4>
                <p className="section-description">
                  Configure how Forge checks for updates.
                </p>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.checkForUpdatesOnStartup}
                      onChange={(e) => modal.updateSetting('checkForUpdatesOnStartup', e.target.checked)}
                    />
                    Check for updates on startup
                  </label>
                  <small>Automatically check for new versions when Forge starts (silent check)</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.useBetaChannel}
                      onChange={(e) => modal.updateSetting('useBetaChannel', e.target.checked)}
                    />
                    Use beta/pre-release channel
                  </label>
                  <small>Receive notifications for beta and pre-release versions</small>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h4>Appearance</h4>
                <p className="section-description">
                  Customize the visual appearance of Forge.
                </p>

                <div className="form-group">
                  <label>Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => modal.updateSetting('theme', e.target.value)}
                  >
                    <option value="dark">Dark (Default)</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <small>Theme selection will take effect on next launch</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={handleClose} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSave} className="btn-primary">
          Save Settings
        </button>
      </Modal.Footer>
    </Modal>
  );
};
