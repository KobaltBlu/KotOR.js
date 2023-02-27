import React, { useState } from "react";
// import { EditorTab } from "../../../../editor/tabs/EditorTab";
import BaseTab from "./BaseTab";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { ForgeFileSystem } from "../../ForgeFileSystem";
import { Project } from "../../Project";

export const TabQuickStart = function(props: BaseTabProps) {

  const [files, setFiles] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  const onBtnNewProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

  };

  const onBtnOpenProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    Project.OpenByDirectory();
  };

  return (
    <div className="row" style={{ padding: '10px' }}>
      <div className="col-xs-12">
        <center><h1 style={{'fontFamily': 'Trajan', 'fontWeight': 'bold', 'color': '#d6b400' }}>KOTOR Forge</h1></center>
      </div>
      <div className="col-xs-12">
        <label>Start</label>
        <div>
          <a href="#" onClick={onBtnNewProject}>New Project</a><br/>
          <a href="#" onClick={onBtnOpenProject}>Open Project</a><br/>
        </div>
        <br/>
        <label>Recent Projects</label>
        <div>
          <ul id="list-recent-projects" className="tree">
            {
              projects.map( (project) => {
                return (
                  <li>{project}</li>
                )
              })
            }
          </ul>
        </div>
        <label>Recent Files</label>
        <div>
          <ul id="list-recent-files" className="tree">
            {
              files.map( (file) => {
                return (
                  <li>{file}</li>
                )
              })
            }
          </ul>
        </div>
      </div>
    </div>
  );

}
