import React from "react";

import { ModalInventoryBrowser } from "@/apps/forge/components/modal/ModalInventoryBrowser";
import { InstallationRegistry } from "@/apps/forge/data/InstallationRegistry";
import type { InventoryItemEntry } from "@/apps/forge/module-editor/ForgeCreature";
import * as KotOR from "@/apps/forge/KotOR";
import { ModalItemBrowserState, type UTIItem } from "@/apps/forge/states/modal/ModalItemBrowserState";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export type InventoryItemSource = 'core' | 'module' | 'override';

export interface UTISourceItem extends UTIItem {
  source: InventoryItemSource;
}

export type InventoryEditorMode = 'creature' | 'store' | 'placeable';

export class ModalInventoryBrowserState extends ModalState {
  // 3-source item lists
  coreItems: UTISourceItem[] = [];
  moduleItems: UTISourceItem[] = [];
  overrideItems: UTISourceItem[] = [];

  filteredCoreItems: UTISourceItem[] = [];
  filteredModuleItems: UTISourceItem[] = [];
  filteredOverrideItems: UTISourceItem[] = [];

  searchQuery: string = '';

  // Working copy of inventory being edited
  inventory: InventoryItemEntry[] = [];

  // Controls whether droppable or infinite checkboxes are shown
  mode: InventoryEditorMode;

  coreLoaded: boolean = false;
  moduleLoaded: boolean = false;
  overrideLoaded: boolean = false;

  onSave?: (inventory: InventoryItemEntry[]) => void;

  constructor(
    inventory: InventoryItemEntry[],
    onSave?: (inventory: InventoryItemEntry[]) => void,
    mode: InventoryEditorMode = 'creature',
  ) {
    super();
    this.title = 'Inventory Browser';
    this.inventory = [...inventory];
    this.onSave = onSave;
    this.mode = mode;
    this.setView(<ModalInventoryBrowser modal={this} />);
  }

  async loadCoreItems() {
    // Reuse ModalItemBrowserState cache when available to avoid redundant loading
    if (ModalItemBrowserState.cacheLoaded) {
      this.coreItems = ModalItemBrowserState.itemsCache.map(item => ({ ...item, source: 'core' as const }));
      this.filteredCoreItems = this.coreItems.slice();
      this.coreLoaded = true;
      this.processEventListener('onCoreItemsLoaded', [this]);
      return;
    }

    try {
      await InstallationRegistry.get2DA(InstallationRegistry.BASEITEMS);
      const items: UTISourceItem[] = [];
      const utiKeys = KotOR.KEYManager.Key.keys.filter(
        (key: KotOR.IKEYEntry) => key.resType === KotOR.ResourceTypes['uti'],
      );

      for (const key of utiKeys) {
        try {
          const buffer = await KotOR.KEYManager.Key.getFileBuffer(key) as Uint8Array;
          if (!buffer) continue;
          const item = await this._parseUTIBuffer(buffer, key.resRef, 'core');
          if (item) items.push(item);
        } catch (error) {
          console.error(`Failed to load core UTI: ${key.resRef}`, error);
        }
      }

      this.coreItems = items;
      this.filteredCoreItems = items.slice();
      this.coreLoaded = true;

      // Populate ModalItemBrowserState cache so single-slot picker reuses it
      ModalItemBrowserState.itemsCache = items.map(({ source: _source, ...rest }) => rest);
      ModalItemBrowserState.cacheLoaded = true;

      this.processEventListener('onCoreItemsLoaded', [this]);
    } catch (error) {
      console.error('Failed to load core items', error);
    }
  }

  async loadModuleItems() {
    try {
      await InstallationRegistry.get2DA(InstallationRegistry.BASEITEMS);
      const items: UTISourceItem[] = [];
      const moduleScope = KotOR.ResourceLoader.CacheScopes[KotOR.CacheScope.MODULE];
      const utiMap: Map<string, Uint8Array> | undefined = moduleScope?.get(KotOR.ResourceTypes['uti'] as number);
      if (utiMap) {
        for (const [resref, buffer] of utiMap.entries()) {
          try {
            const item = await this._parseUTIBuffer(buffer, resref, 'module');
            if (item) items.push(item);
          } catch (error) {
            console.error(`Failed to parse module UTI: ${resref}`, error);
          }
        }
      }
      this.moduleItems = items;
      this.filteredModuleItems = items.slice();
      this.moduleLoaded = true;
      this.processEventListener('onModuleItemsLoaded', [this]);
    } catch (error) {
      console.error('Failed to load module items', error);
    }
  }

