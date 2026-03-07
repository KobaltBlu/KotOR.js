import React, { useEffect, useCallback, useRef, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { TabModuleEditorState, GameObjectType, TabModuleEditorControlMode } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";
import { ModuleEditorSidebarComponent } from "../../ModuleEditorSidebarComponent";
import { useContextMenu, ContextMenuItem } from "../../common/ContextMenu";
import { UI3DToolPalette, Tool, SubTool } from "../../UI3DToolPalette";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowPointer, 
  faArrowsRotate, 
  faArrowsUpDownLeftRight, 
  faSquarePlus,
  faVideo,
  faUser,
  faDoorOpen,
  faPaw,
  faWandSparkles,
  faToolbox,
  faMusic,
  faStore,
  faTriangleExclamation,
  faLocationPin
} from "@fortawesome/free-solid-svg-icons";

import * as KotOR from "../../../KotOR";

// Extended interface for game object items with icons (for context menu)
interface GameObjectMenuItem extends ContextMenuItem {
  icon?: any;
  iconColor?: string;
}

// Shared game object type items for context menu
// Icons match those used in SceneGraphTreeViewManager.ts
const getGameObjectTypeItems = (tab: TabModuleEditorState): GameObjectMenuItem[] => [
  {
    id: 'add-camera',
    label: 'Camera',
    icon: faVideo, // fa-solid fa-video
    iconColor: '#ff6b6b',
    onClick: () => {
      tab.setGameObjectControlOptions(GameObjectType.CAMERA, '', KotOR.ResourceTypes.NA);
    }
  },
  {
    id: 'add-creature',
    label: 'Creature',
    icon: faUser, // fa-solid fa-person
    iconColor: '#4ecdc4',
    onClick: () => {
      tab.openBlueprintBrowserForType('utc');
    }
  },
  {
    id: 'add-door',
    label: 'Door',
    icon: faDoorOpen, // fa-solid fa-door-open
    iconColor: '#ffe66d',
    onClick: () => {
      tab.openBlueprintBrowserForType('utd');
    }
  },
  {
    id: 'add-encounter',
    label: 'Encounter',
    icon: faPaw, // fa-solid fa-paw
    iconColor: '#ff6b9d',
    onClick: () => {
      tab.openBlueprintBrowserForType('ute');
    }
  },
  {
    id: 'add-item',
    label: 'Item',
    icon: faWandSparkles, // fa-solid fa-wand-sparkles
    iconColor: '#95e1d3',
    onClick: () => {
      tab.openBlueprintBrowserForType('uti');
    }
  },
  {
    id: 'add-placeable',
    label: 'Placeable',
    icon: faToolbox, // fa-solid fa-toolbox
    iconColor: '#a8e6cf',
    onClick: () => {
      tab.openBlueprintBrowserForType('utp');
    }
  },
  {
    id: 'add-store',
    label: 'Store',
    icon: faStore, // fa-solid fa-store
    iconColor: '#ffd93d',
    onClick: () => {
      tab.openBlueprintBrowserForType('utm');
    }
  },
  {
    id: 'add-sound',
    label: 'Sound',
    icon: faMusic, // fa-solid fa-music
    iconColor: '#6c5ce7',
    onClick: () => {
      tab.openBlueprintBrowserForType('uts');
    }
  },
  {
    id: 'add-trigger',
    label: 'Trigger',
    icon: faTriangleExclamation, // fa-solid fa-triangle-exclamation
    iconColor: '#feca57',
    onClick: () => {
      tab.openBlueprintBrowserForType('utt');
    }
  },
  {
    id: 'add-waypoint',
    label: 'Waypoint',
    icon: faLocationPin, // fa-solid fa-location-pin
    iconColor: '#48dbfb',
    onClick: () => {
      tab.openBlueprintBrowserForType('utw');
    }
  }
];

// Convert game object items to SubTool format for tool palette
const getGameObjectSubTools = (tab: TabModuleEditorState): SubTool[] => {
  const items = getGameObjectTypeItems(tab);
  return items.map(item => ({
    id: item.id,
    label: item.label || '',
    icon: item.icon,
    iconColor: item.iconColor,
    onClick: item.onClick || (() => {})
  }));
};

// Create tools configuration for the tool palette
const createTools = (tab: TabModuleEditorState, controlMode: TabModuleEditorControlMode): Tool[] => {
  const gameObjectSubTools = getGameObjectSubTools(tab);
  
  return [
    {
      id: 'select',
      label: 'Select',
      icon: faArrowPointer,
      iconColor: 'white',
      title: 'Select',
      active: controlMode === TabModuleEditorControlMode.SELECT,
      onClick: () => {
        tab.setControlMode(TabModuleEditorControlMode.SELECT);
      }
    },
    {
      id: 'translate',
      label: 'Translate',
      icon: faArrowsUpDownLeftRight,
      iconColor: 'red',
      title: 'Translate',
      active: controlMode === TabModuleEditorControlMode.TRANSFORM_CONTROL,
      onClick: () => {
        tab.setControlMode(TabModuleEditorControlMode.TRANSFORM_CONTROL);
      }
    },
    {
      id: 'rotate',
      label: 'Rotate',
      icon: faArrowsRotate,
      iconColor: 'green',
      title: 'Rotate',
      active: controlMode === TabModuleEditorControlMode.ROTATE_CONTROL,
      onClick: () => {
        tab.setControlMode(TabModuleEditorControlMode.ROTATE_CONTROL);
      }
    },
    {
      id: 'add-game-object',
      label: 'Add Game Object',
      icon: faSquarePlus,
      iconColor: 'cyan',
      title: 'Add Game Object',
      active: controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT,
      subTools: gameObjectSubTools
    }
  ];
};

