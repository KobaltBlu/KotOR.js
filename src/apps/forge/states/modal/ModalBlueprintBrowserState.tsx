import React from "react";
import { ModalBlueprintBrowser } from "../../components/modal/ModalBlueprintBrowser";
import { ModalState } from "./ModalState";
import * as KotOR from "../../KotOR";

export type BlueprintType = 'utc' | 'utd' | 'ute' | 'uti' | 'utp' | 'utm' | 'uts' | 'utt' | 'utw';

export interface BlueprintItem {
  resref: string;
  localizedName: string;
  gff: KotOR.GFFObject;
}

const BLUEPRINT_TYPE_LABELS: Record<BlueprintType, string> = {
  'utc': 'Creatures',
  'utd': 'Doors',
  'ute': 'Encounters',
  'uti': 'Items',
  'utp': 'Placeables',
  'utm': 'Stores',
  'uts': 'Sounds',
  'utt': 'Triggers',
  'utw': 'Waypoints',
};

export class ModalBlueprintBrowserState extends ModalState {
  static blueprintCache: Map<BlueprintType, BlueprintItem[]> = new Map();
  static cacheLoaded: Map<BlueprintType, boolean> = new Map();

  selectedBlueprintType: BlueprintType;
  items: BlueprintItem[] = [];
  filteredItems: BlueprintItem[] = [];
  searchQuery: string = '';
  onBlueprintSelect?: (blueprint: BlueprintItem, type: BlueprintType) => void;

  constructor(blueprintType: BlueprintType, onBlueprintSelect?: (blueprint: BlueprintItem, type: BlueprintType) => void) {
    super();
    this.selectedBlueprintType = blueprintType;
    this.title = `Blueprint Browser - ${BLUEPRINT_TYPE_LABELS[blueprintType]}`;
    this.onBlueprintSelect = onBlueprintSelect;
    this.setView(<ModalBlueprintBrowser modal={this} />);
    // Load blueprints immediately
    this.loadBlueprints();
  }

  async loadBlueprints() {
    const type = this.selectedBlueprintType;
    
    if (ModalBlueprintBrowserState.cacheLoaded.get(type)) {
      const cached = ModalBlueprintBrowserState.blueprintCache.get(type) || [];
      this.items = cached.slice(0);
      this.filteredItems = this.items.slice(0);
      // Delay event firing to ensure React component has mounted and set up listeners
      await Promise.resolve();
      this.processEventListener('onBlueprintsLoaded', [this]);
      return;
    }

    try {
      const items: BlueprintItem[] = [];
      const resType = KotOR.ResourceTypes[type];
      
      if (!resType) {
        console.error(`Unknown blueprint type: ${type}`);
        return;
      }

      // Get all blueprint files from KEYManager
      const blueprintKeys = KotOR.KEYManager.Key.keys.filter(
        (key: KotOR.IKEYEntry) => key.resType === resType
      );

      // Load and parse each blueprint file
      for (const key of blueprintKeys) {
        try {
          const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
          if (!buffer) continue;

          const gff = new KotOR.GFFObject(buffer);
          gff.parse(buffer);
          const root = gff.RootNode;
          if (!root) continue;

          // Extract localized name if available
          let localizedName = '';
          if (root.hasField('LocalizedName')) {
            const localizedNameField = root.getFieldByLabel('LocalizedName');
            if (localizedNameField) {
              const locString = localizedNameField.getCExoLocString();
              if (locString) {
                localizedName = locString.getValue() || '';
              }
            }
          }

          // Try other common name fields
          if (!localizedName && root.hasField('FirstName')) {
            const firstNameField = root.getFieldByLabel('FirstName');
            if (firstNameField) {
              const locString = firstNameField.getCExoLocString();
              if (locString) {
                localizedName = locString.getValue() || '';
              }
            }
          }

          if (!localizedName && root.hasField('Tag')) {
            localizedName = root.getFieldByLabel('Tag').getValue() || '';
          }

          // Use resref as fallback
          if (!localizedName) {
            localizedName = key.resRef;
          }

          items.push({
            resref: key.resRef,
            localizedName,
            gff
          });
        } catch (error) {
          console.error(`Failed to load ${type}: ${key.resRef}`, error);
        }
      }

      this.items = items;
      this.filteredItems = items;
      ModalBlueprintBrowserState.blueprintCache.set(type, items.slice(0));
      ModalBlueprintBrowserState.cacheLoaded.set(type, true);
      this.processEventListener('onBlueprintsLoaded', [this]);
    } catch (error) {
      console.error(`Failed to load ${type} blueprints`, error);
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

  selectBlueprint(blueprint: BlueprintItem) {
    if (this.onBlueprintSelect) {
      this.onBlueprintSelect(blueprint, this.selectedBlueprintType);
    }
    this.close();
  }
}

