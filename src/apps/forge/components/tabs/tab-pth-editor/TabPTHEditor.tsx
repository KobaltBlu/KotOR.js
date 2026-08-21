import React, { useEffect, useMemo, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { ModelViewerLayerKey, TabPTHEditorState } from "@/apps/forge/states/tabs";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { UI3DRendererView, MenuItem } from "@/apps/forge/components/UI3DRendererView";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { MenuBar } from "@/apps/forge/components/common/MenuBar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowPointer, faCircle, faCircleNodes, faPlus } from "@fortawesome/free-solid-svg-icons";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { CameraView } from "@/apps/forge/UI3DRenderer";
import { useForgeHasGameData } from "@/apps/forge/helpers/useForgeHasGameData";
import { TabPTHMap2D } from "@/apps/forge/components/tabs/tab-pth-editor/TabPTHMap2D";
import "@/apps/forge/components/UI3DToolPalette.scss";

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

const PTHToolPalette = function(props: { tab: TabPTHEditorState }){
  const tab = props.tab;
  const [controlMode, setControlMode] = useState<number>(tab.controlMode);

  useEffect( () => {
    const onControlModeChange = () => {
      setControlMode(tab.controlMode);
    };
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  }, [tab]);

  return (
    <div className="UI3DToolPalette" style={{ marginTop: '25px' }}>
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={() => tab.setControlMode(0)}>
          <a title="Select Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faArrowPointer} size='lg' color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={() => tab.setControlMode(1)}>
          <a title="Add Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircle} size='lg' color="green" />
              <FontAwesomeIcon icon={faPlus} size='sm' color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 2 ? 'selected' : ''}`} onClick={() => tab.setControlMode(2)}>
          <a title="Add Connection">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircleNodes} size='lg' color="yellow" />
              <FontAwesomeIcon icon={faPlus} size='sm' color="white" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}

export const TabPTHEditor = function(props: BaseTabProps){
  const tab: TabPTHEditorState = props.tab as TabPTHEditorState;
  const hasGameData = useForgeHasGameData();
  const [layerMenuGen, setLayerMenuGen] = useState(0);
  const [historyGen, setHistoryGen] = useState(0);
  const [roomsLoaded, setRoomsLoaded] = useState(tab.roomsLoaded);

  useEffect(() => {
    const onLayers = () => setLayerMenuGen((g) => g + 1);
    tab.addEventListener('onModelViewerLayersChange', onLayers);
    return () => tab.removeEventListener('onModelViewerLayersChange', onLayers);
  }, [tab]);

  useEffect(() => {
    const onHistory = () => setHistoryGen((g) => g + 1);
    tab.addEventListener('onHistoryChanged', onHistory);
    return () => tab.removeEventListener('onHistoryChanged', onHistory);
  }, [tab]);

  useEffect(() => {
    const onRooms = () => setRoomsLoaded(tab.roomsLoaded);
    tab.addEventListener('onRoomsLoaded', onRooms);
    tab.addEventListener('onEditorFileLoad', onRooms);
    return () => {
      tab.removeEventListener('onRoomsLoaded', onRooms);
      tab.removeEventListener('onEditorFileLoad', onRooms);
    };
  }, [tab]);

  const layerToggle = (key: ModelViewerLayerKey): MenuItem => ({
    label: MODEL_VIEWER_LAYER_LABELS[key],
    checked: tab.modelViewerLayerVisibility[key],
    onClick: () => tab.toggleLayerVisibility(key),
  });

  const editMenu: MenuItem = {
    label: 'Edit',
    children: [
      {
        label: 'Undo',
        shortcut: formatKeybinding('Mod+Z'),
        onClick: () => tab.undo(),
        disabled: !tab.canUndo,
      },
      {
        label: 'Redo',
        shortcut: formatKeybinding('Mod+Y'),
        onClick: () => tab.redo(),
        disabled: !tab.canRedo,
      },
    ],
  };

  const menuItems: MenuItem[] = useMemo(() => {
    if (!roomsLoaded) {
      return [
        editMenu,
        {
          label: 'View',
          children: [
            { label: 'Fit to points', onClick: () => tab.fitPathMap?.() },
            { separator: true },
            {
              label: 'Load room models',
              disabled: !hasGameData,
              onClick: () => { void tab.loadRoomModels(); },
            },
          ],
        },
      ];
    }
    return [
      editMenu,
      {
        label: 'View',
        children: [
          { label: '2D map', onClick: () => tab.unloadRoomModels() },
          { separator: true },
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
    ];
  }, [tab, layerMenuGen, historyGen, roomsLoaded, hasGameData]);

  if (!roomsLoaded) {
    return (
      <LayoutContainerProvider>
        <LayoutContainer>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <MenuBar items={menuItems} variant="overlay" />
            <TabPTHMap2D tab={tab} />
            <PTHToolPalette tab={tab} />
          </div>
        </LayoutContainer>
      </LayoutContainerProvider>
    );
  }

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={<SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager} />}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
          <PTHToolPalette tab={tab} />
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
