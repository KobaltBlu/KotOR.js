import React from "react";
// import { EditorTab } from "../../../../editor/tabs/EditorTab";
import BaseTab from "./BaseTab";
import { BaseTabProps } from "../../interfaces/BaseTabProps";

export const TabQuickStart = function(props: BaseTabProps) {

  return (
    <div className="row" style={{ padding: '10px' }}>
      <div className="col-xs-12">
        <center><h1 style={{'fontFamily': 'Trajan', 'fontWeight': 'bold', 'color': '#d6b400' }}>KOTOR Forge</h1></center>
      </div>
      <div className="col-xs-12">
        <label>Start</label>
        <div>
          <a id="btn-new-project" href="#">New Project</a><br/>
          <a id="btn-open-project" href="#">Open Project</a><br/>
        </div>
        <br/>
        <label>Recent Projects</label>
        <div>
          <ul id="list-recent-projects" className="tree">

          </ul>
        </div>
        <label>Recent Files</label>
        <div>
          <ul id="list-recent-files" className="tree">

          </ul>
        </div>
      </div>
    </div>
  );

}
