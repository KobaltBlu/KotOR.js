import React, { useEffect, useMemo, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { ModelViewerLayerKey, TabPTHEditorState } from "@/apps/forge/states/tabs";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { UI3DRendererView, MenuItem } from "@/apps/forge/components/UI3DRendererView";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { MenuBar } from "@/apps/forge/components/common/MenuBar";
import {
  faArrowPointer,
  faCircle,
  faCircleNodes,
  faExpand,
  faHand,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { CameraView } from "@/apps/forge/UI3DRenderer";
import { useForgeHasGameData } from "@/apps/forge/helpers/useForgeHasGameData";
import { TabPTHMap2D } from "@/apps/forge/components/tabs/tab-pth-editor/TabPTHMap2D";
import { UI3DToolPalette, Tool } from "@/apps/forge/components/UI3DToolPalette";
import { TabPTHEditorControlMode } from "@/apps/forge/states/tabs/TabPTHEditorState";

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

function createPthTools(
  tab: TabPTHEditorState,
  controlMode: TabPTHEditorControlMode,
  selectedPointIndex: number,
  setControlMode: (mode: TabPTHEditorControlMode) => void,
): Tool[] {
  const setMode = (mode: TabPTHEditorControlMode) => {
    tab.setControlMode(mode);
    setControlMode(mode);
  };

  return [
    {
      id: 'select',
      label: 'Select',
      icon: faArrowPointer,
      iconColor: 'white',
      title: 'Select Point (Esc)',
      active: controlMode === TabPTHEditorControlMode.SELECT,
      onClick: () => setMode(TabPTHEditorControlMode.SELECT),
    },
    {
      id: 'add-point',
      label: 'Add Point',
      icon: faCircle,
      iconColor: 'green',
      title: 'Add Point',
      active: controlMode === TabPTHEditorControlMode.ADD_POINT,
      onClick: () => setMode(TabPTHEditorControlMode.ADD_POINT),
    },
    {
      id: 'add-connection',
      label: 'Add Connection',
      icon: faCircleNodes,
      iconColor: 'yellow',
      title: 'Add / Remove Connection (click two points)',
      active: controlMode === TabPTHEditorControlMode.ADD_CONNECTION,
      onClick: () => setMode(TabPTHEditorControlMode.ADD_CONNECTION),
    },
    {
      id: 'pan',
      label: 'Pan',
      icon: faHand,
      iconColor: 'white',
      title: 'Pan (Space + drag, or Middle Mouse)',
      active: controlMode === TabPTHEditorControlMode.PAN,
      onClick: () => setMode(TabPTHEditorControlMode.PAN),
    },
    {
      id: 'fit',
      label: 'Fit',
      icon: faExpand,
      iconColor: 'cyan',
      title: 'Fit to points',
      onClick: () => {
        if (tab.roomsLoaded) {
          tab.ui3DRenderer.fitCameraToScene();
        } else {
          tab.fitPathMap?.();
        }
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: faTrash,
      iconColor: 'tomato',
      title: 'Delete Selected Point (Del)',
      disabled: selectedPointIndex < 0,
      onClick: () => tab.deleteSelectedPoint(),
    },
  ];
}

const PTHToolPalette = function(props: { tab: TabPTHEditorState }){
  const tab = props.tab;
  const [controlMode, setControlMode] = useState<TabPTHEditorControlMode>(tab.controlMode);
  const [selectedPointIndex, setSelectedPointIndex] = useState(tab.selectedPointIndex);

  useEffect(() => {
    const onControlModeChange = () => {
      setControlMode(tab.controlMode);
      setSelectedPointIndex(tab.selectedPointIndex);
    };
    const onPathChanged = () => setSelectedPointIndex(tab.selectedPointIndex);
    tab.addEventListener('onControlModeChange', onControlModeChange);
    tab.addEventListener('onPathChanged', onPathChanged);
    tab.addEventListener('onHistoryChanged', onPathChanged);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
      tab.removeEventListener('onPathChanged', onPathChanged);
      tab.removeEventListener('onHistoryChanged', onPathChanged);
    };
  }, [tab]);

  const tools = useMemo(
    () => createPthTools(tab, controlMode, selectedPointIndex, setControlMode),
    [tab, controlMode, selectedPointIndex],
  );

  const activeToolId =
    controlMode === TabPTHEditorControlMode.SELECT ? 'select' :
    controlMode === TabPTHEditorControlMode.ADD_POINT ? 'add-point' :
    controlMode === TabPTHEditorControlMode.ADD_CONNECTION ? 'add-connection' :
    controlMode === TabPTHEditorControlMode.PAN ? 'pan' :
    undefined;

  return (
    <UI3DToolPalette
      tools={tools}
      activeToolId={activeToolId}
    />
  );
};

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

  const fileMenu: MenuItem = {
    label: 'File',
    children: [
      {
        label: 'Save',
        shortcut: formatKeybinding('Mod+S'),
        onClick: () => { void tab.save(); },
      },
      {
        label: 'Save As...',
        shortcut: formatKeybinding('Mod+Shift+S'),
        onClick: () => { void tab.saveAs(); },
      },
    ],
  };

  const menuItems: MenuItem[] = useMemo(() => {
    const windPowerMenu: MenuItem = {
      label: 'Wind Power',
      disabled: !roomsLoaded,
      children: [
        { label: 'Off (0)', checked: tab.ui3DRenderer.windowPower === 0, onClick: () => tab.setWindPower(0), disabled: !roomsLoaded },
        { label: 'Weak (1)', checked: tab.ui3DRenderer.windowPower === 1, onClick: () => tab.setWindPower(1), disabled: !roomsLoaded },
        { label: 'Strong (2)', checked: tab.ui3DRenderer.windowPower === 2, onClick: () => tab.setWindPower(2), disabled: !roomsLoaded },
      ],
    };

    const showMenu: MenuItem = {
      label: 'Show',
      disabled: !roomsLoaded,
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
    };

    const cameraMenu: MenuItem = {
      label: 'Camera',
      disabled: !roomsLoaded,
      children: [
        { label: 'Fit Camera to Scene', onClick: () => tab.ui3DRenderer.fitCameraToScene(), disabled: !roomsLoaded },
        { separator: true },
        { label: 'Top View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Top), disabled: !roomsLoaded },
        { label: 'Bottom View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Bottom), disabled: !roomsLoaded },
        { label: 'Left View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Left), disabled: !roomsLoaded },
        { label: 'Right View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Right), disabled: !roomsLoaded },
        { label: 'Front View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Front), disabled: !roomsLoaded },
        { label: 'Back View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Back), disabled: !roomsLoaded },
        { label: 'Isometric View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Orthogonal), disabled: !roomsLoaded },
        { label: 'Default View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Default), disabled: !roomsLoaded },
      ],
    };

    return [
      fileMenu,
      editMenu,
      {
        label: 'View',
        children: [
          {
            label: 'Fit to points',
            onClick: () => tab.fitPathMap?.(),
            disabled: roomsLoaded,
          },
          {
            label: 'Fit Camera to Scene',
            onClick: () => tab.ui3DRenderer.fitCameraToScene(),
            disabled: !roomsLoaded,
          },
          { separator: true },
          {
            label: '2D Map',
            checked: !roomsLoaded,
            onClick: () => {
              if (roomsLoaded) tab.unloadRoomModels();
            },
          },
          {
            label: '3D Rooms',
            checked: roomsLoaded,
            disabled: !hasGameData && !roomsLoaded,
            onClick: () => {
              if (!roomsLoaded) void tab.loadRoomModels();
            },
          },
          { separator: true },
          windPowerMenu,
          showMenu,
          cameraMenu,
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
