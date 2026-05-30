import React, { useState } from 'react';
import * as THREE from 'three';
import { TabModelViewerState, TabModelViewerStateEventListenerTypes } from '@/apps/forge/states/tabs';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import { Form } from 'react-bootstrap';
import { SceneGraphTreeView } from '@/apps/forge/components/SceneGraphTreeView';
import { SectionContainer } from '@/apps/forge/components/SectionContainer';
import { NodePropertiesPanel } from '@/apps/forge/components/tabs/tab-model-viewer/panels/NodePropertiesPanel';

import * as KotOR from '@/apps/forge/KotOR';
import { UI3DRenderer } from '@/apps/forge/UI3DRenderer';

export const ModelViewerSidebarComponent = function (props: any) {
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const [layouts, setLayouts] = useState<KotOR.IKEYEntry[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<number>(tab.selectedLayoutIndex);

  const [cameraSpeed, setCameraSpeed] = useState<number>(UI3DRenderer.CameraMoveSpeed);

  const [selectedNode, setSelectedNode] = useState<KotOR.OdysseyObject3D | undefined>(undefined);
  const [selectedModelNode, setSelectedModelNode] = useState<KotOR.OdysseyModelNode | undefined>(undefined);

  const [cameras, setCameras] = useState<{ name: string; camera: THREE.PerspectiveCamera; isMain: boolean }[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [cameraFov, setCameraFov] = useState<number>(tab.ui3DRenderer.camera?.fov ?? 50);
  const [keyframeEditorEnabled, setKeyframeEditorEnabled] = useState<boolean>(tab.keyframeEditorEnabled);
  const [trackOptions, setTrackOptions] = useState(tab.getEditableTracks());
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tab.selectedTrack?.id ?? '');
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>(tab.selectedKey?.keyIndex ?? -1);
  const [followCameraHook, setFollowCameraHook] = useState<boolean>(tab.followCameraHook);
  const [selectedCameraHookNode, setSelectedCameraHookNode] = useState<string>('');

  const onNodeSelect = function (
    node: KotOR.OdysseyObject3D | undefined,
    modelNode: KotOR.OdysseyModelNode | undefined
  ) {
    setSelectedNode(node);
    setSelectedModelNode(modelNode);
  };

  const onEditorFileLoad = function () {
    const available = tab.getAvailableCameras();
    setCameras(available);
    setSelectedCameraIndex(0);
    setCameraFov(available[0]?.camera.fov ?? 50);
  };

  const onCameraChange = function (camera: THREE.PerspectiveCamera) {
    setCameraFov(camera.fov);
  };

  const onKeyframeEditorChange = function () {
    const tracks = tab.getEditableTracks();
    setTrackOptions(tracks);
    setKeyframeEditorEnabled(tab.keyframeEditorEnabled);
    setSelectedTrackId(tab.selectedTrack?.id ?? '');
    setSelectedKeyIndex(tab.selectedKey?.keyIndex ?? -1);
    setFollowCameraHook(tab.followCameraHook);
  };

  useEffectOnce(() => {
    let keys: KotOR.IKEYEntry[] = [];
    let res_list = KotOR.KEYManager.Key.getFilesByResType(KotOR.ResourceTypes['lyt']);
    res_list.forEach((res, index) => {
      keys.push(KotOR.KEYManager.Key.getFileKeyByRes(res));
    });
    setLayouts(keys);

    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onNodeSelect', onNodeSelect);
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onCameraChange', onCameraChange);
    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', onKeyframeEditorChange);
    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onTrackSelectionChange', onKeyframeEditorChange);
    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onKeySelectionChange', onKeyframeEditorChange);
    tab.addEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange', onKeyframeEditorChange);

    return () => {
      tab.removeEventListener('onNodeSelect', onNodeSelect);
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onCameraChange', onCameraChange);
      tab.removeEventListener('onKeyframeEditorChange', onKeyframeEditorChange);
      tab.removeEventListener('onTrackSelectionChange', onKeyframeEditorChange);
      tab.removeEventListener('onKeySelectionChange', onKeyframeEditorChange);
      tab.removeEventListener('onKeyFramesChange', onKeyframeEditorChange);
    };
  });

  const onCameraSpeedChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 10;
    setCameraSpeed(value);
    UI3DRenderer.CameraMoveSpeed = value;
  };

  const onCameraSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    setSelectedCameraIndex(idx);
    const entry = cameras[idx];
    if (entry) {
      tab.setCamera(entry.camera);
      setCameraFov(entry.camera.fov);
    }
  };

  const onCameraFovChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value)) return;
    setCameraFov(value);
    const entry = cameras[selectedCameraIndex];
    if (entry) {
      tab.setCameraFov(entry.camera, value);
    }
  };

  const onLayoutSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    tab.selectedLayoutIndex = value;
    setSelectedLayout(value);
  };

  const onBtnLoadLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    tab.loadLayout(layouts.find((key) => key.resId == selectedLayout));
  };

  const onBtnDisposeLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    tab.disposeLayout();
  };

  const isMainCamera = cameras[selectedCameraIndex]?.isMain ?? true;
  const selectedTrack = trackOptions.find((track) => track.id === selectedTrackId);
  const selectedKey = selectedTrack && selectedKeyIndex >= 0 ? selectedTrack.keys[selectedKeyIndex] : undefined;

  const onFollowCameraHookChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setFollowCameraHook(enabled);
    tab.setFollowCameraHook(enabled);
  };

  return (
    <div className="mvp-sidebar">
      <div className="mvp-scene-outliner">
        <div className="toolbar-header">
          <b>Scene</b>
        </div>
        <SceneGraphTreeView
          manager={tab.ui3DRenderer.sceneGraphManager}
          listStyle={{ height: '200px', overflow: 'auto' }}
        />
      </div>
      <div className="mvp-properties-scroll">
        {selectedNode && selectedModelNode ? (
          <NodePropertiesPanel node={selectedNode} modelNode={selectedModelNode} tab={tab} />
        ) : (
          <div className="mvp-no-selection">
            <span>Select a node to view properties</span>
          </div>
        )}

        <SectionContainer name="Camera" collapsible>
          <Form.Select size="sm" value={selectedCameraIndex} onChange={onCameraSelectChange}>
            {cameras.map((entry, index) => (
              <option key={index} value={index}>
                {entry.name}
              </option>
            ))}
            {cameras.length === 0 && <option value={0}>Main</option>}
          </Form.Select>
          <div className="property-editor-row">
            <span className="property-editor-label">Speed</span>
            <Form.Control
              size="sm"
              type="number"
              min={1}
              max={250}
              value={cameraSpeed}
              onChange={onCameraSpeedChange}
            />
          </div>
          {!isMainCamera && (
            <div className="property-editor-row">
              <span className="property-editor-label">FOV</span>
              <Form.Control
                size="sm"
                type="number"
                min={1}
                max={179}
                value={Math.round(cameraFov)}
                onChange={onCameraFovChange}
              />
            </div>
          )}
        </SectionContainer>

        <SectionContainer name="Utilities" collapsible>
          <div className="property-editor-row">
            <span className="property-editor-label">Layout</span>
          </div>
          <Form.Select size="sm" value={selectedLayout} onChange={onLayoutSelectChange}>
            <option value={-1}>None</option>
            {layouts.map((lytKEY) => {
              return (
                <option key={lytKEY.resId} value={lytKEY.resId}>
                  {lytKEY.resRef}
                </option>
              );
            })}
          </Form.Select>
          <div className="button-group">
            <button className="btn btn-sm" onClick={onBtnLoadLayout}>
              Load
            </button>
            <button className="btn btn-sm" onClick={onBtnDisposeLayout}>
              Dispose
            </button>
          </div>
        </SectionContainer>

        <SectionContainer name="Keyframe Inspector" collapsible>
          <div className="property-editor-row">
            <span className="property-editor-label">Edit Mode</span>
            <span>{keyframeEditorEnabled ? 'On' : 'Off'}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">Track</span>
            <span>{selectedTrack?.label ?? 'None selected'}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">Key Index</span>
            <span>{selectedKeyIndex >= 0 ? selectedKeyIndex : 'None selected'}</span>
          </div>
          {selectedKey && (
            <>
              <div className="property-editor-row">
                <span className="property-editor-label">Time</span>
                <span>{selectedKey.time}</span>
              </div>
              <div className="property-editor-row">
                <span className="property-editor-label">X</span>
                <span>{selectedKey.x ?? 0}</span>
              </div>
              <div className="property-editor-row">
                <span className="property-editor-label">Y</span>
                <span>{selectedKey.y ?? 0}</span>
              </div>
              <div className="property-editor-row">
                <span className="property-editor-label">Z</span>
                <span>{selectedKey.z ?? 0}</span>
              </div>
              <div className="property-editor-row">
                <span className="property-editor-label">W/Value</span>
                <span>{selectedKey.w ?? selectedKey.value ?? 0}</span>
              </div>
            </>
          )}
          {!!selectedTrack?.isCameraHook && (
            <>
              <div className="property-editor-row">
                <span className="property-editor-label">Follow Hook Cam</span>
                <Form.Check type="switch" checked={followCameraHook} onChange={onFollowCameraHookChange} />
              </div>
            </>
          )}
        </SectionContainer>
      </div>
    </div>
  );
};
