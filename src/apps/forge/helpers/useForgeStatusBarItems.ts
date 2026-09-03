import { useEffect, useRef } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  ForgeStatusBarItem,
  ForgeStatusBarState,
} from "@/apps/forge/states/ForgeStatusBarState";
import { TabState } from "@/apps/forge/states/tabs/TabState";

export type UseForgeStatusBarItemsOptions = {
  /**
   * When false, items are removed. Defaults to true.
   * Use with a tab's visibility if the contribution is only meaningful while shown.
   */
  active?: boolean;
  /** Prefix applied to each item id so unmount can remove the whole group. */
  owner?: string;
};

function resolveId(id: string, owner?: string): string {
  const raw = String(id ?? "").trim() || "item";
  if (!owner) {
    return raw;
  }
  return raw.startsWith(`${owner}:`) ? raw : `${owner}:${raw}`;
}

/**
 * Publish status bar items from a React view. Removed on unmount or when `active` is false.
 * Prefer `tab.setStatusBarItems()` from a TabState when the tab owns the contribution.
 */
export function useForgeStatusBarItems(
  items: Array<Omit<ForgeStatusBarItem, "id"> & { id: string }>,
  options?: UseForgeStatusBarItemsOptions,
): void {
  const active = options?.active ?? true;
  const owner = options?.owner;
  const idsRef = useRef<string[]>([]);

  useEffect(() => {
    for (const id of idsRef.current) {
      ForgeStatusBarState.removeItem(id);
    }
    idsRef.current = [];
    if (!active) {
      return;
    }
    const next: string[] = [];
    for (const item of items) {
      const id = resolveId(item.id, owner);
      ForgeStatusBarState.setItem({ ...item, id });
      next.push(id);
    }
    idsRef.current = next;
    return () => {
      for (const id of idsRef.current) {
        ForgeStatusBarState.removeItem(id);
      }
      idsRef.current = [];
    };
  }, [active, owner, items]);
}

/**
 * Tab-scoped status bar items: shown while the tab is visible, cleared on hide/unmount.
 */
export function useTabStatusBar(
  tab: TabState,
  items: Array<Omit<ForgeStatusBarItem, "id"> & { id?: string }>,
): void {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffectOnce(() => {
    const publish = () => {
      if (tab.visible) {
        tab.setStatusBarItems(itemsRef.current);
      }
    };
    const onShow = () => publish();
    tab.addEventListener("onTabShow", onShow);
    publish();
    return () => {
      tab.removeEventListener("onTabShow", onShow);
      tab.clearStatusBarItems();
    };
  });

  useEffect(() => {
    if (tab.visible) {
      tab.setStatusBarItems(items);
    }
  }, [tab, items]);
}
