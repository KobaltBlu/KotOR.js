import React, { useState, useCallback, memo } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { MenuTopState } from "@/apps/forge/states/MenuTopState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { MenuBar, ForgeMenuItem } from "@/apps/forge/components/common/MenuBar";
import { MenuTopPreviewButton } from "@/apps/forge/components/MenuTopPreviewButton";
import "@/apps/forge/commands/registerForgeCommands";

export interface MenuTopProps {
  className?: string;
}

export const MenuTop = memo(function MenuTop(props: MenuTopProps = {}) {
  const { className = '' } = props;
  const [items, setItems] = useState<ForgeMenuItem[]>(() => [...MenuTopState.items]);

  const refresh = useCallback(() => {
    MenuTopState.rebuild();
    setItems([...MenuTopState.items]);
  }, []);

  const onMenuTopItemsUpdated = useCallback(() => {
    setItems([...MenuTopState.items]);
  }, []);

  useEffectOnce(() => {
    setItems([...MenuTopState.items]);
    let historyTab: TabState | undefined;

    const unbindHistoryTab = () => {
      if (!historyTab) {
        return;
      }
      historyTab.removeEventListener('onHistoryChanged', refresh);
      historyTab = undefined;
    };

    const bindHistoryTab = () => {
      const tab = ForgeState.tabManager?.currentTab;
      if (historyTab === tab) {
        return;
      }
      unbindHistoryTab();
      historyTab = tab;
      tab?.addEventListener('onHistoryChanged', refresh);
    };

    const refreshTabs = () => {
      bindHistoryTab();
      refresh();
    };

    ForgeState.addEventListener('onRecentFilesUpdated', refresh);
    ForgeState.addEventListener('onRecentProjectsUpdated', refresh);
    ForgeState.addEventListener('onExplorerPaneToggle', refresh);
    MenuTopState.addEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    const manager = ForgeState.tabManager;
    manager?.addEventListener('onTabShow', refreshTabs);
    manager?.addEventListener('onTabAdded', refreshTabs);
    manager?.addEventListener('onTabRemoved', refreshTabs);
    bindHistoryTab();
    refresh();

    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', refresh);
      ForgeState.removeEventListener('onRecentProjectsUpdated', refresh);
      ForgeState.removeEventListener('onExplorerPaneToggle', refresh);
      MenuTopState.removeEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
      manager?.removeEventListener('onTabShow', refreshTabs);
      manager?.removeEventListener('onTabAdded', refreshTabs);
      manager?.removeEventListener('onTabRemoved', refreshTabs);
      unbindHistoryTab();
    };
  });

  return (
    <div className={`forge-menubar-host${className ? ` ${className}` : ""}`}>
      <MenuBar items={items} variant="flow" className={className} />
      <MenuTopPreviewButton />
    </div>
  );
});
