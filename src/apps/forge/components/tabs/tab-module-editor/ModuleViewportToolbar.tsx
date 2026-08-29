import React, { useCallback, useEffect, useState } from "react";
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { TabModuleEditorControlMode } from "@/apps/forge/states/tabs/TabModuleEditorTypes";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import { forgeModuleSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import { EditorTool } from "@/apps/forge/module-editor/kernel/EditorMode";

export interface ModuleViewportToolbarProps {
  tab: TabModuleEditorState;
  controlMode: TabModuleEditorControlMode;
}

const TOOLS: { id: EditorTool; mode: TabModuleEditorControlMode; label: string; shortcut: string; icon: string }[] = [
  { id: EditorTool.SELECT, mode: TabModuleEditorControlMode.SELECT, label: "Select", shortcut: "Q", icon: "fa-arrow-pointer" },
  { id: EditorTool.TRANSLATE, mode: TabModuleEditorControlMode.TRANSFORM_CONTROL, label: "Move", shortcut: "W", icon: "fa-arrows-up-down-left-right" },
  { id: EditorTool.ROTATE, mode: TabModuleEditorControlMode.ROTATE_CONTROL, label: "Rotate", shortcut: "E", icon: "fa-arrows-rotate" },
  { id: EditorTool.SCALE, mode: TabModuleEditorControlMode.SCALE_CONTROL, label: "Scale", shortcut: "R", icon: "fa-up-right-and-down-left-from-center" },
  { id: EditorTool.PLACE, mode: TabModuleEditorControlMode.ADD_GAME_OBJECT, label: "Place", shortcut: "A", icon: "fa-square-plus" },
];

export const ModuleViewportToolbar: React.FC<ModuleViewportToolbarProps> = ({ tab, controlMode }) => {
  const [space, setSpace] = useState(tab.toolService.getSpace());
  const [snap, setSnap] = useState(tab.toolService.getSnap());

  useEffect(() => {
    const onSpace = () => setSpace(tab.toolService.getSpace());
    const onSnap = () => setSnap(tab.toolService.getSnap());
    tab.toolService.addEventListener("onSpaceChanged", onSpace);
    tab.toolService.addEventListener("onSnapChanged", onSnap);
    return () => {
      tab.toolService.removeEventListener("onSpaceChanged", onSpace);
      tab.toolService.removeEventListener("onSnapChanged", onSnap);
    };
  }, [tab]);

  const toggleSpace = useCallback(() => {
    const next = tab.toolService.toggleSpace();
    forgeModuleSettings.set({ transformSpace: next });
  }, [tab]);

  if (!forgeModuleSettings.get().showViewportToolbar) {
    return null;
  }

  return (
    <div className="module-viewport-toolbar" role="toolbar" aria-label="Module viewport tools">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`module-viewport-toolbar__btn${controlMode === tool.mode ? " is-active" : ""}`}
          title={`${tool.label} (${tool.shortcut})`}
          aria-pressed={controlMode === tool.mode}
          onClick={() => tab.setControlMode(tool.mode)}
        >
          <i className={`fa-solid ${tool.icon}`} aria-hidden />
          <span>{tool.label}</span>
        </button>
      ))}
      <div className="module-viewport-toolbar__sep" />
      <button
        type="button"
        className="module-viewport-toolbar__btn"
        title="Toggle local / world transform space"
        onClick={toggleSpace}
      >
        <i className="fa-solid fa-cube" aria-hidden />
        <span>{space === "local" ? "Local" : "World"}</span>
      </button>
      <button
        type="button"
        className={`module-viewport-toolbar__btn${snap.positionEnabled ? " is-active" : ""}`}
        title="Toggle position snap"
        aria-pressed={snap.positionEnabled}
        onClick={() => {
          const next = tab.toolService.setSnap({ positionEnabled: !snap.positionEnabled });
          forgeModuleSettings.set({ snapPosition: next.positionEnabled });
          setSnap(next);
        }}
      >
        <i className="fa-solid fa-border-all" aria-hidden />
        <span>Snap</span>
      </button>
        <button
        type="button"
        className="module-viewport-toolbar__btn"
        title="Frame selection (F)"
        onClick={() => {
          const container = tab.selectedGameObject?.container;
          if (container) {
            tab.ui3DRenderer.lookAtObject(container);
          }
        }}
      >
        <i className="fa-solid fa-crosshairs" aria-hidden />
        <span>Frame</span>
      </button>
      <button
        type="button"
        className="module-viewport-toolbar__btn"
        title="Validate module"
        onClick={() => void tab.validateModule()}
      >
        <i className="fa-solid fa-triangle-exclamation" aria-hidden />
        <span>Validate</span>
      </button>
      <div className="module-viewport-toolbar__sep" />
      <button
        type="button"
        className={`module-viewport-toolbar__btn${tab.tabMode === ModuleEditorTabMode.PREVIEW ? " is-active" : ""}`}
        title="Preview Module (P)"
        aria-pressed={tab.tabMode === ModuleEditorTabMode.PREVIEW}
        onClick={() => tab.setPreviewMode(tab.tabMode !== ModuleEditorTabMode.PREVIEW)}
      >
        <i className={`fa-solid ${tab.tabMode === ModuleEditorTabMode.PREVIEW ? "fa-stop" : "fa-play"}`} aria-hidden />
        <span>{tab.tabMode === ModuleEditorTabMode.PREVIEW ? "Exit" : "Preview"}</span>
      </button>
    </div>
  );
};
