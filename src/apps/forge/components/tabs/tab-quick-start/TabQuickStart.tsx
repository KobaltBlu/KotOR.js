import React, { useState, useCallback, memo } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { Project } from "@/apps/forge/Project";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { EditorFile } from "@/apps/forge/EditorFile";
import { RecentProject } from "@/apps/forge/RecentProject";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import "@/apps/forge/components/tabs/tab-quick-start/TabQuickStart.scss";
import { ModalNewProjectState } from "@/apps/forge/states/modal/ModalNewProjectState";
import { openNewProjectFromModWizard } from "@/apps/forge/helpers/openNewProjectFromModWizard";

export const TabQuickStart = memo(function TabQuickStart(props: BaseTabProps) {
  const [files, setFiles] = useState<EditorFile[]>(ForgeState.recentFiles);
  const [projects, setProjects] = useState<RecentProject[]>(ForgeState.recentProjects);

  const onBtnOpenFile = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    ForgeState.openFile();
  }, []);

  const onBtnNewProject = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const newProjectModalState = new ModalNewProjectState();
    ForgeState.modalManager.addModal(newProjectModalState);
    newProjectModalState.open();
  }, []);

  const onBtnNewProjectFromMod = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    openNewProjectFromModWizard();
  }, []);

  const onBtnOpenProject = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    Project.OpenByDirectory();
  }, []);

  const onRecentFilesUpdated = useCallback(() => {
    setFiles([...ForgeState.recentFiles]);
  }, []);

  const onRecentProjectsUpdated = useCallback(() => {
    setProjects([...ForgeState.recentProjects]);
  }, []);

  useEffectOnce(() => {
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    ForgeState.addEventListener('onRecentProjectsUpdated', onRecentProjectsUpdated);
    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
      ForgeState.removeEventListener('onRecentProjectsUpdated', onRecentProjectsUpdated);
    };
  });

  const onClickRecentProject = useCallback(async (e: React.MouseEvent, recentProject: RecentProject) => {
    e.preventDefault();
    if(!recentProject) return;
    await Project.OpenRecent(recentProject);
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
        <div className="quick-start-card quick-actions-card" data-trask-target="quick-start-actions">
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
            <div className="action-button" onClick={onBtnNewProjectFromMod}>
              <i className="fa-solid fa-box-archive" />
              <span>From Module</span>
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
              {projects.map((project, index) => (
                <li
                  key={project.getIdentifier() || index}
                  className="recent-item"
                  onClick={(e) => onClickRecentProject(e, project)}
                >
                  <i className="fa-solid fa-folder item-icon" />
                  <div className="item-content">
                    <div className="item-name">{project.getDisplayName()}</div>
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

