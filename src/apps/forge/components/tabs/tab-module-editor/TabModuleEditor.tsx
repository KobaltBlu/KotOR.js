import React, { useEffect, useCallback, useRef } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { TabModuleEditorState, GameObjectType } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";
import { ModuleEditorSidebarComponent } from "../../ModuleEditorSidebarComponent";
import { useContextMenu, ContextMenuItem } from "../../common/ContextMenu";

export const TabModuleEditor = function(props: BaseTabProps){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();
  const containerRef = useRef<HTMLDivElement>(null);

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

      const gameObjectTypeItems: ContextMenuItem[] = [
        {
          id: 'add-creature',
          label: 'Creature',
          onClick: () => {
            tab.openBlueprintBrowserForType('utc');
          }
        },
        {
          id: 'add-door',
          label: 'Door',
          onClick: () => {
            tab.openBlueprintBrowserForType('utd');
          }
        },
        {
          id: 'add-encounter',
          label: 'Encounter',
          onClick: () => {
            tab.openBlueprintBrowserForType('ute');
          }
        },
        {
          id: 'add-item',
          label: 'Item',
          onClick: () => {
            tab.openBlueprintBrowserForType('uti');
          }
        },
        {
          id: 'add-placeable',
          label: 'Placeable',
          onClick: () => {
            tab.openBlueprintBrowserForType('utp');
          }
        },
        {
          id: 'add-store',
          label: 'Store',
          onClick: () => {
            tab.openBlueprintBrowserForType('utm');
          }
        },
        {
          id: 'add-sound',
          label: 'Sound',
          onClick: () => {
            tab.openBlueprintBrowserForType('uts');
          }
        },
        {
          id: 'add-trigger',
          label: 'Trigger',
          onClick: () => {
            tab.openBlueprintBrowserForType('utt');
          }
        },
        {
          id: 'add-waypoint',
          label: 'Waypoint',
          onClick: () => {
            tab.openBlueprintBrowserForType('utw');
          }
        }
      ];

      const contextMenuItems: ContextMenuItem[] = [
        {
          id: 'add-game-object',
          label: 'Add Game Object',
          submenu: gameObjectTypeItems
        }
      ];

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
      <LayoutContainer eastContent={eastPanel}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
          <UI3DRendererView context={tab.ui3DRenderer}>
            <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
          </UI3DRendererView>
        </div>
        {ContextMenuComponent}
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

