import React, { useState } from "react";
import { TabModelViewerState } from "../states/tabs/TabModelViewerState";
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { Form } from "react-bootstrap";
import { SceneGraphTreeView } from "./SceneGraphTreeView";

export const ModelViewerSidebarComponent = function(props: any){
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const [selectedTab, setSelectedTab] = useState<string>('camera');

  useEffectOnce( () => { //constructor

    return () => { //destructor

    };
  });

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
            <li className={`btn btn-tab ${selectedTab == 'camera' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('camera') }>Camera</a></li>
            <li className={`btn btn-tab ${selectedTab == 'animation' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('animation') }>Animation</a></li>
            <li className={`btn btn-tab ${selectedTab == 'nodes' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('nodes') }>Nodes</a></li>
            <li className={`btn btn-tab ${selectedTab == 'utils' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('utils') }>Utils</a></li>
          </ul>
        </div>
        <div className="tab-container">
          <div className="tab-content" style={{display: (selectedTab == 'camera' ? 'block' : 'none')}}>
            <div className="toolbar-header">
              <b>Camera</b>
            </div>
            <Form.Select>
              <option value="-1">Main</option>
            </Form.Select>

            <div className="toolbar-header">
              <b>Camera Speed</b>
            </div>
            <input type="range" min="1" max="25" value="10" />
            <div className="button-group">
              <button>Align to camera hook</button>
            </div>
          </div>
          <div className="tab-content" style={{display: (selectedTab == 'animation' ? 'block' : 'none')}}>
            <div className="toolbar-header">
              <b>Animations</b>
            </div>
            <Form.Select>
              <option value="-1">None</option>
            </Form.Select>
            <b>Loop? </b><input type="checkbox" />
          </div>
          <div className="tab-content" style={{display: (selectedTab == 'nodes' ? 'block' : 'none')}}>
            <div className="toolbar-header">
              <b>Name</b>
            </div>
            <input type="text" className="input" disabled />
            <div className="toolbar-header">
              <b>Texture</b>
            </div>
            <input type="text" className="input" disabled />
            <div className="button-group">
              <button>Change Texture</button>
            </div>
          </div>
          <div className="tab-content" style={{display: (selectedTab == 'utils' ? 'block' : 'none')}}>
            <div className="toolbar-header">
              <b>Position</b>
            </div>
            <div className="button-group">
              <button>Reset</button>
              <button>Center</button>
            </div>
            <div className="toolbar-header">
              <b>Layout</b>
            </div>
            <Form.Select>
              <option value="-1">None</option>
            </Form.Select>
            <div className="button-group">
              <button>Load</button>
              <button>Dispose</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}