import React, { useEffect, useState } from "react";
import { TabModelViewerState } from "../states/tabs";
import { SceneGraphTreeView } from "./SceneGraphTreeView";

import * as KotOR from "../KotOR";
import { UI3DRenderer } from "../UI3DRenderer";

export const ModuleEditorSidebarComponent = function(props: any){
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const [selectedTab, setSelectedTab] = useState<string>('area-objects');

  useEffect( () => { //constructor

    // todo: add event listeners

    return () => { //destructor
      // todo: cleanup
    };
  }, []);

  return (
    <>
      <div className="nodes-container" style={{ flex: 0.25, overflowY: 'auto' }}>
        <div className="toolbar-header">
          <b>Scene</b>
        </div>
        <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      </div>
      <div className="tab-host" style={{ flex: 0.75 }}>
        <div className="tabs">
          <ul className="tabs-menu tabs-flex-wrap">
            <li className={`btn btn-tab ${selectedTab == 'area-objects' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('area-objects') }>Area Objects</a></li>
          </ul>
        </div>
        <div className="tab-container">
          {/* TODO: Add module editor content */}
        </div>
      </div>
    </>
  );
}