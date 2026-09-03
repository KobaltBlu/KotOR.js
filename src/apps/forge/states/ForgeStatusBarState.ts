import { EventListenerModel } from "@/apps/forge/EventListenerModel";

export type ForgeStatusBarAlign = "start" | "end";

export type ForgeStatusBarItem = {
  /** Stable id. Later `setItem` calls with the same id replace the previous item. */
  id: string;
  text: string;
  title?: string;
  /** `start` sits after the current-tab label; `end` is right-aligned. Default `end`. */
  align?: ForgeStatusBarAlign;
  onClick?: () => void;
};

export type ForgeStatusBarEvent = "onChange";

/**
 * App-wide status bar contributions. Any tab or engine can publish items;
 * the shell footer renders them. Empty `text` removes the item.
 */
export class ForgeStatusBarState {
  private static readonly items = new Map<string, ForgeStatusBarItem>();
  private static readonly events = new EventListenerModel();

  static setItem(item: ForgeStatusBarItem): void {
    const id = String(item?.id ?? "").trim();
    if (!id) {
      return;
    }
    const text = String(item.text ?? "").trim();
    if (!text) {
      ForgeStatusBarState.removeItem(id);
      return;
    }
    ForgeStatusBarState.items.set(id, {
      id,
      text,
      title: item.title,
      align: item.align === "start" ? "start" : "end",
      onClick: item.onClick,
    });
    ForgeStatusBarState.events.processEventListener("onChange", []);
  }

  static removeItem(id: string): void {
    const key = String(id ?? "").trim();
    if (!key || !ForgeStatusBarState.items.has(key)) {
      return;
    }
    ForgeStatusBarState.items.delete(key);
    ForgeStatusBarState.events.processEventListener("onChange", []);
  }

  static removeByPrefix(prefix: string): void {
    const p = String(prefix ?? "");
    if (!p) {
      return;
    }
    let changed = false;
    for (const id of [...ForgeStatusBarState.items.keys()]) {
      if (id.startsWith(p)) {
        ForgeStatusBarState.items.delete(id);
        changed = true;
      }
    }
    if (changed) {
      ForgeStatusBarState.events.processEventListener("onChange", []);
    }
  }

  static getItems(): ForgeStatusBarItem[] {
    return [...ForgeStatusBarState.items.values()];
  }

  static addEventListener(type: ForgeStatusBarEvent, cb: Function): void {
    ForgeStatusBarState.events.addEventListener(type, cb);
  }

  static removeEventListener(type: ForgeStatusBarEvent, cb: Function): void {
    ForgeStatusBarState.events.removeEventListener(type, cb);
  }
}
