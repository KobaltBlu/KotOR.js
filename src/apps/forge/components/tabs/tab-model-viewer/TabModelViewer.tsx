import React, { useEffect, useMemo, useState } from 'react';
import { LayoutContainerProvider } from '@/apps/forge/context/LayoutContainerContext';
import { LayoutContainer } from '@/apps/forge/components/LayoutContainer/LayoutContainer';
import { TabModelViewerControlMode, TabModelViewerState, type ModelViewerLayerKey } from '@/apps/forge/states/tabs';
import { KeyFrameTimelineComponent } from '@/apps/forge/components/KeyFrameTimelineComponent';
import { ModelViewerSidebarComponent } from '@/apps/forge/components/ModelViewerSidebarComponent';
import { UI3DOverlayComponent } from '@/apps/forge/components/UI3DOverlayComponent';
import { UI3DRendererView, MenuItem } from '@/apps/forge/components/UI3DRendererView';
import { CameraView } from '@/apps/forge/UI3DRenderer';

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

export const TabModelViewer = function (props: any) {
  const tab: TabModelViewerState = props.tab as TabModelViewerState;
  const [layerMenuGen, setLayerMenuGen] = useState(0);
  const [controlMode, setControlMode] = useState<TabModelViewerControlMode>(tab.controlMode);

  useEffect(() => {
    const onLayers = () => setLayerMenuGen((g) => g + 1);
    tab.addEventListener('onModelViewerLayersChange', onLayers);
    return () => tab.removeEventListener('onModelViewerLayersChange', onLayers);
  }, [tab]);

  useEffect(() => {
    const onControlMode = () => setControlMode(tab.controlMode);
    tab.addEventListener('onControlModeChange', onControlMode);
    return () => tab.removeEventListener('onControlModeChange', onControlMode);
  }, [tab]);

  const layerToggle = (key: ModelViewerLayerKey): MenuItem => ({
    label: MODEL_VIEWER_LAYER_LABELS[key],
    checked: tab.modelViewerLayerVisibility[key],
    onClick: () => tab.toggleLayerVisibility(key),
  });

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        label: 'File',
        children: [
          {
            label: 'Extract Model Assets',
            onClick: () => tab.extractModelAssets(),
          },
          {
            label: 'Export MDL as ASCII…',
            onClick: () => tab.exportOdysseyModelAscii(),
          },
        ],
      },
      {
        label: 'Edit',
        children: [
          { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => tab.undo(), disabled: !tab.canUndo },
          { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => tab.redo(), disabled: !tab.canRedo },
        ],
      },
      {
        label: 'View',
        children: [
          {
            label: 'Wind Power',
            children: [
              {
                label: 'Off (0)',
                checked: tab.ui3DRenderer.windowPower === 0,
                onClick: () => tab.setWindPower(0),
              },
              {
                label: 'Weak (1)',
                checked: tab.ui3DRenderer.windowPower === 1,
                onClick: () => tab.setWindPower(1),
              },
              {
                label: 'Strong (2)',
                checked: tab.ui3DRenderer.windowPower === 2,
                onClick: () => tab.setWindPower(2),
              },
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
    ],
    [tab, layerMenuGen]
  );

  const southPanel = <KeyFrameTimelineComponent tab={tab} />;

  const eastPanel = <ModelViewerSidebarComponent tab={tab} />;

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel} eastSize={340}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
        <div className="UI3DToolPalette" style={{ marginTop: '25px' }}>
          <ul>
            <li
              className={`${controlMode === TabModelViewerControlMode.SELECT ? 'selected' : ''}`}
              onClick={() => tab.setControlMode(TabModelViewerControlMode.SELECT)}
            >
              <a title="Select Mode">
                <i className="fa-solid fa-arrow-pointer"></i>
              </a>
            </li>
            <li
              className={`${controlMode === TabModelViewerControlMode.TRANSLATE ? 'selected' : ''}`}
              onClick={() => tab.setControlMode(TabModelViewerControlMode.TRANSLATE)}
            >
              <a title="Translate Mode">
                <i className="fa-solid fa-up-down-left-right"></i>
              </a>
            </li>
            <li
              className={`${controlMode === TabModelViewerControlMode.ROTATE ? 'selected' : ''}`}
              onClick={() => tab.setControlMode(TabModelViewerControlMode.ROTATE)}
            >
              <a title="Rotate Mode">
                <i className="fa-solid fa-rotate"></i>
              </a>
            </li>
          </ul>
        </div>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
