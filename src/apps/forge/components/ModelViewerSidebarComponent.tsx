import React, { useState } from "react";
import { TabModelViewerState } from "../states/tabs";
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { Form } from "react-bootstrap";
import { SceneGraphTreeView } from "./SceneGraphTreeView";

import * as KotOR from "../KotOR";
import { ModelViewerControls } from "../ModelViewerControls";

export const ModelViewerSidebarComponent = function(props: any){
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const [selectedTab, setSelectedTab] = useState<string>('camera');

  const [animations, setAnimations] = useState<KotOR.OdysseyModelAnimation[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState<number>(tab.selectedAnimationIndex);
  const [looping, setLooping] = useState<boolean>(tab.looping);

  const [layouts, setLayouts] = useState<KotOR.KEY[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<number>(tab.selectedLayoutIndex);

  const [cameraSpeed, setCameraSpeed] = useState<number>(ModelViewerControls.CameraMoveSpeed);

  const onEditorFileLoad = () => {
    setAnimations(tab.animations);
  }

  const onAnimationChange = function(){
    setSelectedAnimation(tab.selectedAnimationIndex);
  };

  const onLoopChange = function(){
    setLooping(tab.looping);
  };

  useEffectOnce( () => { //constructor

    let keys: KotOR.KEY[] = [];
    let res_list = KotOR.KEYManager.Key.GetFilesByResType(KotOR.ResourceTypes['lyt']);
    res_list.forEach( (res, index) => {
      keys.push(
        KotOR.KEYManager.Key.GetFileKeyByRes(res)
      );
    });
    setLayouts(keys);

    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onAnimationChange', onAnimationChange);
    tab.addEventListener('onLoopChange', onLoopChange);

    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onAnimationChange', onAnimationChange);
      tab.removeEventListener('onLoopChange', onLoopChange);
    };
  });

  const onCameraSpeedChange = function(e: React.ChangeEvent<HTMLInputElement>){
    let value = parseFloat(e.target.value);
    if(isNaN(value)) value = 10;
    setCameraSpeed(value);
    ModelViewerControls.CameraMoveSpeed = value;
  };

  const onBtnAlignToCameraHook = function(e: React.MouseEvent<HTMLButtonElement>){

  }

  const onAnimationSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setSelectedAnimation(value);
    tab.setAnimationByIndex(value);
  };

  const onCheckboxLoopChange = function(e: React.ChangeEvent<HTMLInputElement>){
    tab.setLooping(e.target.checked);
    setLooping(e.target.checked);
  }

  const onLayoutSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    tab.selectedLayoutIndex = value;
    setSelectedLayout(value);
    // tab.setLayoutByIndex(value);
  };

  const onBtnLoadLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    tab.loadLayout( layouts.find( key => key.ResID == selectedLayout ) );
  };

  const onBtnDisposeLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    tab.disposeLayout();
  };

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
            <Form.Control type="number" min={1} max={250} value={cameraSpeed} onChange={onCameraSpeedChange} ></Form.Control>
            <div className="button-group">
              <button onClick={onBtnAlignToCameraHook}>Align to camera hook</button>
            </div>
          </div>
          <div className="tab-content" style={{display: (selectedTab == 'animation' ? 'block' : 'none')}}>
            <div className="toolbar-header">
              <b>Animations</b>
            </div>
            <Form.Select value={selectedAnimation} onChange={onAnimationSelectChange}>
              <option value={-1}>None</option>
              {
                animations.map( (animation, index) => {
                  return <option value={index}>{animation.name}</option>
                })
              }
            </Form.Select>
            <b>Loop? </b><input type="checkbox" checked={looping} onChange={onCheckboxLoopChange} />
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
            <Form.Select value={selectedLayout} onChange={onLayoutSelectChange}>
              <option value={-1}>None</option>
              {
                layouts.map( (lytKEY) => {
                  return <option value={lytKEY.ResID}>{lytKEY.ResRef}</option>
                })
              }
            </Form.Select>
            <div className="button-group">
              <button onClick={onBtnLoadLayout}>Load</button>
              <button onClick={onBtnDisposeLayout}>Dispose</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}