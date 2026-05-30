import type { GUIProtoItem } from "@/gui/GUIProtoItem";

export type GUIProtoItemCtor = new (...args: any[]) => GUIProtoItem;

/**
 * Optional string-key registration for debugging and central lookup.
 * Menus typically use {@link GUIListBox.setProtoBuilder} instead.
 */
export class ListRowRegistry {
  private static readonly map = new Map<string, GUIProtoItemCtor>();

  static register(key: string, ctor: GUIProtoItemCtor): void {
    this.map.set(key, ctor);
  }

  static resolve(key: string): GUIProtoItemCtor | undefined {
    return this.map.get(key);
  }
}
