import React, { useState, useCallback, memo } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { Project } from "../../Project";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ForgeState } from "../../states/ForgeState";
import { EditorFile } from "../../EditorFile";
import { FileTypeManager } from "../../FileTypeManager";
import "./TabQuickStart.scss";

export const TabQuickStart = memo(function TabQuickStart(props: BaseTabProps) {
  const [files, setFiles] = useState<EditorFile[]>(ForgeState.recentFiles);
  const [projects, setProjects] = useState<string[]>(ForgeState.recentProjects);

  const onBtnOpenFile = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    ForgeState.openFile();
  }, []);

  const onBtnNewProject = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // TODO: NewProjectWizard
    alert('TODO: New Project Wizard');
  }, []);

  const onBtnOpenProject = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    Project.OpenByDirectory();
  }, []);

  const onRecentFilesUpdated = useCallback(() => {
    setFiles([...ForgeState.recentFiles]);
  }, []);

  useEffectOnce(() => {
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    };
  });

  const onClickRecentProject = useCallback((e: React.MouseEvent, project: string) => {
    e.preventDefault();
    // TODO: Implement recent project opening
    alert('TODO: Open Recent Project');
  }, []);

  const onClickRecentFile = useCallback((e: React.MouseEvent, file: EditorFile) => {
    e.preventDefault();
    FileTypeManager.onOpenResource(file);
  }, []);

  const onClickRemoveRecentFile = useCallback((e: React.MouseEvent, file: EditorFile) => {
    e.stopPropagation();
    e.preventDefault();
    ForgeState.removeRecentFile(file);
  }, []);

  return (
    <div className="quick-start-container">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">FORGE</h1>
        <p className="hero-subtitle">Odyssey Engine Modding Tool</p>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Quick Actions */}
        <div className="quick-start-card quick-actions-card">
          <h2 className="quick-start-card-title">
            <i className="fa-solid fa-rocket" />
            <span>Quick Start</span>
          </h2>
          <div className="action-buttons">
            <div className="action-button" onClick={onBtnOpenFile}>
              <i className="fa-solid fa-file-code" />
              <span>Open File</span>
            </div>
            <div className="action-button" onClick={onBtnNewProject}>
              <i className="fa-solid fa-folder-plus" />
              <span>New Project</span>
            </div>
            <div className="action-button" onClick={onBtnOpenProject}>
              <i className="fa-solid fa-folder-open" />
              <span>Open Project</span>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="quick-start-card">
          <h2 className="quick-start-card-title">
            <i className="fa-solid fa-clock-rotate-left" />
            <span>Recent Projects</span>
          </h2>
          {projects.length > 0 ? (
            <ul className="recent-items-list">
              {projects.map((project) => (
                <li
                  key={project}
                  className="recent-item"
                  onClick={(e) => onClickRecentProject(e, project)}
                >
                  <i className="fa-solid fa-folder item-icon" />
                  <div className="item-content">
                    <div className="item-name">{project}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <i className="fa-solid fa-folder-open" />
              <div>No recent projects</div>
            </div>
          )}
        </div>

        {/* Recent Files - Full Width */}
        <div className="quick-start-card quick-start-card-full-width">
          <h2 className="quick-start-card-title">
            <i className="fa-solid fa-file-lines" />
            <span>Recent Files</span>
          </h2>
          {files.length > 0 ? (
            <ul className="recent-items-list">
              {files.map((file) => (
                <li
                  key={file.path}
                  className="recent-item"
                  onClick={(e) => onClickRecentFile(e, file)}
                >
                  <i className="fa-solid fa-file item-icon" />
                  <div className="item-content">
                    <div className="item-name">{file.getFilename()}</div>
                    <div className="item-path">{file.getPrettyPath()}</div>
                  </div>
                  <button
                    className="remove-button"
                    onClick={(e) => onClickRemoveRecentFile(e, file)}
                    title="Remove from history"
                    aria-label="Remove from history"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <i className="fa-solid fa-file-circle-question" />
              <div>No recent files</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
