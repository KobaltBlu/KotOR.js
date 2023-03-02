import React, { useState } from "react";
import BaseTab from "./BaseTab";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import { Project } from "../../Project";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ForgeState } from "../../states/ForgeState";
import { EditorFile } from "../../EditorFile";
import { FileTypeManager } from "../../FileTypeManager";

export const TabQuickStart = function(props: BaseTabProps) {

  const [files, setFiles] = useState<EditorFile[]>(ForgeState.recentFiles);
  const [projects, setProjects] = useState<string[]>(ForgeState.recentProjects);

  const onBtnOpenFile = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    ForgeState.openFile();
  };

  const onBtnNewProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    //TODO: NewProjectWizard
    alert('TODO');
  };

  const onBtnOpenProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    Project.OpenByDirectory();
  };

  const onRecentFilesUpdated = () => {
    console.log('onRecentFilesUpdated', ForgeState.recentFiles);
    setFiles([...ForgeState.recentFiles]);
  }

  useEffectOnce( () => { //constructor
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    return () => { //destructor
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    }
  });

  const onClickRecentProject = (e: React.MouseEvent, project: string) => {
    //TODO
    alert('TODO');
  }

  const onClickRecentFile = (e: React.MouseEvent, file: EditorFile) => {
    e.preventDefault();
    FileTypeManager.onOpenResource(file);
  }

  const onClickRemoveRecentFile = (e: React.MouseEvent, file: EditorFile) => {
    e.preventDefault();
    ForgeState.removeRecentFile(file);
  }

  //<i className="fa-solid fa-file-circle-plus"></i>
  return (
    <div className="row" style={{ padding: '10px' }}>
      <div className="col-xs-10">
        <center><h1 style={{'fontFamily': 'Trajan', 'fontWeight': 'bold', 'color': '#d6b400' }}>KOTOR Forge</h1></center>
      </div>
      <div className="col-xs-10">
        <h2>Start</h2>
        <div>
          <a href="#" className="text-decoration-none" onClick={onBtnOpenFile}><i className="fa-solid fa-file-code"></i> Open File</a><br/>
          <a href="#" className="text-decoration-none" onClick={onBtnNewProject}><i className="fa-solid fa-folder-plus"></i> New Project</a><br/>
          <a href="#" className="text-decoration-none" onClick={onBtnOpenProject}><i className="fa-solid fa-folder-open"></i> Open Project</a><br/>
        </div>
        <br/>
        <h2>Recent Projects</h2>
        <div>
          <ul id="list-recent-projects" className="tree">
            {
              projects.map( (project) => {
                return (
                  <li key={project}><a href="#" className="text-decoration-none" onClick={(e) => onClickRecentProject(e, project)} style={{fontWeight: 'bold'}}>{project}</a></li>
                )
              })
            }
          </ul>
        </div>
        <h2>Recent Files</h2>
        <div>
          <ul id="list-recent-files" className="tree">
            {
              files.map( (file) => {
                return (
                  <li key={file.path}>
                    <i className="fa-solid fa-xmark" title="Delete file from history" onClick={(e) => onClickRemoveRecentFile(e, file)}></i>&nbsp;
                    <a href="#" className="text-decoration-none" onClick={(e) => onClickRecentFile(e, file)} style={{fontWeight: 'bold'}}>{file.getFilename()}</a>&nbsp;
                    {file.getPrettyPath()}
                  </li>
                )
              })
            }
          </ul>
        </div>
      </div>
    </div>
  );

}
