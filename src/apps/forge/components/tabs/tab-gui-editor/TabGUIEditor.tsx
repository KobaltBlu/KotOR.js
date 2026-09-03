/**
 * Forge GUI (.gui) layout editor — preview, control tree, and inspector.
 *
 * @file TabGUIEditor.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabGUIEditorState, TabGUIEditorStateEventListenerTypes } from "@/apps/forge/states/tabs";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { MenuBar, type MenuItem } from "@/apps/forge/components/common/MenuBar";
import { forgeGuiSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import { GUITreeView } from "@/apps/forge/components/tabs/tab-gui-editor/GUITreeView";
import { GUIInspector } from "@/apps/forge/components/tabs/tab-gui-editor/GUIInspector";
import { guiAddableControlTypes, guiControlTypeLabel } from "@/apps/forge/gui/guiOutline";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";

import "@/apps/forge/components/tabs/tab-gui-editor/TabGUIEditor.scss";

export const TabGUIEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabGUIEditorState;
  const [generation, setGeneration] = useState(0);

  const bump = useCallback(() => setGeneration((g) => g + 1), []);

  const onMouseWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      const gui = forgeGuiSettings.get();
      let scale = tab.canvasScale || tab.menu?.tGuiPanel?.widget?.scale?.x || 1;
      scale += e.deltaY < 0 ? gui.zoomStep : -gui.zoomStep;
      scale = Math.max(Math.min(scale, gui.zoomMax), gui.zoomMin);
      tab.setCanvasScale(scale);
    },
    [tab],
  );

  const canvasMouseBufferCoords = useCallback((event: MouseEvent): { x: number; y: number } | null => {
    const canvas = tab.ui3DRenderer?.canvas;
    if (!canvas || event.target !== canvas) {
      return null;
    }
    const offset = canvas.getBoundingClientRect();
    if (offset.width <= 0 || offset.height <= 0) {
      return null;
    }
    const cssX = event.clientX - offset.left;
    const cssY = event.clientY - offset.top;
    return {
      x: cssX * (canvas.width / offset.width),
      y: cssY * (canvas.height / offset.height),
    };
  }, [tab]);

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      const coords = canvasMouseBufferCoords(event);
      if (!coords) {
        return;
      }
      if (tab.pickAtCanvas(coords.x, coords.y)) {
        bump();
      }
    },
    [tab, canvasMouseBufferCoords, bump],
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const coords = canvasMouseBufferCoords(event);
      if (!coords) {
        return;
      }
      tab.hoverAtCanvas(coords.x, coords.y);
    },
    [tab, canvasMouseBufferCoords],
  );

  useEffectOnce(() => {
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onEditorFileLoad", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onEditorFileChange", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onNodeSelected", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onNodeAdded", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onNodeRemoved", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onUndoApplied", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onRedoApplied", bump);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onHistoryChanged", bump);
    tab.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>("onMouseWheel", onMouseWheel);
    tab.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>("onMouseDown", onMouseDown);
    tab.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>("onMouseMove", onMouseMove);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        tab.removeSelectedControl();
      }
    };
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>("onKeyDown", onKeyDown);

    return () => {
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onEditorFileLoad", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onEditorFileChange", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onNodeSelected", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onNodeAdded", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onNodeRemoved", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onUndoApplied", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onRedoApplied", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onHistoryChanged", bump);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>("onKeyDown", onKeyDown);
      tab.ui3DRenderer.removeEventListener<UI3DRendererEventListenerTypes>("onMouseWheel", onMouseWheel);
      tab.ui3DRenderer.removeEventListener<UI3DRendererEventListenerTypes>("onMouseDown", onMouseDown);
      tab.ui3DRenderer.removeEventListener<UI3DRendererEventListenerTypes>("onMouseMove", onMouseMove);
    };
  });

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        {
          label: "Save",
          shortcut: formatKeybinding("Mod+S"),
          onClick: () => {
            void tab.save();
          },
          disabled: !tab.gff,
        },
        {
          label: "Save As...",
          shortcut: formatKeybinding("Mod+Shift+S"),
          onClick: () => {
            void tab.saveAs();
          },
          disabled: !tab.gff,
        },
      ],
    },
    {
      label: "Edit",
      children: [
        {
          label: "Undo",
          shortcut: formatKeybinding("Mod+Z"),
          disabled: !tab.canUndo,
          onClick: () => tab.undo(),
        },
        {
          label: "Redo",
          shortcut: formatKeybinding("Mod+Y"),
          disabled: !tab.canRedo,
          onClick: () => tab.redo(),
        },
        { separator: true },
        ...guiAddableControlTypes().map((type) => ({
          label: `Add ${guiControlTypeLabel(type)}`,
          onClick: () => tab.addControl(type),
          disabled: !tab.gff,
        })),
        { separator: true },
        {
          label: "Delete Selected",
          shortcut: "Del",
          disabled: !tab.gff || tab.selectedPath === "root",
          onClick: () => tab.removeSelectedControl(),
        },
      ],
    },
    {
      label: "View",
      children: [
        {
          label: "Reset Zoom",
          onClick: () => {
            tab.resetZoom();
            bump();
          },
        },
      ],
    },
  ];

  void generation;

  const westPanel = <GUITreeView tab={tab} generation={generation} />;
  const eastPanel = <GUIInspector tab={tab} generation={generation} />;

  return (
    <div className="tab-gui-editor">
      <MenuBar items={menuItems} />
      <div className="tab-gui-editor__body">
        <LayoutContainerProvider>
          <LayoutContainer westContent={westPanel} westSize={280} eastContent={eastPanel} eastSize={320}>
            <UI3DRendererView context={tab.ui3DRenderer} />
          </LayoutContainer>
        </LayoutContainerProvider>
      </div>
    </div>
  );
};
