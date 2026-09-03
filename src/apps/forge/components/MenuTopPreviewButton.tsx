import React, { useCallback, useEffect, useState } from "react";
import { executeCommand, isCommandEnabled } from "@/apps/forge/commands/forgeCommands";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";

/** True only when the Module Editor tab is the active visible tab. */
export function isModuleEditorTabActive(): boolean {
  const tab = ForgeState.tabManager?.currentTab;
  if (!(tab instanceof TabModuleEditorState)) {
    return false;
  }
  if (!tab.visible) {
    return false;
  }
  const tabs = ForgeState.tabManager?.tabs || [];
  return tabs.includes(tab);
}

function activeModuleEditor(): TabModuleEditorState | undefined {
  return isModuleEditorTabActive()
    ? (ForgeState.tabManager!.currentTab as TabModuleEditorState)
    : undefined;
}

/**
 * Preview Module control in the top menubar — only while the module editor is open.
 */
export const MenuTopPreviewButton = function MenuTopPreviewButton() {
  const [visible, setVisible] = useState(() => isModuleEditorTabActive());
  const [previewing, setPreviewing] = useState(() => {
    const tab = activeModuleEditor();
    return !!tab && tab.tabMode === ModuleEditorTabMode.PREVIEW;
  });
  const [enabled, setEnabled] = useState(() => isCommandEnabled("forge.module.togglePreview"));

  const refresh = useCallback(() => {
    const tab = activeModuleEditor();
    setVisible(!!tab);
    setPreviewing(!!tab && tab.tabMode === ModuleEditorTabMode.PREVIEW);
    setEnabled(isCommandEnabled("forge.module.togglePreview"));
  }, []);

  useEffect(() => {
    refresh();
    let boundTab: TabModuleEditorState | undefined;

    const unbind = () => {
      if (!boundTab) return;
      boundTab.removeEventListener("onPreviewModeChange", refresh);
      boundTab = undefined;
    };

    const bind = () => {
      const tab = activeModuleEditor();
      if (boundTab === tab) return;
      unbind();
      boundTab = tab;
      tab?.addEventListener("onPreviewModeChange", refresh);
    };

    const onTab = () => {
      bind();
      refresh();
    };

    const manager = ForgeState.tabManager;
    manager?.addEventListener("onTabShow", onTab);
    manager?.addEventListener("onTabHide", onTab);
    manager?.addEventListener("onTabAdded", onTab);
    manager?.addEventListener("onTabRemoved", onTab);
    bind();

    return () => {
      manager?.removeEventListener("onTabShow", onTab);
      manager?.removeEventListener("onTabHide", onTab);
      manager?.removeEventListener("onTabAdded", onTab);
      manager?.removeEventListener("onTabRemoved", onTab);
      unbind();
    };
  }, [refresh]);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      className={`forge-menubar-preview-btn${previewing ? " is-active" : ""}`}
      disabled={!enabled && !previewing}
      title={previewing ? "Exit Preview (P)" : "Preview Module (P)"}
      aria-pressed={previewing}
      onClick={() => {
        void executeCommand("forge.module.togglePreview");
      }}
    >
      <i className={`fa-solid ${previewing ? "fa-stop" : "fa-play"}`} aria-hidden />
      <span>{previewing ? "Exit Preview" : "Preview Module"}</span>
    </button>
  );
};