  async loadOverrideItems() {
    try {
      await InstallationRegistry.get2DA(InstallationRegistry.BASEITEMS);
      const items: UTISourceItem[] = [];
      const overrideScope = KotOR.ResourceLoader.CacheScopes[KotOR.CacheScope.OVERRIDE];
      const utiMap: Map<string, Uint8Array> | undefined = overrideScope?.get(KotOR.ResourceTypes['uti'] as number);
      if (utiMap) {
        for (const [resref, buffer] of utiMap.entries()) {
          try {
            const item = await this._parseUTIBuffer(buffer, resref, 'override');
            if (item) items.push(item);
          } catch (error) {
            console.error(`Failed to parse override UTI: ${resref}`, error);
          }
        }
      }
      this.overrideItems = items;
      this.filteredOverrideItems = items.slice();
      this.overrideLoaded = true;
      this.processEventListener('onOverrideItemsLoaded', [this]);
    } catch (error) {
      console.error('Failed to load override items', error);
    }
  }

  private async _parseUTIBuffer(
    buffer: Uint8Array,
    resref: string,
    source: InventoryItemSource,
  ): Promise<UTISourceItem | null> {
    try {
      const gff = new KotOR.GFFObject(buffer);
      gff.parse(buffer);
      const root = gff.RootNode;
      if (!root) return null;

      let baseItem = 0;
      let localizedName = '';
      let iconResRef = '';
      let modelVariation = 1;

      if (root.hasField('BaseItem')) baseItem = root.getFieldByLabel('BaseItem').getValue() || 0;
      if (root.hasField('ModelVariation')) modelVariation = root.getFieldByLabel('ModelVariation').getValue() || 1;
      if (root.hasField('LocalizedName')) {
        const locField = root.getFieldByLabel('LocalizedName');
        if (locField) localizedName = locField.getCExoLocString()?.getValue() || '';
      }

      if (baseItem > 0) {
        const baseitems2DA = InstallationRegistry.get2DASync(InstallationRegistry.BASEITEMS);
        if (baseitems2DA) {
          const baseItemRow = baseitems2DA.getRowByIndex(baseItem);
          if (baseItemRow) {
            iconResRef = `i${(baseItemRow['itemclass'] || '').toLowerCase()}_${('000' + modelVariation).slice(-3)}`;
          }
        }
      }

      if (!localizedName) localizedName = resref;

      return { resref, baseItem, localizedName, iconResRef, gff, source };
    } catch (error) {
      console.error(`Failed to parse UTI: ${resref}`, error);
      return null;
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery = query.toLowerCase();
    const q = this.searchQuery;
    const matchFn = (item: UTISourceItem) =>
      item.resref.toLowerCase().includes(q) || item.localizedName.toLowerCase().includes(q);
    this.filteredCoreItems = this.coreItems.filter(matchFn);
    this.filteredModuleItems = this.moduleItems.filter(matchFn);
    this.filteredOverrideItems = this.overrideItems.filter(matchFn);
    this.processEventListener('onSearchChanged', [this]);
  }

  findItemByResref(resref: string): UTISourceItem | undefined {
    const lookup = resref.toLowerCase();
    return [
      ...this.coreItems,
      ...this.moduleItems,
      ...this.overrideItems,
    ].find((item) => item.resref.toLowerCase() === lookup);
  }

  addItem(resref: string) {
    this.inventory.push({ resref, droppable: false, infinite: false });
    this.processEventListener('onInventoryChanged', [this]);
  }

  removeItem(index: number) {
    this.inventory.splice(index, 1);
    this.processEventListener('onInventoryChanged', [this]);
  }

  moveItemUp(index: number) {
    if (index <= 0 || index >= this.inventory.length) return;
    const temp = this.inventory[index - 1];
    this.inventory[index - 1] = this.inventory[index];
    this.inventory[index] = temp;
    this.processEventListener('onInventoryChanged', [this]);
  }

  moveItemDown(index: number) {
    if (index < 0 || index >= this.inventory.length - 1) return;
    const temp = this.inventory[index + 1];
    this.inventory[index + 1] = this.inventory[index];
    this.inventory[index] = temp;
    this.processEventListener('onInventoryChanged', [this]);
  }

  setDroppable(index: number, droppable: boolean) {
    if (this.inventory[index]) {
      this.inventory[index] = { ...this.inventory[index], droppable };
      this.processEventListener('onInventoryChanged', [this]);
    }
  }

  setInfinite(index: number, infinite: boolean) {
    if (this.inventory[index]) {
      this.inventory[index] = { ...this.inventory[index], infinite };
      this.processEventListener('onInventoryChanged', [this]);
    }
  }

  save() {
    if (this.onSave) {
      this.onSave([...this.inventory]);
    }
    this.close();
  }
}
