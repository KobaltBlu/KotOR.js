import React, { useEffect, useLayoutEffect, useCallback, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { GameObjectType, TabModuleEditorControlMode } from "@/apps/forge/states/tabs/TabModuleEditorTypes";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import { CAMERA_VIEW_PRESETS } from "@/apps/forge/UI3DRenderer";
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
  faCube,
  faCamera,
  faExpand,
} from "@fortawesome/free-solid-svg-icons";

import * as KotOR from "@/apps/forge/KotOR";
import "@/apps/forge/components/tabs/tab-module-editor/TabModuleEditor.scss";
import "@/apps/forge/components/tabs/tab-module-editor/ModulePreviewHost.scss";
import { ModuleViewportToolbar } from "@/apps/forge/components/tabs/tab-module-editor/ModuleViewportToolbar";
import { ModuleProblemsPanel } from "@/apps/forge/components/tabs/tab-module-editor/ModuleProblemsPanel";
import { ModuleAssetBrowserPanel } from "@/apps/forge/components/tabs/tab-module-editor/ModuleAssetBrowserPanel";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { forgeModuleSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import type { ScreenRect } from "@/apps/forge/module-editor/kernel/PickService";
import { describeSelection } from "@/apps/forge/module-editor/a11y/moduleEditorA11y";
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
  const cameraViewSubTools: SubTool[] = [
    {
      id: 'fit-scene',
      label: 'Fit Scene (Shift+F)',
      icon: faExpand,
      iconColor: 'white',
      onClick: () => { tab.ui3DRenderer.frameAll(); },
    },
    ...CAMERA_VIEW_PRESETS.map((preset) => ({
      id: `view-${preset.view}`,
      label: `${preset.label} (${preset.shortcut})`,
      icon: faCamera,
      iconColor: 'white',
      onClick: () => { tab.ui3DRenderer.reorientCamera(preset.view); },
    })),
  ];
  
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
      id: 'camera-view',
      label: 'Camera View',
      icon: faCamera,
      iconColor: 'white',
      title: 'Camera View Presets (1–7, 0)',
      subTools: cameraViewSubTools,
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
  const [controlMode, setControlMode] = useState<TabModuleEditorControlMode>(tab.controlMode);
  const [previewMode, setPreviewMode] = useState(tab.tabMode === ModuleEditorTabMode.PREVIEW);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewStage, setPreviewStage] = useState('');
  const [skippedNss, setSkippedNss] = useState<string[]>([]);
  const [nssDismissed, setNssDismissed] = useState(false);
  const [workbench] = useState(() => forgeModuleSettings.get().workbenchEnabled);
  const [workspace, setWorkspace] = useState(() => tab.getWorkspace());
  const [marquee, setMarquee] = useState<ScreenRect | null>(null);
  const [westPanel, setWestPanel] = useState<"hierarchy" | "assets">(workspace.layout.westPanel);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("Nothing selected");

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffect(() => {
    const onSelection = (gameObject: any) => {
      const count = tab.selectedGameObjects?.length || (gameObject ? 1 : 0);
      const label = gameObject?.tag || gameObject?.templateResRef || gameObject?.roomName || undefined;
      setSelectionAnnouncement(describeSelection(count, label));
    };
    tab.addEventListener("onSelectionChanged", onSelection);
    onSelection(tab.selectedGameObject);
    return () => tab.removeEventListener("onSelectionChanged", onSelection);
  }, [tab]);

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

  // After exiting preview, restore canvas size and restart the editor render loop.
  useLayoutEffect(() => {
    if(previewMode){
      return;
    }
    tab.ui3DRenderer.syncSizeFromParent();
    tab.ui3DRenderer.setEnabled(true);
  }, [previewMode, tab]);

  useEffect(() => {
    tab.setPreviewHostElement(previewHostRef.current);
    return () => {
      tab.setPreviewHostElement(undefined);
    };
  }, [tab]);

  useEffect(() => {
    const onWorkspace = (next: any) => setWorkspace(next);
    const onMarquee = (rect: ScreenRect | null) => setMarquee(rect);
    tab.addEventListener("onWorkspaceChanged", onWorkspace);
    tab.addEventListener("onMarqueeChanged", onMarquee);
    return () => {
      tab.removeEventListener("onWorkspaceChanged", onWorkspace);
      tab.removeEventListener("onMarqueeChanged", onMarquee);
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
                tab.focusSelection();
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
            },
            ...(tab.selectedGameObject instanceof ForgeWaypoint ? [
              {
                id: 'clone-waypoint-at-entry',
                label: 'Clone Waypoint At Entry',
                onClick: () => { tab.placeWaypointAtEntry(); }
              },
              {
                id: 'pin-preview-warp',
                label: 'Pin As Preview Warp',
                onClick: () => { tab.setPreviewWarpFromSelection(); }
              },
            ] : []),
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

  const westPanelContent = workbench ? (
    <div className="module-workbench-west">
      <div className="module-workbench-west__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={westPanel === "assets"}
          className={westPanel === "assets" ? "is-active" : ""}
          onClick={() => {
            setWestPanel("assets");
            tab.patchWorkspace({ layout: { ...workspace.layout, westPanel: "assets" } });
          }}
        >
          Assets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={westPanel === "hierarchy"}
          className={westPanel === "hierarchy" ? "is-active" : ""}
          onClick={() => {
            setWestPanel("hierarchy");
            tab.patchWorkspace({ layout: { ...workspace.layout, westPanel: "hierarchy" } });
          }}
        >
          Hierarchy
        </button>
      </div>
      <div className="module-workbench-west__body">
        {westPanel === "assets" ? (
          <ModuleAssetBrowserPanel tab={tab} />
        ) : (
          <div className="module-workbench-west__hierarchy" data-trask-target="module-hierarchy">
            {tab.ui3DRenderer?.sceneGraphManager ? (
              <SceneGraphTreeView
                manager={tab.ui3DRenderer.sceneGraphManager}
                tab={tab}
                listStyle={{ height: "100%" }}
              />
            ) : (
              <div className="module-workbench-west__hierarchy-hint">
                Hierarchy will appear once the scene is ready.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : undefined;

  const southPanel = workbench && forgeModuleSettings.get().showProblemsPanel ? (
    <ModuleProblemsPanel tab={tab} />
  ) : undefined;

  const onViewportDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-forge-asset")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onViewportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-forge-asset");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { resref: string; extension: string };
      const typeMap: Record<string, GameObjectType> = {
        utc: GameObjectType.CREATURE,
        utd: GameObjectType.DOOR,
        ute: GameObjectType.ENCOUNTER,
        uti: GameObjectType.ITEM,
        utm: GameObjectType.STORE,
        utp: GameObjectType.PLACEABLE,
        uts: GameObjectType.SOUND,
        utt: GameObjectType.TRIGGER,
        utw: GameObjectType.WAYPOINT,
      };
      const type = typeMap[payload.extension];
      if (!type) return;
      tab.setGameObjectControlOptions(type, payload.resref, tab.getResourceTypeForGameObjectType(type));
      tab.assetIndex.touchRecent(payload.resref);
    } catch (error) {
      console.warn("Failed to handle asset drop", error);
    }
  };

  const onMarqueeMouseDown = (e: React.MouseEvent) => {
    if (!workbench || !forgeModuleSettings.get().marqueeSelect) return;
    if (e.button !== 0 || e.altKey) return;
    if (controlMode !== TabModuleEditorControlMode.SELECT) return;
    const canvas = tab.ui3DRenderer?.canvas;
    if (!canvas || !(e.target === canvas || canvas.contains(e.target as Node))) return;
    const bounds = canvas.getBoundingClientRect();
    tab.beginMarquee(e.clientX - bounds.left, e.clientY - bounds.top);
  };

  const onMarqueeMouseMove = (e: React.MouseEvent) => {
    const canvas = tab.ui3DRenderer?.canvas;
    if (!canvas || !marquee) return;
    const bounds = canvas.getBoundingClientRect();
    tab.updateMarquee(e.clientX - bounds.left, e.clientY - bounds.top);
  };

  const onMarqueeMouseUp = (e: React.MouseEvent | MouseEvent) => {
    if (!marquee) return;
    tab.completeMarquee(!!e.shiftKey);
  };

  useEffect(() => {
    if (!marquee) return;
    const onWindowMouseUp = (e: MouseEvent) => {
      tab.completeMarquee(!!e.shiftKey);
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [marquee, tab]);

  return (
    <div className={`tab-module-editor${workbench ? " tab-module-editor--workbench" : ""}`}>
      <div className="sr-only" aria-live="polite">{selectionAnnouncement}</div>
      <LayoutContainerProvider>
        <LayoutContainer
          eastContent={eastPanel}
          eastSize={workspace.layout.eastSize}
          onEastSizeChange={(size) => tab.patchWorkspace({ layout: { ...workspace.layout, eastSize: size } })}
          westContent={westPanelContent}
          westSize={workspace.layout.westSize}
          westOpen={workbench ? workspace.layout.westOpen : false}
          onWestOpenChange={(open) => tab.patchWorkspace({ layout: { ...workspace.layout, westOpen: open } })}
          southContent={southPanel}
          southSize={workspace.layout.southSize}
        >
          <div
            ref={containerRef}
            className="module-viewport-host"
            onDragOver={onViewportDragOver}
            onDrop={onViewportDrop}
            onMouseDown={onMarqueeMouseDown}
            onMouseMove={onMarqueeMouseMove}
            onMouseUp={onMarqueeMouseUp}
            onMouseLeave={onMarqueeMouseUp}
          >
            {workbench ? <ModuleViewportToolbar tab={tab} controlMode={controlMode} /> : null}
            <div
              className="module-viewport-host__canvas"
              style={{ display: previewMode ? 'none' : undefined }}
            >
              <UI3DRendererView context={tab.ui3DRenderer}>
                <UI3DOverlayComponent context={tab.ui3DRenderer} tab={tab} />
                {!workbench ? (
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
                ) : null}
                {marquee ? (
                  <div
                    className="module-marquee"
                    style={{
                      left: marquee.left,
                      top: marquee.top,
                      width: marquee.right - marquee.left,
                      height: marquee.bottom - marquee.top,
                    }}
                  />
                ) : null}
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

