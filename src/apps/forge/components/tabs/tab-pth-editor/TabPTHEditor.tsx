import React, { useEffect, useMemo, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { ModelViewerLayerKey, TabPTHEditorState } from "@/apps/forge/states/tabs";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { UI3DRendererView, MenuItem } from "@/apps/forge/components/UI3DRendererView";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowPointer, faCircle, faCircleNodes, faPlus } from "@fortawesome/free-solid-svg-icons";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { CameraView } from "@/apps/forge/UI3DRenderer";

const MODEL_VIEWER_LAYER_LABELS: Record<ModelViewerLayerKey, string> = {
  lights: 'Lights',
  emitters: 'Emitters',
  walkmeshes: 'Walkmeshes (AABB)',
  trimesh: 'Static meshes',
  skin: 'Skin meshes',
  dangly: 'Dangly meshes',
  saber: 'Lightsaber meshes',
  childModels: 'Child / reference models',
  layout: 'Layout (rooms)',
  ground: 'Ground grid',
};

const UI3DToolPalette = function (props: any) {
  const tab = props.tab as TabPTHEditorState;
  const [controlMode, setControlMode] = useState<any>(0);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffect(() => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  return (
    <div className="UI3DToolPalette" style={{ marginTop: '25px' }}>
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(0)}>
          <a title="Select Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faArrowPointer} size="lg" color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(1)}>
          <a title="Add Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircle} size="lg" color="green" />
              <FontAwesomeIcon icon={faPlus} size="sm" color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 2 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(2)}>
          <a title="Add Connection">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircleNodes} size="lg" color="yellow" />
              <FontAwesomeIcon icon={faPlus} size="sm" color="white" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
};

export const TabPTHEditor = function (props: BaseTabProps) {
  const tab: TabPTHEditorState = props.tab as TabPTHEditorState;
  const [layerMenuGen, setLayerMenuGen] = useState(0);

  useEffect(() => {
    const onLayers = () => setLayerMenuGen((g) => g + 1);
    tab.addEventListener('onModelViewerLayersChange', onLayers);
    return () => tab.removeEventListener('onModelViewerLayersChange', onLayers);
  }, [tab]);

  const layerToggle = (key: ModelViewerLayerKey): MenuItem => ({
    label: MODEL_VIEWER_LAYER_LABELS[key],
    checked: tab.modelViewerLayerVisibility[key],
    onClick: () => tab.toggleLayerVisibility(key),
  });

  const menuItems: MenuItem[] = useMemo(() => [
    {
      label: 'View',
      children: [
        {
          label: 'Wind Power',
          children: [
            { label: 'Off (0)', checked: tab.ui3DRenderer.windowPower === 0, onClick: () => tab.setWindPower(0) },
            { label: 'Weak (1)', checked: tab.ui3DRenderer.windowPower === 1, onClick: () => tab.setWindPower(1) },
            { label: 'Strong (2)', checked: tab.ui3DRenderer.windowPower === 2, onClick: () => tab.setWindPower(2) },
          ],
        },
        {
          label: 'Show',
          children: [
            layerToggle('lights'),
            layerToggle('emitters'),
            layerToggle('walkmeshes'),
            { separator: true },
            layerToggle('trimesh'),
            layerToggle('skin'),
            layerToggle('dangly'),
            layerToggle('saber'),
            { separator: true },
            layerToggle('childModels'),
            layerToggle('layout'),
            layerToggle('ground'),
          ],
        },
        {
          label: 'Camera',
          children: [
            { label: 'Fit Camera to Scene', onClick: () => tab.ui3DRenderer.fitCameraToScene() },
            { separator: true },
            { label: 'Top View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Top) },
            { label: 'Bottom View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Bottom) },
            { label: 'Left View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Left) },
            { label: 'Right View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Right) },
            { label: 'Front View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Front) },
            { label: 'Back View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Back) },
            { label: 'Isometric View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Orthogonal) },
            { label: 'Default View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Default) },
          ],
        },
      ],
    },
  ], [tab, layerMenuGen]);

  const eastPanel = (
    <>
      <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager} />
    </>
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
          <UI3DToolPalette tab={tab} />
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
