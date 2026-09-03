import React, { useCallback, useEffect, useState } from "react";
import { TabUTCEditorState } from "@/apps/forge/states/tabs";
import * as KotOR from "@/apps/forge/KotOR";
import { TextureCanvas } from "@/apps/forge/components/TextureCanvas/TextureCanvas";
import { ModalItemBrowserState, UTIItem } from "@/apps/forge/states/modal/ModalItemBrowserState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { openItemBrowser } from "@/apps/forge/helpers/openGameResRefPicker";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import {
  CreatureEquipProperty,
  EquipSlotDef,
  NATURAL_SLOTS,
  PAPERDOLL_SLOTS,
  TSL_WEAPON2_SLOTS,
  emptySlotTexture,
} from "@/apps/forge/components/tabs/tab-utc-editor/utcEquipmentSlots";
import "@/apps/forge/components/tabs/tab-utc-editor/UtcEquipmentTab.scss";

export interface UtcEquipmentTabProps {
  tab: TabUTCEditorState;
  race: number;
}

function lookupUti(resref: string): UTIItem | undefined {
  if (!resref) return undefined;
  return ModalItemBrowserState.findByResref(resref);
}

function slotTexture(def: EquipSlotDef, resref: string, race: number): string {
  const item = lookupUti(resref);
  if (item?.iconResRef) return item.iconResRef;
  return emptySlotTexture(def.emptyHuman, def.emptyDroid, race);
}

function slotCaption(resref: string): string {
  if (!resref) return "Empty";
  const item = lookupUti(resref);
  return item?.localizedName || resref;
}