export const TabModuleEditor = function(props: BaseTabProps){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlMode, setControlMode] = useState<TabModuleEditorControlMode>(TabModuleEditorControlMode.SELECT);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffect(() => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  }, [tab]);

  const onModuleLoaded = () => {
    console.log('module loaded');
  }

  useEffect(() => {
    tab.addEventListener('onModuleLoaded', onModuleLoaded);
    return () => {
      tab.removeEventListener('onModuleLoaded', onModuleLoaded);
    };
  }, []);

  // Attach context menu handler to canvas when it's available
  useEffect(() => {
    if (!tab.ui3DRenderer) return;

    let canvas: HTMLCanvasElement | undefined;
    let cleanup: (() => void) | undefined;
    
    // Track right-click dragging state
    let rightMouseDownPos: { x: number; y: number } | null = null;
    let isRightDragging = false;
    const DRAG_THRESHOLD = 5; // pixels

    const handleMouseDown = (e: MouseEvent) => {
      // Track right mouse button down
      if (e.button === 2) { // Right mouse button
        rightMouseDownPos = { x: e.clientX, y: e.clientY };
        isRightDragging = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Check if we're dragging with right mouse button
      if (rightMouseDownPos && e.buttons === 2) {
        const dx = Math.abs(e.clientX - rightMouseDownPos.x);
        const dy = Math.abs(e.clientY - rightMouseDownPos.y);
        
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          isRightDragging = true;
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't show context menu if we were dragging
      if (isRightDragging) {
        rightMouseDownPos = null;
        isRightDragging = false;
        return true;
      }

      const gameObjectTypeItems = getGameObjectTypeItems(tab);

      const contextMenuItems: ContextMenuItem[] = [
        {
          id: 'add-game-object',
          label: 'Add Game Object',
          submenu: gameObjectTypeItems
        }
      ];

      if(tab.selectedGameObject){
        contextMenuItems.push({
          id: 'selected-game-object',
          label: 'Selected Object',
          submenu: [
            {
              id: 'delete-game-object',
              label: 'Delete',
              onClick: () => {
                tab.module?.area?.detachObject(tab.selectedGameObject!);
                tab.selectGameObject(undefined);
              }
            },
            {
              id: 'focus-game-object',
              label: 'Focus',
              onClick: () => {
                tab.ui3DRenderer.lookAtObject(tab.selectedGameObject?.container!);
              }
            },
            {
              id: 'duplicate-game-object',
              label: 'Duplicate',
              onClick: () => {
                tab.cloneGameObject(tab.selectedGameObject!);
              }
            }
          ]
        });
      }

      showContextMenu(e.clientX, e.clientY, contextMenuItems);
      
      // Reset tracking after showing menu
      rightMouseDownPos = null;
      isRightDragging = false;
      return true;
    };

    const setupHandler = () => {
      if (tab.ui3DRenderer?.canvas) {
        canvas = tab.ui3DRenderer.canvas;
        canvas.addEventListener('contextmenu', handleContextMenu);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        cleanup = () => {
          if (canvas) {
            canvas.removeEventListener('contextmenu', handleContextMenu);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
          }
        };
      }
    };

    // If canvas is already attached, set up handler immediately
    if (tab.ui3DRenderer.canvas) {
      setupHandler();
    }

    // Also listen for canvas attachment event
    const onCanvasAttached = () => {
      setupHandler();
    };
    tab.ui3DRenderer.addEventListener('onCanvasAttached', onCanvasAttached);
    
    return () => {
      if (cleanup) {
        cleanup();
      }
      tab.ui3DRenderer?.removeEventListener('onCanvasAttached', onCanvasAttached);
    };
  }, [tab, showContextMenu]);

  const eastPanel = (
    <ModuleEditorSidebarComponent tab={tab} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel} eastSize={350}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
          <UI3DRendererView context={tab.ui3DRenderer}>
            <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
            <UI3DToolPalette 
              tools={createTools(tab, controlMode)}
              activeToolId={
                controlMode === TabModuleEditorControlMode.SELECT ? 'select' :
                controlMode === TabModuleEditorControlMode.TRANSFORM_CONTROL ? 'translate' :
                controlMode === TabModuleEditorControlMode.ROTATE_CONTROL ? 'rotate' :
                controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT ? 'add-game-object' :
                undefined
              }
              onToolChange={(toolId) => {
                // Tool change is handled by onClick in the tool definition
              }}
            />
          </UI3DRendererView>
        </div>
        {ContextMenuComponent}
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

