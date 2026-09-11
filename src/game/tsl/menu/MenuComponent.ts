import { GameMenu } from "@/gui";
import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { GameState } from "@/GameState";
import { InventoryManager } from "@/managers/InventoryManager";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { TwoDAObject } from "@/resource/TwoDAObject";
import {
  COMPONENT_CREATE_GROUPS,
  componentPieceValue,
  itemCreateAlignBucket,
  itemCreateRecipeVisible,
  parseItemCreateRow,
  type CraftRecipeRow,
} from "@/game/tsl-crafting";

interface ComponentShopChoice {
  recipe: CraftRecipeRow;
  item: ModuleItem;
  cost: number;
  getName: () => string;
  getIcon: () => string;
  getStackSize: () => number;
}

type BreakFilter = 'ALL' | 'WEAPONS' | 'ARMOR' | 'USEABLE' | 'MISC';

/**
 * MenuComponent — TSL GUI (`component_p` / itemcreate.2da).
 *
 * Create spends PartyManager.ComponentCount at max(1, GetCost/20).
 * Breakdown refunds the same piece value into ComponentCount.
 *
 * @file MenuComponent.ts
 */
export class MenuComponent extends GameMenu {

  declare LBL_BAR2: GUILabel;
  declare LB_DESCRIPTIONINV: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_SHOPITEMS: GUIListBox;
  declare LB_INVITEMS: GUIListBox;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_COST_VALUE: GUILabel;
  declare LBL_COST: GUILabel;
  declare LBL_STOCK: GUILabel;
  declare LBL_STOCK_VALUE: GUILabel;
  declare BTN_Accept: GUIButton;
  declare BTN_Examine: GUIButton;
  declare BTN_CREATE_RANGED: GUIButton;
  declare BTN_CREATE_MELEE: GUIButton;
  declare BTN_CREATE_ARMOR: GUIButton;
  declare BTN_CREATE_LIGHTSABER: GUIButton;
  declare BTN_CREATE_MISC: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_RELATEDSKILL: GUILabel;
  declare BTN_BREAK_ALL: GUIButton;
  declare BTN_BREAK_WEAPONS: GUIButton;
  declare BTN_BREAK_ARMOR: GUIButton;
  declare BTN_BREAK_USEABLE: GUIButton;
  declare BTN_BREAK_MISC: GUIButton;
  declare LBL_TITLE2: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare LBL_BAR3: GUILabel;

  skillCharacter: ModuleCreature | undefined;
  createGroup: number = COMPONENT_CREATE_GROUPS.RANGED;
  breakFilter: BreakFilter = 'ALL';
  createMode: boolean = true;
  shopChoices: ComponentShopChoice[] = [];
  selectedShop: ComponentShopChoice | undefined;
  selectedInv: ModuleItem | undefined;
  createItemString: string = '';