const EquipSlotCell: React.FC<{
  def: EquipSlotDef;
  resref: string;
  race: number;
  onSelect: () => void;
  onUnequip: () => void;
}> = ({ def, resref, race, onSelect, onUnequip }) => {
  const equipped = !!resref;
  const texture = slotTexture(def, resref, race);
  const title = equipped
    ? `${def.label}: ${slotCaption(resref)} (${resref})`
    : `${def.label}: empty — click to equip`;

  return (
    <div className={`utc-equip-slot${equipped ? "" : " utc-equip-slot--empty"}`}>
      <div
        className="utc-equip-slot__icon"
        title={title}
        onContextMenu={(e) => {
          e.preventDefault();
          if (equipped) onUnequip();
        }}
      >
        {texture ? (
          <TextureCanvas texture={texture} width={64} height={64} onClick={onSelect} />
        ) : (
          <div className="utc-equip-slot__placeholder" onClick={onSelect}>
            <i className="fa-solid fa-paw" />
          </div>
        )}
        {equipped && (
          <ForgeButton
            variant="danger"
            size="sm"
            className="utc-equip-slot__unequip"
            title={`Unequip ${def.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onUnequip();
            }}
          >
            <i className="fa-solid fa-xmark" />
          </ForgeButton>
        )}
      </div>
      <div className="utc-equip-slot__label">{def.label}</div>
      <div className="utc-equip-slot__name" title={equipped ? resref : undefined}>
        {slotCaption(resref)}
      </div>
    </div>
  );
};

export const UtcEquipmentTab: React.FC<UtcEquipmentTabProps> = ({ tab, race }) => {
  const [, setViewTick] = useState(0);
  const isTsl = KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL;
  const bag = tab.creature.itemList;

  const refresh = useCallback(() => {
    tab.updateFile();
    setViewTick((n) => n + 1);
  }, [tab]);

  useEffect(() => {
    const bump = () => setViewTick((n) => n + 1);
    const loadCache = () => {
      if (!ForgeState.hasGameData) {
        return;
      }
      ModalItemBrowserState.ensureItemsCache()
        .then(bump)
        .catch((err) => console.error("Failed to load UTI cache", err));
    };
    loadCache();
    ForgeState.addEventListener("onGameDataChanged", loadCache);
    return () => ForgeState.removeEventListener("onGameDataChanged", loadCache);
  }, []);

  const assignSlot = useCallback((property: CreatureEquipProperty, resref: string) => {
    tab.creature.setProperty(property, resref);
    refresh();
  }, [tab, refresh]);

  const openSlotBrowser = useCallback((def: EquipSlotDef) => {
    openItemBrowser((item) => {
      assignSlot(def.property, item.resref);
    }, {
      slotFilter: def.slot,
      raceFilter: race,
      title: `Equip ${def.label}`,
      initial: (tab.creature[def.property] as string) || "",
    });
  }, [assignSlot, race]);

  const slotResref = (def: EquipSlotDef) => (tab.creature[def.property] as string) || "";

  const onAddInventoryItem = () => {
    openItemBrowser((item) => {
      tab.creature.itemList = [...tab.creature.itemList, item.resref];
      refresh();
    }, { title: "Add Inventory Item" });
  };

  const onChangeInventoryResref = (index: number, value: string) => {
    const updated = [...bag];
    updated[index] = value;
    tab.creature.itemList = updated;
    tab.updateFile();
    setViewTick((n) => n + 1);
  };

  const onBrowseInventoryItem = (index: number) => {
    openItemBrowser((item) => {
      const updated = [...tab.creature.itemList];
      updated[index] = item.resref;
      tab.creature.itemList = updated;
      refresh();
    }, {
      title: "Replace Inventory Item",
      initial: tab.creature.itemList[index],
    });
  };

  const onRemoveInventoryItem = (index: number) => {
    tab.creature.itemList = bag.filter((_, i) => i !== index);
    refresh();
  };

  const renderSlots = (defs: EquipSlotDef[]) => defs.map((def) => {
    const resref = slotResref(def);
    return (
      <EquipSlotCell
        key={def.id}
        def={def}
        resref={resref}
        race={race}
        onSelect={() => openSlotBrowser(def)}
        onUnequip={() => assignSlot(def.property, "")}
      />
    );
  });

  return (
    <div className="utc-equipment">
      <div className="utc-equipment-panel">
        <h4 className="utc-equipment-panel__title">Equipment</h4>
        <p className="utc-equipment-panel__hint">Click a slot to equip. Right-click or use × to unequip.</p>
        <div className="utc-equip-grid">
          {renderSlots(PAPERDOLL_SLOTS)}
        </div>
        {isTsl && (
          <>
            <h4 className="utc-equipment-panel__title" style={{ marginTop: "0.85rem" }}>Weapon Set 2</h4>
            <div className="utc-equip-grid">
              <EquipSlotCell
                def={TSL_WEAPON2_SLOTS[0]}
                resref={slotResref(TSL_WEAPON2_SLOTS[0])}
                race={race}
                onSelect={() => openSlotBrowser(TSL_WEAPON2_SLOTS[0])}
                onUnequip={() => assignSlot(TSL_WEAPON2_SLOTS[0].property, "")}
              />
              <div className="utc-equip-grid__spacer" />
              <EquipSlotCell
                def={TSL_WEAPON2_SLOTS[1]}
                resref={slotResref(TSL_WEAPON2_SLOTS[1])}
                race={race}
                onSelect={() => openSlotBrowser(TSL_WEAPON2_SLOTS[1])}
                onUnequip={() => assignSlot(TSL_WEAPON2_SLOTS[1].property, "")}
              />
            </div>
          </>
        )}
        <h4 className="utc-equipment-panel__title" style={{ marginTop: "0.85rem" }}>Hide / Claws</h4>
        <div className="utc-equip-grid utc-equip-grid--natural">
          {renderSlots(NATURAL_SLOTS)}
        </div>
      </div>

      <div className="utc-equipment-panel utc-equipment-bag">
        <div className="utc-equipment-bag__header">
          <h4 className="utc-equipment-panel__title" style={{ margin: 0 }}>Drop Inventory</h4>
          <ForgeButton variant="primary" size="sm" onClick={onAddInventoryItem}>
            <i className="fa-solid fa-plus" /> Add Item
          </ForgeButton>
        </div>
        <p className="utc-equipment-panel__hint">Items in the creature&apos;s ItemList (backpack / corpse loot).</p>
        {bag.length === 0 ? (
          <div className="utc-equipment-bag__empty">No inventory items.</div>
        ) : (
          <ul className="utc-equipment-bag__list">
            {bag.map((resref, index) => {
              const item = lookupUti(resref);
              return (
                <li key={index} className="utc-equipment-bag__row">
                  <div className="utc-equipment-bag__icon">
                    {item?.iconResRef ? (
                      <TextureCanvas texture={item.iconResRef} width={32} height={32} />
                    ) : (
                      <div className="utc-equip-slot__placeholder">?</div>
                    )}
                  </div>
                  <div className="utc-equipment-bag__meta">
                    {item?.localizedName && (
                      <div className="utc-equipment-bag__name" title={item.localizedName}>
                        {item.localizedName}
                      </div>
                    )}
                    <ForgeInput
                      maxLength={16}
                      value={resref}
                      placeholder="Item ResRef"
                      onChange={(e) => onChangeInventoryResref(index, e.target.value)}
                    />
                  </div>
                  <div className="utc-equipment-bag__actions">
                    <ForgeButton
                      size="sm"
                      title="Browse items"
                      onClick={() => onBrowseInventoryItem(index)}
                    >
                      <i className="fa-solid fa-folder-open" />
                    </ForgeButton>
                    <ForgeButton
                      variant="danger"
                      size="sm"
                      title="Remove item"
                      onClick={() => onRemoveInventoryItem(index)}
                    >
                      <i className="fa-solid fa-xmark" />
                    </ForgeButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
