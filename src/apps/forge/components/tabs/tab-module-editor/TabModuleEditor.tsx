import React, { useEffect, useCallback, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { TabModuleEditorState, GameObjectType, TabModuleEditorControlMode } from "@/apps/forge/states/tabs";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { ModuleEditorSidebarComponent } from "@/apps/forge/components/ModuleEditorSidebarComponent";
import { useContextMenu, ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { UI3DToolPalette, Tool, SubTool } from "@/apps/forge/components/UI3DToolPalette";
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
  faLocationPin,
  faCube
} from "@fortawesome/free-solid-svg-icons";

import * as KotOR from "@/apps/forge/KotOR";
import "@/apps/forge/components/tabs/tab-module-editor/TabModuleEditor.scss";
import "@/apps/forge/components/tabs/tab-module-editor/ModulePreviewHost.scss";

// Extended interface for game object items with icons (for context menu)
interface GameObjectMenuItem extends ContextMenuItem {
  icon?: any;
  iconColor?: string;
}

// Shared game object type items for context menu
// Icons match those used in SceneGraphTreeViewManager.ts
const getGameObjectTypeItems = (tab: TabModuleEditorState): GameObjectMenuItem[] => [
  {
    id: 'add-room',
    label: 'Room',
    icon: faCube,
    iconColor: '#a0a0a0',
    onClick: () => {
      tab.openAddRoomBrowser();
    }
  },
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
      title: 'Select (Q)',
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
      title: 'Translate (W)',
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
      title: 'Rotate (E)',
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
  const previewHostRef = useRef<HTMLDivElement>(null);
  const [controlMode, setControlMode] = useState<TabModuleEditorControlMode>(TabModuleEditorControlMode.SELECT);
  const [previewMode, setPreviewMode] = useState(tab.tabMode === ModuleEditorTabMode.PREVIEW);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewStage, setPreviewStage] = useState('');
  const [skippedNss, setSkippedNss] = useState<string[]>([]);
  const [nssDismissed, setNssDismissed] = useState(false);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffect(() => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  }, [tab]);

  useEffect(() => {
    const onPreview = (enabled: boolean) => {
      setPreviewMode(!!enabled);
      if(!enabled){
        setPreviewBusy(false);
        setPreviewStage('');
      }
    };
    const onProgress = (stage: string, detail: string) => {
      setPreviewBusy(stage !== 'ready' && stage !== 'failed');
      setPreviewStage(detail || stage);
    };
    const onSkipped = (list: string[]) => {
      setSkippedNss(Array.isArray(list) ? list : []);
      setNssDismissed(false);
    };
    tab.addEventListener('onPreviewModeChange', onPreview);
    tab.addEventListener('onPreviewProgress', onProgress);
    tab.addEventListener('onPreviewSkippedNss', onSkipped);
    setPreviewMode(tab.tabMode === ModuleEditorTabMode.PREVIEW);
    return () => {
      tab.removeEventListener('onPreviewModeChange', onPreview);
      tab.removeEventListener('onPreviewProgress', onProgress);
      tab.removeEventListener('onPreviewSkippedNss', onSkipped);
    };
  }, [tab]);

  useEffect(() => {
    tab.setPreviewHostElement(previewHostRef.current);
    return () => {
      tab.setPreviewHostElement(undefined);
    };
  }, [tab]);

  // Attach context menu handler to canvas when it's available
  useEffect(() => {
    if (!tab.ui3DRenderer || previewMode) return;

    let canvas: HTMLCanvasElement | undefined;
    let cleanup: (() => void) | undefined;
    let rightMouseDownPos: { x: number; y: number } | null = null;
    let isRightDragging = false;
    const DRAG_THRESHOLD = 5;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        rightMouseDownPos = { x: e.clientX, y: e.clientY };
        isRightDragging = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
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
              onClick: () => { void tab.deleteSelectedGameObject(); }
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
              onClick: () => { tab.cloneGameObject(tab.selectedGameObject!); }
            },
            {
              id: 'set-entry-from-selection',
              label: 'Set Entry From Selection',
              onClick: () => {
                tab.setEntryFromSelection();
                tab.updateFile();
              }
            }
          ]
        });
      }

      showContextMenu(e.clientX, e.clientY, contextMenuItems);
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

    if (tab.ui3DRenderer.canvas) {
      setupHandler();
    }
    const onCanvasAttached = () => { setupHandler(); };
    tab.ui3DRenderer.addEventListener('onCanvasAttached', onCanvasAttached);
    return () => {
      if (cleanup) cleanup();
      tab.ui3DRenderer?.removeEventListener('onCanvasAttached', onCanvasAttached);
    };
  }, [tab, showContextMenu, previewMode]);

  const eastPanel = (
    <ModuleEditorSidebarComponent tab={tab} />
  );

  return (
    <div className="tab-module-editor">
      <LayoutContainerProvider>
        <LayoutContainer eastContent={eastPanel} eastSize={350}>
          <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', display: previewMode ? 'none' : 'block' }}>
              <UI3DRendererView context={tab.ui3DRenderer}>
                <UI3DOverlayComponent context={tab.ui3DRenderer} tab={tab} />
                <UI3DToolPalette
                  tools={createTools(tab, controlMode)}
                  activeToolId={
                    controlMode === TabModuleEditorControlMode.SELECT ? 'select' :
                    controlMode === TabModuleEditorControlMode.TRANSFORM_CONTROL ? 'translate' :
                    controlMode === TabModuleEditorControlMode.ROTATE_CONTROL ? 'rotate' :
                    controlMode === TabModuleEditorControlMode.SCALE_CONTROL ? 'scale' :
                    controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT ? 'add-game-object' :
                    undefined
                  }
                  onToolChange={() => {}}
                />
              </UI3DRendererView>
            </div>
            <div
              ref={previewHostRef}
              className={`module-preview-host${previewMode ? ' is-active' : ''}`}
              style={{ display: previewMode ? 'block' : 'none' }}
            >
              <div className="module-preview-host__chrome">
                <span>
                  {previewBusy
                    ? (previewStage || 'Loading playable preview…')
                    : `Playable Preview (${tab.previewSpawnMode}) — Esc to exit`}
                </span>
                <span className="module-preview-host__chrome-actions">
                  <button
                    type="button"
                    className="module-preview-host__exit"
                    disabled={previewBusy}
                    title="Re-pack and reload without tearing down the renderer"
                    onClick={() => {
                      setPreviewBusy(true);
                      void tab.warmReloadPlayablePreview().finally(() => setPreviewBusy(false));
                    }}
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    className="module-preview-host__exit"
                    disabled={previewBusy}
                    onClick={() => {
                      setPreviewBusy(true);
                      void tab.stopPlayablePreview().finally(() => setPreviewBusy(false));
                    }}
                  >
                    Exit Preview
                  </button>
                </span>
              </div>
              {!nssDismissed && skippedNss.length > 0 && (
                <div className="module-preview-host__nss-warn">
                  <span>
                    Skipped uncompiled NSS ({skippedNss.length}): {skippedNss.slice(0, 6).join(', ')}
                    {skippedNss.length > 6 ? '…' : ''}
                  </span>
                  <button type="button" onClick={() => setNssDismissed(true)}>Dismiss</button>
                </div>
              )}
            </div>
          </div>
          {ContextMenuComponent}
        </LayoutContainer>
      </LayoutContainerProvider>
    </div>
  )
}

