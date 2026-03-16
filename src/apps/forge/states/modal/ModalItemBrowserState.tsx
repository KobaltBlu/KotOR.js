import React from "react";

import { ModalItemBrowser } from "@/apps/forge/components/modal/ModalItemBrowser";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { createScopedLogger, LogScope } from "@/utility/Logger";
import * as KotOR from "@/apps/forge/KotOR";

const log = createScopedLogger(LogScope.Forge);

export interface UTIItem {
  resref: string;
  baseItem: number;
  localizedName: string;
  iconResRef: string;
  gff: KotOR.GFFObject;
}

export class ModalItemBrowserState extends ModalState {
  static itemsCache: UTIItem[] = [];
  static cacheLoaded: boolean = false;

  items: UTIItem[] = [];
  filteredItems: UTIItem[] = [];
  searchQuery: string = '';
  onItemSelect?: (item: UTIItem) => void;

  constructor(onItemSelect?: (item: UTIItem) => void) {
    super();
    this.title = 'Item Browser';
    this.onItemSelect = onItemSelect;
    this.setView(<ModalItemBrowser modal={this} />);
  }

  async loadItems() {
    if (ModalItemBrowserState.cacheLoaded) {
      this.items = ModalItemBrowserState.itemsCache.slice(0);
      this.filteredItems = this.items.slice(0);
      this.processEventListener('onItemsLoaded', [this]);
      return;
    }

    try {
      const items: UTIItem[] = [];
      
      // Get all UTI files from KEYManager
      const utiKeys = KotOR.KEYManager.Key.keys.filter(
        (key: KotOR.IKEYEntry) => key.resType === KotOR.ResourceTypes['uti']
      );

      // Load and parse each UTI file
      for (const key of utiKeys) {
        try {
          const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
          if (!buffer) continue;

          const gff = new KotOR.GFFObject(buffer);
          gff.parse(buffer);
          const root = gff.RootNode;
          if (!root) continue;

          // Extract metadata
          let baseItem = 0;
          let localizedName = '';
          let iconResRef = '';
          let modelVariation = 1;

          if (root.hasField('BaseItem')) {
            baseItem = root.getFieldByLabel('BaseItem').getValue() || 0;
          }

          if (root.hasField('ModelVariation')) {
            modelVariation = root.getFieldByLabel('ModelVariation').getValue() || 1;
          }

          if (root.hasField('LocalizedName')) {
            const localizedNameField = root.getFieldByLabel('LocalizedName');
            if (localizedNameField) {
              const locString = localizedNameField.getCExoLocString();
              if (locString) {
                localizedName = locString.getValue() || '';
              }
            }
          }

          // Get icon from baseitem
          if (baseItem > 0) {
            const baseitems2DA = KotOR.TwoDAManager.datatables.get('baseitems');
            if (baseitems2DA) {
              const baseItemRow = baseitems2DA.getRowByIndex(baseItem);
              if (baseItemRow) {
                iconResRef = (baseItemRow['itemclass'] || '').toLowerCase();
                iconResRef = `i${iconResRef}_${("000" + modelVariation).slice(-3)}`;
              }
            }
          }

          // Use resref as fallback for localized name
          if (!localizedName) {
            localizedName = key.resRef;
          }

          items.push({
            resref: key.resRef,
            baseItem,
            localizedName,
            iconResRef,
            gff
          });
        } catch (error) {
          log.error(`Failed to load UTI: ${key.resRef}`, error);
        }
      }

      this.items = items;
      this.filteredItems = items;
      ModalItemBrowserState.itemsCache = items.slice(0);
      ModalItemBrowserState.cacheLoaded = true;
      this.processEventListener('onItemsLoaded', [this]);
    } catch (error) {
      log.error('Failed to load items', error);
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery = query.toLowerCase();
    this.filteredItems = this.items.filter(item => 
      item.resref.toLowerCase().includes(this.searchQuery) ||
      item.localizedName.toLowerCase().includes(this.searchQuery)
    );
    this.processEventListener('onSearchChanged', [this]);
  }

  selectItem(item: UTIItem) {
    if (this.onItemSelect) {
      this.onItemSelect(item);
    }
    this.close();
  }
}

