import { GameMenu } from "@/gui";
import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { GameState } from "@/GameState";
import { InventoryManager } from "@/managers/InventoryManager";
import type { ModuleCreature, ModuleItem } from "@/module";
import { TwoDAObject } from "@/resource/TwoDAObject";
import {
  CHEMICAL_CREATE_GROUPS,
  SKILL_TREAT_INJURY,
  chemicalCreateCost,
  chemicalRecipeVisible,
  parseChemicalCreateRow,
  treatInjuryDiscountFactor,
  type CraftRecipeRow,
} from "@/game/tsl-crafting";

interface ChemicalShopChoice {
  recipe: CraftRecipeRow;
  item: ModuleItem;
  cost: number;
  getName: () => string;
  getIcon: () => string;
  getStackSize: () => number;
}

/**
 * MenuChemicals — TSL CSWGuiCreateMedicalItem (`chemical_p` / chemicalcreate.2da).
 *
 * Categories Health/Stims/Grenades/Mines (group 0–3). Create spends
 * PartyManager.ChemicalCount at cost = max(1, GetCost()>>1). Breakdown refunds
 * the same sell value into ChemicalCount.
 *
 * @file MenuChemicals.ts
 */
export class MenuChemicals extends GameMenu {

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
  declare BTN_Cancel: GUIButton;
  declare BTN_Examine: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_TITLE2: GUILabel;
  declare BTN_CREATE_HEALTH: GUIButton;
  declare BTN_CREATE_STIMS: GUIButton;
  declare BTN_CREATE_GRENADES: GUIButton;
  declare BTN_CREATE_MINES: GUIButton;
  declare LBL_RELATEDSKILL: GUILabel;
  declare LBL_BAR3: GUILabel;

  skillCharacter: ModuleCreature | undefined;
  createGroup: number = CHEMICAL_CREATE_GROUPS.HEALTH;
  /** true = create from shop list; false = breakdown from inventory */
  createMode: boolean = true;
  shopChoices: ChemicalShopChoice[] = [];
  selectedShop: ChemicalShopChoice | undefined;
  selectedInv: ModuleItem | undefined;
  skillDiscount: number = 0;