  constructor(){
    super();
    this.gui_resref = 'component_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_SHOPITEMS?.setProtoBuilder?.(GUIInventoryItem);
      this.LB_INVITEMS?.setProtoBuilder?.(GUIInventoryItem);

      if(this.LB_SHOPITEMS){
        this.LB_SHOPITEMS.onSelected = (node: any) => {
          this.createMode = true;
          this.onShopSelected(node as ComponentShopChoice);
        };
      }
      if(this.LB_INVITEMS){
        this.LB_INVITEMS.onSelected = (node: any) => {
          this.createMode = false;
          this.onInvSelected(node as ModuleItem);
        };
      }

      const createBtns: [GUIButton, number][] = [
        [this.BTN_CREATE_RANGED, COMPONENT_CREATE_GROUPS.RANGED],
        [this.BTN_CREATE_MELEE, COMPONENT_CREATE_GROUPS.MELEE],
        [this.BTN_CREATE_ARMOR, COMPONENT_CREATE_GROUPS.ARMOR],
        [this.BTN_CREATE_LIGHTSABER, COMPONENT_CREATE_GROUPS.LIGHTSABER],
        [this.BTN_CREATE_MISC, COMPONENT_CREATE_GROUPS.MISC],
      ];
      for(const [btn, group] of createBtns){
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onCreateFilter(group);
        });
      }

      const breakBtns: [GUIButton, BreakFilter][] = [
        [this.BTN_BREAK_ALL, 'ALL'],
        [this.BTN_BREAK_WEAPONS, 'WEAPONS'],
        [this.BTN_BREAK_ARMOR, 'ARMOR'],
        [this.BTN_BREAK_USEABLE, 'USEABLE'],
        [this.BTN_BREAK_MISC, 'MISC'],
      ];
      for(const [btn, filter] of breakBtns){
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onBreakFilter(filter);
        });
      }

      this.BTN_Accept?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAccept();
      });
      this.BTN_Cancel?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_Cancel;
      resolve();
    });
  }

  open(args?: {
    character?: ModuleCreature;
    createItemString?: string;
  }) {
    this.skillCharacter = args?.character
      || GameState.PartyManager?.party?.[0]
      || GameState.PartyManager?.Player;
    this.createItemString = args?.createItemString || '';
    this.createGroup = COMPONENT_CREATE_GROUPS.RANGED;
    this.breakFilter = 'ALL';
    this.createMode = true;
    super.open();
  }

  show() {
    super.show();
    if(this.createItemString && this.LBL_TITLE){
      this.LBL_TITLE.setText?.(this.createItemString);
    }
    this.populateShop();
    this.populateInventory();
    this.refreshStockLabels();
  }

  onCreateFilter(group: number) {
    this.createGroup = group;
    this.createMode = true;
    this.updateCreateFilterButtons();
    this.populateShop();
  }

  onBreakFilter(filter: BreakFilter) {
    this.breakFilter = filter;
    this.createMode = false;
    this.updateBreakFilterButtons();
    this.populateInventory();
  }

  updateCreateFilterButtons() {
    const map: [GUIButton, number][] = [
      [this.BTN_CREATE_RANGED, COMPONENT_CREATE_GROUPS.RANGED],
      [this.BTN_CREATE_MELEE, COMPONENT_CREATE_GROUPS.MELEE],
      [this.BTN_CREATE_ARMOR, COMPONENT_CREATE_GROUPS.ARMOR],
      [this.BTN_CREATE_LIGHTSABER, COMPONENT_CREATE_GROUPS.LIGHTSABER],
      [this.BTN_CREATE_MISC, COMPONENT_CREATE_GROUPS.MISC],
    ];
    for(const [btn, group] of map){
      if(!btn) continue;
      btn.selected = this.createGroup === group;
      btn.hover = this.createGroup === group;
    }
  }

  updateBreakFilterButtons() {
    const map: [GUIButton, BreakFilter][] = [
      [this.BTN_BREAK_ALL, 'ALL'],
      [this.BTN_BREAK_WEAPONS, 'WEAPONS'],
      [this.BTN_BREAK_ARMOR, 'ARMOR'],
      [this.BTN_BREAK_USEABLE, 'USEABLE'],
      [this.BTN_BREAK_MISC, 'MISC'],
    ];
    for(const [btn, filter] of map){
      if(!btn) continue;
      btn.selected = this.breakFilter === filter;
      btn.hover = this.breakFilter === filter;
    }
  }

  getItemCreateTable(): TwoDAObject | undefined {
    return GameState.TwoDAManager?.datatables?.get('itemcreate')
      || GameState.TwoDAManager?.datatables?.get('ItemCreate');
  }

  populateShop() {
    this.shopChoices = [];
    this.selectedShop = undefined;
    const table = this.getItemCreateTable();
    const ModuleItemClass = GameState.Module?.ModuleArea?.ModuleItem;
    if(!table || !ModuleItemClass){
      this.LB_SHOPITEMS?.setItems?.([]);
      this.refreshCostLabels(0);
      return;
    }

    const getSkillRank = (skill: number) =>
      this.skillCharacter?.getSkillRank?.(skill) ?? 0;
    const level = this.skillCharacter?.getTotalClassLevel?.() ?? 1;
    const goodEvil = this.skillCharacter?.getGoodEvil?.()
      ?? this.skillCharacter?.goodEvil
      ?? 50;
    const alignBucket = itemCreateAlignBucket(goodEvil);

    const keys = Object.keys(table.rows);
    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      const rowIndex = TwoDAObject.normalizeValue(row.__index, 'number', parseInt(keys[i], 10)) as number;
      const recipe = parseItemCreateRow(row, rowIndex);
      if(!recipe) continue;
      if(!itemCreateRecipeVisible(recipe, this.createGroup, getSkillRank, level, alignBucket)) continue;

      let item: ModuleItem | undefined;
      try{
        item = ModuleItemClass.FromResRef?.(recipe.label);
      }catch(_e){
        item = undefined;
      }
      if(!item) continue;
      item.initProperties?.();
      const cost = componentPieceValue(item.getGoldPieceValue?.() ?? 0);
      this.shopChoices.push({
        recipe,
        item,
        cost,
        getName: () => item.getName?.() || recipe.label,
        getIcon: () => item.getIcon?.() || '',
        getStackSize: () => 1,
      });
    }

    this.LB_SHOPITEMS?.setItems?.(this.shopChoices);
    this.updateCreateFilterButtons();
    if(this.shopChoices.length){
      this.onShopSelected(this.shopChoices[0]);
    }else{
      this.refreshCostLabels(0);
      this.LB_DESCRIPTION?.setItem?.(null);
      this.BTN_Accept.disableSelection = true;
    }
  }

  matchesBreakFilter(item: ModuleItem): boolean {
    if(this.breakFilter === 'ALL') return true;
    const base = item.baseItem;
    const isWeapon = (base?.weaponWield | 0) > 0 || (base?.weaponType | 0) > 0;
    const isArmor = !!((base?.equipableSlots | 0) & 0x200);
    const isUseable = !!(item.getSpells?.()?.length);

    switch(this.breakFilter){
      case 'WEAPONS': return isWeapon;
      case 'ARMOR': return isArmor;
      case 'USEABLE': return isUseable;
      case 'MISC': return !isWeapon && !isArmor && !isUseable;
      default: return true;
    }
  }

  populateInventory() {
    const inv = (InventoryManager.getNonQuestInventory?.() || InventoryManager.getInventory?.() || [])
      .filter((item: ModuleItem) => this.matchesBreakFilter(item));
    this.LB_INVITEMS?.setItems?.(inv);
    this.selectedInv = undefined;
    this.updateBreakFilterButtons();
  }

  onShopSelected(choice: ComponentShopChoice) {
    this.selectedShop = choice;
    this.selectedInv = undefined;
    this.createMode = true;
    this.LB_DESCRIPTION?.setItem?.(choice?.item?.getDescription?.() ?? choice?.item ?? null);
    this.refreshCostLabels(choice?.cost ?? 0);
    const stock = GameState.PartyManager.ComponentCount | 0;
    this.BTN_Accept.disableSelection = !choice || stock < (choice.cost | 0);
  }

  onInvSelected(item: ModuleItem) {
    this.selectedInv = item;
    this.selectedShop = undefined;
    this.createMode = false;
    this.LB_DESCRIPTIONINV?.setItem?.(item?.getDescription?.() ?? item ?? null);
    const refund = componentPieceValue(item?.getGoldPieceValue?.() ?? 0);
    this.refreshCostLabels(refund);
    this.BTN_Accept.disableSelection = !item;
  }

  refreshCostLabels(cost: number) {
    this.LBL_COST_VALUE?.setText?.(String(cost | 0));
    this.refreshStockLabels();
  }

  refreshStockLabels() {
    const stock = GameState.PartyManager.ComponentCount | 0;
    this.LBL_STOCK_VALUE?.setText?.(String(stock));
    this.LBL_CREDITS_VALUE?.setText?.(String(stock));
  }

  onAccept() {
    if(this.createMode){
      this.acceptCreate();
    }else{
      this.acceptBreakdown();
    }
  }

  acceptCreate() {
    const choice = this.selectedShop;
    if(!choice) return;
    const stock = GameState.PartyManager.ComponentCount | 0;
    if(stock < choice.cost) return;

    GameState.PartyManager.ComponentCount = stock - choice.cost;
    const ModuleItemClass = GameState.Module?.ModuleArea?.ModuleItem;
    let grant: ModuleItem | undefined;
    try{
      grant = ModuleItemClass?.FromResRef?.(choice.recipe.label);
    }catch(_e){
      grant = undefined;
    }
    if(grant){
      InventoryManager.addItem(grant);
    }
    this.refreshStockLabels();
    this.populateInventory();
    this.onShopSelected(choice);
  }

  acceptBreakdown() {
    const item = this.selectedInv;
    if(!item) return;
    const refund = componentPieceValue(item.getGoldPieceValue?.() ?? 0);
    InventoryManager.removeItem(item, 1);
    GameState.PartyManager.ComponentCount =
      (GameState.PartyManager.ComponentCount | 0) + refund;
    this.refreshStockLabels();
    this.populateInventory();
    this.selectedInv = undefined;
    this.BTN_Accept.disableSelection = true;
    this.refreshCostLabels(0);
  }
}
