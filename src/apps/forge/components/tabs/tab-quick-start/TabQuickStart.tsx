import React, { useState, useCallback, memo } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { Project } from "../../../Project";
import { ProjectFileSystem } from "../../../ProjectFileSystem";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { ForgeState } from "../../../states/ForgeState";
import { EditorFile } from "../../../EditorFile";
import { RecentProject } from "../../../RecentProject";
import { FileTypeManager } from "../../../FileTypeManager";
import * as KotOR from "../../../KotOR";
import "./TabQuickStart.scss";
import { ModalNewProjectState } from "../../../states/modal/ModalNewProjectState";

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

    try{
      // Show loading state
      ForgeState.loaderShow();

      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        // For Electron, use the stored path
        const projectPath = recentProject.path;
        if(!projectPath){
          throw new Error('Project path not available');
        }
        ProjectFileSystem.rootDirectoryPath = projectPath;
        const project = new Project();
        const loaded = await project.load();
        if(loaded){
          await project.open();
          await ProjectFileSystem.initializeProjectExplorer();
        } else {
          // Project failed to load, remove from recent list
          ForgeState.removeRecentProject(recentProject);
          alert('Failed to open project. It may have been moved or deleted.');
        }
      } else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        // For browser, try to restore the handle from storage
        let handle = recentProject.handle;

        // If handle is not in memory, try to restore from IndexedDB
        if(!handle && recentProject.name){
          const handleKey = `project_handle_${recentProject.getIdentifier()}`;
          try {
            const { get } = await import('idb-keyval');
            handle = await get(handleKey);
          } catch(e) {
            console.warn('Failed to restore handle from IndexedDB:', e);
          }
        }

        if(handle instanceof FileSystemDirectoryHandle){
          // Verify handle is still valid
          try{
            await handle.queryPermission({ mode: 'read' });
            ProjectFileSystem.rootDirectoryHandle = handle;
            const project = new Project();
            const loaded = await project.load();
            if(loaded){
              await project.open();
              await ProjectFileSystem.initializeProjectExplorer();
              // Update the stored handle in case it changed
              await ForgeState.addRecentProject(handle);
            } else {
              throw new Error('Project failed to load');
            }
          } catch(permError){
            // Handle permission denied or invalid - request new access
            console.warn('Handle permission denied or invalid, requesting new access:', permError);
            Project.OpenByDirectory();
          }
        } else {
          // No handle available, request new directory access
          Project.OpenByDirectory();
        }
      }

      ForgeState.loaderHide();
    } catch(e){
      console.error('Error opening recent project:', e);
      ForgeState.loaderHide();
      // Remove invalid project from recent list
      await ForgeState.removeRecentProject(recentProject);
      alert('Failed to open project. It may have been moved or deleted.');
    }
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

  const onClickRemoveRecentProject = useCallback(async (e: React.MouseEvent, project: RecentProject) => {
    e.stopPropagation();
    e.preventDefault();
    await ForgeState.removeRecentProject(project);
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
          <h2 className="quick-start-card-title d-flex align-items-center justify-content-between">
            <span>
              <i className="fa-solid fa-clock-rotate-left" />
              <span>Recent Projects</span>
            </span>
            {projects.length > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-muted"
                onClick={async (e) => {
                  e.stopPropagation();
                  await ForgeState.clearRecentProjects();
                }}
                title="Clear recent projects"
              >
                Clear
              </button>
            )}
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
                  <button
                    className="remove-button"
                    onClick={(e) => onClickRemoveRecentProject(e, project)}
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

