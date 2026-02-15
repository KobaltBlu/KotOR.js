import { useState, useCallback, memo } from "react";

import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { MenuTopItem } from "@/apps/forge/MenuTopItem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { MenuTopState } from "@/apps/forge/states/MenuTopState";

export interface MenuTopProps {
  className?: string;
}

export const MenuTop = memo(function MenuTop(_props: MenuTopProps = {}) {

  const [, setItems] = useState<MenuTopItem[]>([]);

  // Memoize the recent files update logic
  const updateRecentFilesMenuItem = useCallback(() => {
    MenuTopState.menuItemRecentFiles.items = [];

    ForgeState.recentFiles.forEach((file) => {
      MenuTopState.menuItemRecentFiles.items.push(
        new MenuTopItem({
          name: `${file.getFilename()} ${file.getPrettyPath()}`,
          onClick: (_menuItem: MenuTopItem) => {
            FileTypeManager.onOpenResource(file);
          }
        })
      );
    });

    MenuTopState.menuItemRecentFiles.rebuild();
  }, []);

  // Memoize the event handler
  const onRecentFilesUpdated = useCallback(() => {
    updateRecentFilesMenuItem();
  }, [updateRecentFilesMenuItem]);

  const onMenuTopItemsUpdated = useCallback(() => {
    setItems([...MenuTopState.items]);
  }, []);

  // Component lifecycle
  useEffectOnce(() => {
    setItems([...MenuTopState.items]);
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    MenuTopState.addEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    updateRecentFilesMenuItem();

    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
      MenuTopState.removeEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    };
  });

  // Memoize menu items rendering

  // Top menu removed: render nothing to hide File/Save menus
  return null;
});