  constructor(){
    super();
    this.gui_resref = 'chemical_p';
    this.background = '';
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
          this.onShopSelected(node as ChemicalShopChoice);
        };
      }
      if(this.LB_INVITEMS){
        this.LB_INVITEMS.onSelected = (node: any) => {
          this.createMode = false;
          this.onInvSelected(node as ModuleItem);
        };
      }

      const categories: [GUIButton, number][] = [
        [this.BTN_CREATE_HEALTH, CHEMICAL_CREATE_GROUPS.HEALTH],
        [this.BTN_CREATE_STIMS, CHEMICAL_CREATE_GROUPS.STIMS],
        [this.BTN_CREATE_GRENADES, CHEMICAL_CREATE_GROUPS.GRENADES],
        [this.BTN_CREATE_MINES, CHEMICAL_CREATE_GROUPS.MINES],
      ];
      for(const [btn, group] of categories){
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onCreateFilter(group);
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

  open(args?: { character?: ModuleCreature }) {
    this.skillCharacter = args?.character
      || GameState.PartyManager?.party?.[0]
      || GameState.PartyManager?.Player;
    const rank = this.skillCharacter?.getSkillRank?.(SKILL_TREAT_INJURY) ?? 0;
    this.skillDiscount = treatInjuryDiscountFactor(rank);
    this.createGroup = CHEMICAL_CREATE_GROUPS.HEALTH;
    this.createMode = true;
    super.open();
  }

  show() {
    super.show();
    this.updateRelatedSkill();
    this.populateShop();
    this.populateInventory();
    this.refreshStockLabels();
  }

  updateRelatedSkill() {
    const rank = this.skillCharacter?.getSkillRank?.(SKILL_TREAT_INJURY) ?? 0;
    this.LBL_RELATEDSKILL?.setText?.(`Treat Injury: ${rank}`);
  }

  onCreateFilter(group: number) {
    this.createGroup = group;
    this.createMode = true;
    this.updateFilterButtons();
    this.populateShop();
  }

  updateFilterButtons() {
    const map: [GUIButton, number][] = [
      [this.BTN_CREATE_HEALTH, CHEMICAL_CREATE_GROUPS.HEALTH],
      [this.BTN_CREATE_STIMS, CHEMICAL_CREATE_GROUPS.STIMS],
      [this.BTN_CREATE_GRENADES, CHEMICAL_CREATE_GROUPS.GRENADES],
      [this.BTN_CREATE_MINES, CHEMICAL_CREATE_GROUPS.MINES],
    ];
    for(const [btn, group] of map){
      if(!btn) continue;
      btn.selected = this.createGroup === group;
      btn.hover = this.createGroup === group;
    }
  }

  getChemicalTable(): TwoDAObject | undefined {
    return GameState.TwoDAManager?.datatables?.get('chemicalcreate')
      || GameState.TwoDAManager?.datatables?.get('ChemicalCreate');
  }

  populateShop() {
    this.shopChoices = [];
    this.selectedShop = undefined;
    const table = this.getChemicalTable();
    const ModuleItemClass = GameState.Module?.ModuleArea?.ModuleItem;
    if(!table || !ModuleItemClass){
      this.LB_SHOPITEMS?.setItems?.([]);
      this.refreshCostLabels(0);
      return;
    }

    const getSkillRank = (skill: number) =>
      this.skillCharacter?.getSkillRank?.(skill) ?? 0;

    const keys = Object.keys(table.rows);
    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      const rowIndex = TwoDAObject.normalizeValue(row.__index, 'number', parseInt(keys[i], 10)) as number;
      const recipe = parseChemicalCreateRow(row, rowIndex);
      if(!recipe) continue;
      if(!chemicalRecipeVisible(recipe, this.createGroup, getSkillRank)) continue;

      let item: ModuleItem | undefined;
      try{
        item = ModuleItemClass.FromResRef?.(recipe.label);
      }catch(_e){
        item = undefined;
      }
      if(!item) continue;
      item.initProperties?.();
      const cost = chemicalCreateCost(item.getGoldPieceValue?.() ?? 0);
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
    this.updateFilterButtons();
    if(this.shopChoices.length){
      this.onShopSelected(this.shopChoices[0]);
    }else{
      this.refreshCostLabels(0);
      this.LB_DESCRIPTION?.setItem?.(null);
      this.BTN_Accept.disableSelection = true;
    }
  }

  populateInventory() {
    const inv = InventoryManager.getNonQuestInventory?.() || InventoryManager.getInventory?.() || [];
    this.LB_INVITEMS?.setItems?.(inv);
    this.selectedInv = undefined;
  }

  onShopSelected(choice: ChemicalShopChoice) {
    this.selectedShop = choice;
    this.selectedInv = undefined;
    this.createMode = true;
    this.LB_DESCRIPTION?.setItem?.(choice?.item?.getDescription?.() ?? choice?.item ?? null);
    this.refreshCostLabels(choice?.cost ?? 0);
    const stock = GameState.PartyManager.ChemicalCount | 0;
    this.BTN_Accept.disableSelection = !choice || stock < (choice.cost | 0);
  }

  onInvSelected(item: ModuleItem) {
    this.selectedInv = item;
    this.selectedShop = undefined;
    this.createMode = false;
    this.LB_DESCRIPTIONINV?.setItem?.(item?.getDescription?.() ?? item ?? null);
    const refund = chemicalCreateCost(item?.getGoldPieceValue?.() ?? 0);
    this.refreshCostLabels(refund);
    this.BTN_Accept.disableSelection = !item;
  }

  refreshCostLabels(cost: number) {
    this.LBL_COST_VALUE?.setText?.(String(cost | 0));
    this.refreshStockLabels();
  }

  refreshStockLabels() {
    const stock = GameState.PartyManager.ChemicalCount | 0;
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
    const stock = GameState.PartyManager.ChemicalCount | 0;
    if(stock < choice.cost) return;

    GameState.PartyManager.ChemicalCount = stock - choice.cost;
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
    const refund = chemicalCreateCost(item.getGoldPieceValue?.() ?? 0);
    InventoryManager.removeItem(item, 1);
    GameState.PartyManager.ChemicalCount =
      (GameState.PartyManager.ChemicalCount | 0) + refund;
    this.refreshStockLabels();
    this.populateInventory();
    this.selectedInv = undefined;
    this.BTN_Accept.disableSelection = true;
    this.refreshCostLabels(0);
  }
}
