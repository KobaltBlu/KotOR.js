import React from "react";
import { ModalItemBrowser } from "@/apps/forge/components/modal/ModalItemBrowser";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import * as KotOR from "@/apps/forge/KotOR";
import { itemIconResRef, itemMatchesRace, itemMatchesSlot } from "@/apps/forge/components/tabs/tab-utc-editor/utcEquipmentSlots";

export interface UTIItem {
  resref: string;
  baseItem: number;
  localizedName: string;
  iconResRef: string;
  equipableSlots: number;
  droidOrHuman: number;
  gff?: KotOR.GFFObject;
}

export interface ModalItemBrowserOptions {
  slotFilter?: number;
  raceFilter?: number;
  title?: string;
}

export class ModalItemBrowserState extends ModalState {
  static itemsCache: UTIItem[] = [];
  static cacheLoaded: boolean = false;
  static cachePromise: Promise<UTIItem[]> | undefined;

  items: UTIItem[] = [];
  filteredItems: UTIItem[] = [];
  searchQuery: string = "";
  onItemSelect?: (item: UTIItem) => void;
  slotFilter?: number;
  raceFilter?: number;

  constructor(onItemSelect?: (item: UTIItem) => void, options?: ModalItemBrowserOptions) {
    super();
    this.title = options?.title || "Item Browser";
    this.onItemSelect = onItemSelect;
    this.slotFilter = options?.slotFilter;
    this.raceFilter = options?.raceFilter;
    this.setView(<ModalItemBrowser modal={this} />);
  }

  static invalidateCache(): void {
    ModalItemBrowserState.itemsCache = [];
    ModalItemBrowserState.cacheLoaded = false;
    ModalItemBrowserState.cachePromise = undefined;
  }

  static findByResref(resref: string): UTIItem | undefined {
    const key = (resref || "").toLowerCase();
    if (!key) return undefined;
    return ModalItemBrowserState.itemsCache.find((item) => item.resref.toLowerCase() === key);
  }

  static async loadCache(): Promise<UTIItem[]> {
    if (ModalItemBrowserState.cacheLoaded) {
      return ModalItemBrowserState.itemsCache;
    }
    if (ModalItemBrowserState.cachePromise) {
      return ModalItemBrowserState.cachePromise;
    }

    ModalItemBrowserState.cachePromise = ModalItemBrowserState.buildCache();
    try {
      return await ModalItemBrowserState.cachePromise;
    } catch (error) {
      ModalItemBrowserState.cachePromise = undefined;
      throw error;
    }
  }

  static async ensureItemsCache(): Promise<UTIItem[]> {
    return ModalItemBrowserState.loadCache();
  }

  private static async buildCache(): Promise<UTIItem[]> {
    const items: UTIItem[] = [];
    const utiKeys = (KotOR.KEYManager?.Key?.keys || []).filter(
      (key: KotOR.IKEYEntry) => key.resType === KotOR.ResourceTypes["uti"]
    );

    for (const key of utiKeys) {
      try {
        const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
        if (!buffer) continue;

        const gff = new KotOR.GFFObject(buffer);
        gff.parse(buffer);
        const root = gff.RootNode;
        if (!root) continue;

        let baseItem = 0;
        let localizedName = "";
        let iconResRef = "";
        let modelVariation = 1;
        let equipableSlots = 0;
        let droidOrHuman = 0;

        if (root.hasField("BaseItem")) {
          baseItem = root.getFieldByLabel("BaseItem").getValue() || 0;
        }

        if (root.hasField("ModelVariation")) {
          modelVariation = root.getFieldByLabel("ModelVariation").getValue() || 1;
        }

        if (root.hasField("LocalizedName")) {
          const localizedNameField = root.getFieldByLabel("LocalizedName");
          if (localizedNameField) {
            const locString = localizedNameField.getCExoLocString();
            if (locString) {
              localizedName = locString.getValue() || "";
            }
          }
        }

        const rule = KotOR.SWRuleSet.baseItems?.[baseItem];
        if (rule) {
          iconResRef = itemIconResRef(rule.itemClass || "", modelVariation);
          equipableSlots = rule.equipableSlots || 0;
          droidOrHuman = rule.droidOrHuman || 0;
        } else {
          const baseitems2DA = KotOR.TwoDAManager.datatables.get("baseitems");
          if (baseitems2DA) {
            const baseItemRow = baseitems2DA.getRowByIndex(baseItem);
            if (baseItemRow) {
              iconResRef = itemIconResRef(String(baseItemRow["itemclass"] || ""), modelVariation);
              equipableSlots = Number(baseItemRow["equipableslots"] || 0);
              droidOrHuman = Number(baseItemRow["droidorhuman"] || 0);
            }
          }
        }

        if (!localizedName) {
          localizedName = key.resRef;
        }

        items.push({
          resref: key.resRef,
          baseItem,
          localizedName,
          iconResRef,
          equipableSlots,
          droidOrHuman,
          gff,
        });
      } catch (error) {
        console.error(`Failed to load UTI: ${key.resRef}`, error);
      }
    }

    ModalItemBrowserState.itemsCache = items;
    ModalItemBrowserState.cacheLoaded = true;
    return items;
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredItems = this.items.filter((item) => {
      if (query) {
        const matchesSearch =
          item.resref.toLowerCase().includes(query) ||
          item.localizedName.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (this.slotFilter != null && !itemMatchesSlot(item.equipableSlots, this.slotFilter)) {
        return false;
      }
      if (this.raceFilter != null && !itemMatchesRace(item.droidOrHuman, this.raceFilter)) {
        return false;
      }
      return true;
    });
  }

  async loadItems() {
    try {
      this.items = (await ModalItemBrowserState.loadCache()).slice(0);
      this.applyFilters();
      this.processEventListener("onItemsLoaded", [this]);
    } catch (error) {
      console.error("Failed to load items", error);
      this.items = [];
      this.filteredItems = [];
      this.processEventListener("onItemsLoaded", [this]);
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
    this.applyFilters();
    this.processEventListener("onSearchChanged", [this]);
  }

  selectItem(item: UTIItem) {
    if (this.onItemSelect) {
      this.onItemSelect(item);
    }
    this.close();
  }
}
