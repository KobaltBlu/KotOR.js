import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GameState } from "@/GameState";
import { GUICreatureSkill } from "@/game/tsl/gui/GUICreatureSkill";
import { GUISpellItem } from "@/game/tsl/gui/GUISpellItem";
import { GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { TalentFeat } from "@/talents/TalentFeat";

enum AbilityFilter {
  SKILLS = 1,
  POWERS = 2,
  FEATS = 3
}

/**
 * MenuAbilities class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuAbilities.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuAbilities extends GameMenu {

  LBL_INFOBG: GUILabel;
  LB_DESC: GUIListBox;
  LBL_PORTRAIT: GUILabel;
  LB_ABILITY: GUIListBox;
  LBL_NAME: GUILabel;
  LBL_SKILLRANK: GUILabel;
  LBL_RANKVAL: GUILabel;
  LBL_BONUS: GUILabel;
  LBL_BONUSVAL: GUILabel;
  LBL_TOTAL: GUILabel;
  LBL_TOTALVAL: GUILabel;
  BTN_POWERS: GUIButton;
  BTN_SKILLS: GUIButton;
  BTN_FEATS: GUIButton;
  BTN_EXIT: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;

  filter: AbilityFilter = AbilityFilter.SKILLS;
  selected: any;

  constructor(){
    super();
    this.gui_resref = 'abilities';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.BTN_SKILLS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filter = AbilityFilter.SKILLS;
        this.updateFilter();
      });

      this.BTN_POWERS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filter = AbilityFilter.POWERS;
        this.updateFilter();
      });

      this.BTN_FEATS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filter = AbilityFilter.FEATS;
        this.updateFilter();
      });

      this.LB_ABILITY.onSelected = (item: any) => {
        this.selected = item;
        this.updateSelected();
      };

      resolve();
    });
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_ABI.onHoverIn();
    this.updateFilter();
  }

  getFilteredItems(): any[] {
    switch(this.filter){
      case AbilityFilter.SKILLS:
        return GameState.PartyManager.party[0]?.skills.slice() || [];
      case AbilityFilter.POWERS:
        return this.buildSpellsList(GameState.PartyManager.party[0]);
      case AbilityFilter.FEATS:
        return this.buildFeatList(GameState.PartyManager.party[0]);
    }
  }

  buildFeatList(creature: ModuleCreature): any[][] {
    const feats = GameState.SWRuleSet.feats;
    const featCount = feats.length;
    const knownFeats: TalentFeat[] = creature ? creature.feats : [];
    const groups = [];
    for (let i = 0; i < knownFeats.length; i++) {
      const feat = knownFeats[i];
      const group: TalentFeat[] = [];
      const prereqfeat1 = feats[feat.prereqFeat1];
      const prereqfeat2 = feats[feat.prereqFeat2];
      if (!prereqfeat1 && !prereqfeat2) {
        group.push(feat);
        for (let j = 0; j < featCount; j++) {
          const chainFeat = feats[j];
          if (chainFeat.prereqFeat1 == i || chainFeat.prereqFeat2 == i) {
            if (chainFeat.prereqFeat1 != -1 && chainFeat.prereqFeat2 != -1) {
              group[2] = chainFeat;
            } else {
              group[1] = chainFeat;
            }
          }
        }
      }
      if(group && group.length){
        groups.push(group);
      }
    }
    return groups;
  }

  buildSpellsList(creature: ModuleCreature): any[][] {
    const spellsTable = GameState.TwoDAManager.datatables.get('spells');
    const spells = spellsTable.rows;
    const spellCount = spellsTable.RowCount;
    const allowedTypes = [1, 6];
    const allowedSpells: any[] = [];
    const unknownSpells: number[] = [176, 177, 178, 179, 180, 181, 182];

    for (let i = 0; i < spellCount; i++) {
      const spell = spells[i];
      const id = spell.__index;
      const usertype = parseInt(spell.usertype);
      if(allowedTypes.indexOf(usertype) == -1){ continue; }
      if(!GameState.PartyManager.party[0]?.getHasSpell(id) && unknownSpells.indexOf(id) == -1){ continue; }
      allowedSpells.push(spell);
    }

    const rootSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 0; });
    const midSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 1; });
    const endSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 2; });

    const mapSpells = new Map<number, any[]>();

    for (let i = 0; i < rootSpells.length; i++) {
      const spell = rootSpells[i];
      const id = spell.__index;
      const group = [spell];

      const midSpell = midSpells.find( (curSpell) => {
        const prereqs = curSpell.prerequisites.split('_').map((id:string) => parseInt(id));
        return prereqs[0] == id && GameState.PartyManager.party[0]?.getHasSpell(curSpell.__index);
      });

      if(midSpell){ 
        group[parseInt(midSpell.forcepriority)] = midSpell; 
      }

      const endSpell = endSpells.find( (curSpell) => {
        const prereqs = curSpell.prerequisites.split('_').map((id:string) => parseInt(id));
        return prereqs[0] == id && GameState.PartyManager.party[0]?.getHasSpell(curSpell.__index);
      });

      if(endSpell){ 
        group[parseInt(endSpell.forcepriority)] = endSpell; 
      }

      mapSpells.set(id, group);
    }

    return Array.from(mapSpells.values());
  }

  updateFilter(){
    this.LB_ABILITY.show();
    this.LB_DESC.show();
    this.LB_DESC.clearItems();
    this.LB_ABILITY.clearItems();

    const items = this.getFilteredItems();
    switch(this.filter){
      case AbilityFilter.SKILLS:
        this.LB_ABILITY.GUIProtoItemClass = GUICreatureSkill;
        this.LB_ABILITY.padding = 0;
        this.LBL_BONUS.show();
        this.LBL_BONUSVAL.show();
        this.LBL_TOTAL.show();
        this.LBL_TOTALVAL.show();
        this.LBL_SKILLRANK.show();
        this.LBL_RANKVAL.show();
        this.LBL_INFOBG.show();
      break;
      case AbilityFilter.POWERS:
        this.LB_ABILITY.GUIProtoItemClass = GUISpellItem;
        this.LB_ABILITY.padding = 5.5;
        this.LBL_BONUS.show();
        this.LBL_BONUSVAL.show();
        this.LBL_TOTAL.show();
        this.LBL_TOTALVAL.show();
        this.LBL_SKILLRANK.show();
        this.LBL_RANKVAL.show();
        this.LBL_INFOBG.show();
      break;
      case AbilityFilter.FEATS:
        this.LB_ABILITY.GUIProtoItemClass = GUIFeatItem;
        this.LB_ABILITY.padding = 5.5;
        this.LBL_BONUS.hide();
        this.LBL_BONUSVAL.hide();
        this.LBL_TOTAL.hide();
        this.LBL_TOTALVAL.hide();
        this.LBL_SKILLRANK.hide();
        this.LBL_RANKVAL.hide();
        this.LBL_INFOBG.hide();
      break;
    }

    for(let i = 0; i < items.length; i++){
      this.LB_ABILITY.addItem(items[i]);
    }
    this.LB_ABILITY.updateList();
  }

  updateSelected(){
    this.LB_DESC.clearItems();
    this.LBL_NAME?.setText('');
    this.LBL_SKILLRANK?.setText('');
    this.LBL_RANKVAL?.setText('');
    this.LBL_BONUSVAL?.setText('');
    this.LBL_TOTALVAL?.setText('');

    const item = this.selected;
    if(!item){ return; }

    if(this.filter === AbilityFilter.SKILLS){
      this.LBL_NAME?.setText(item.getName());
      this.LBL_RANKVAL?.setText(item.getRank());
      this.LBL_BONUSVAL?.setText('');
      this.LBL_TOTALVAL?.setText(item.getRank());
      if(item.getDescription){
        this.LB_DESC.addItem(item.getDescription());
      }
      return;
    }

    if(this.filter === AbilityFilter.FEATS){
      const feat = Array.isArray(item) ? item[0] : item;
      if(feat?.getName){
        this.LBL_NAME?.setText(feat.getName());
      }
      if(feat?.getDescription){
        this.LB_DESC.addItem(feat.getDescription());
      }
      return;
    }

    if(this.filter === AbilityFilter.POWERS){
      const spell = Array.isArray(item) ? item.find(Boolean) : item;
      if(spell){
        const name = GameState.TLKManager.GetStringById(parseInt(spell.name))?.Value;
        const desc = GameState.TLKManager.GetStringById(parseInt(spell.spelldesc))?.Value;
        this.LBL_NAME?.setText(name || '');
        if(desc){
          this.LB_DESC.addItem(desc);
        }
      }
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_CHAR.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_MSG.click();
  }
  
}

