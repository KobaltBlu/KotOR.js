import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GameState } from "@/GameState";
import { LevelUpManager } from "@/managers/LevelUpManager";
import { addSpellToDraft } from "@/engine/rules/level-up";

/**
 * MenuPowerLevelUp — retail CSWGuiPowersLevelUp (pwrlvlup).
 */
export class MenuPowerLevelUp extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DESC_LBL: GUILabel;
  LB_POWERS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_POWER: GUILabel;
  RECOMMENDED_BTN: GUIButton;
  SELECT_BTN: GUIButton;
  ACCEPT_BTN: GUIButton;
  BACK_BTN: GUIButton;

  selectedSpellId: number = -1;
  chosenSpells: number[] = [];

  constructor(){
    super();
    this.gui_resref = 'pwrlvlup';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BACK_BTN?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        // Return to MAINCG host + LEVELUPPNL child
        GameState.MenuManager.CharGenMain?.show?.();
      });

      this.ACCEPT_BTN?.addEventListener('click', (e) => {
        e.stopPropagation();
        const draft = LevelUpManager.draft;
        if(!draft) return;
        if(draft.powerPicksRemaining > 0) return;
        LevelUpManager.powersStepDone = true;
        this.close();
        GameState.MenuManager.MenuLevelUp?.applyStepVisibility?.();
        GameState.MenuManager.CharGenMain?.show?.();
      });

      this.SELECT_BTN?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pickSelected();
      });

      this.RECOMMENDED_BTN?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyRecommended();
      });

      this.LB_POWERS?.addEventListener?.('click', () => {
        // ListBox item selection handled via onSelect if available
      });

      resolve();
    });
  }

  openForLevelUp() {
    this.chosenSpells = [];
    this.selectedSpellId = -1;
    this.buildPowerList();
    this.updateRemaining();
    this.open();
  }

  private updateRemaining() {
    const left = LevelUpManager.draft?.powerPicksRemaining | 0;
    this.REMAINING_SELECTIONS_LBL?.setText?.(String(left));
    this.SELECTIONS_REMAINING_LBL?.setText?.(String(left));
  }

  private buildPowerList() {
    const creature = LevelUpManager.creature;
    const draft = LevelUpManager.draft;
    const cls = creature?.getMainClass?.();
    const spells = GameState.SWRuleSet?.spells || [];
    const list: any[] = [];
    for(let i = 0; i < spells.length; i++){
      const spell = spells[i];
      if(!spell || spell.label == '****') continue;
      const id = typeof spell.id === 'number' ? spell.id : i;
      if(creature?.getHasSpell?.(id)) continue;
      if(draft?.spellsAdded.indexOf(id) >= 0) continue;
      // Prefer force powers usable by class when helper exists
      if(typeof (spell as any).getForceHostile === 'undefined' && !(cls as any)?.spellcaster) continue;
      list.push(spell);
    }
    this.LB_POWERS?.setItems?.(list);
    if(list.length && typeof (this.LB_POWERS as any)?.onItemClick === 'undefined'){
      // Select first by default for keyboard-less UX
      this.selectSpell(list[0]);
    }
    // Hook item click if list box supports setProtoBuilder / onSelect
    if(this.LB_POWERS && !(this.LB_POWERS as any)._levelUpBound){
      (this.LB_POWERS as any)._levelUpBound = true;
      const lb: any = this.LB_POWERS;
      const orig = lb.onItemClick || lb.select;
      lb.addEventListener?.('click', () => {
        const item = lb.selectedItem || lb.getSelectedItem?.();
        if(item) this.selectSpell(item);
      });
      void orig;
    }
  }

  selectSpell(spell: any) {
    const id = typeof spell?.id === 'number' ? spell.id : (spell?.__index | 0);
    this.selectedSpellId = id;
    const name = spell?.name != null
      ? (GameState.TLKManager.GetStringById?.(spell.name)?.Value
        ?? GameState.TLKManager.TLKStrings?.[spell.name]?.Value
        ?? '')
      : '';
    const desc = spell?.description != null
      ? (GameState.TLKManager.GetStringById?.(spell.description)?.Value
        ?? GameState.TLKManager.TLKStrings?.[spell.description]?.Value
        ?? '')
      : '';
    this.LBL_POWER?.setText?.(name);
    this.LB_DESC?.setItem?.(desc);
  }

  pickSelected() {
    const draft = LevelUpManager.draft;
    if(!draft || this.selectedSpellId < 0) return;
    if(!addSpellToDraft(draft, this.selectedSpellId)) return;
    this.chosenSpells.push(this.selectedSpellId);
    this.updateRemaining();
    this.buildPowerList();
  }

  applyRecommended() {
    const draft = LevelUpManager.draft;
    const creature = LevelUpManager.creature;
    const cls = creature?.getMainClass?.();
    if(!draft || !cls) return;
    const spells = GameState.SWRuleSet?.spells || [];
    for(let recom = 1; recom <= 40 && draft.powerPicksRemaining > 0; recom++){
      for(let i = 0; i < spells.length && draft.powerPicksRemaining > 0; i++){
        const spell = spells[i];
        if(!spell || spell.label == '****') continue;
        const id = typeof spell.id === 'number' ? spell.id : i;
        if(creature.getHasSpell(id) || draft.spellsAdded.indexOf(id) >= 0) continue;
        if(typeof (spell as any).getRecom === 'function'){
          if((spell as any).getRecom(cls) != recom) continue;
        }else if(recom > 1){
          continue;
        }
        addSpellToDraft(draft, id);
        this.chosenSpells.push(id);
      }
    }
    this.updateRemaining();
    this.buildPowerList();
  }
}
