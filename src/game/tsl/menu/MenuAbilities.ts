import { GameState } from "../../../GameState";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import type { ModuleCreature } from "../../../module/ModuleCreature";
import { MenuAbilities as K1_MenuAbilities } from "../../kotor/KOTOR";
import { GUICreatureSkill } from "../gui/GUICreatureSkill";
import { GUISpellItem } from "../gui/GUISpellItem";
import { GUIFeatItem } from "../gui/GUIFeatItem";

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
export class MenuAbilities extends K1_MenuAbilities {

  declare LB_DESC_FEATS: GUIListBox;
  declare LBL_BAR6: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_INFOBG: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LBL_NAME: GUILabel;
  declare LBL_SKILLRANK: GUILabel;
  declare LBL_RANKVAL: GUILabel;
  declare LBL_BONUS: GUILabel;
  declare LBL_BONUSVAL: GUILabel;
  declare LBL_TOTAL: GUILabel;
  declare LBL_TOTALVAL: GUILabel;
  declare BTN_POWERS: GUIButton;
  declare BTN_SKILLS: GUIButton;
  declare BTN_FEATS: GUIButton;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare LBL_ABILITIES: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare LB_ABILITY: GUIListBox;

  filter: AbilityFilter = AbilityFilter.SKILLS;

  constructor(){
    super();
    this.gui_resref = 'abilities_p';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
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

      resolve();
    });
  }

  show() {
    super.show();
    this.updateFilter();
  }

  getFilteredItems(): any[] {
    switch(this.filter){
      case AbilityFilter.SKILLS:
        return GameState.PartyManager.party[0].skills.slice();
      case AbilityFilter.POWERS:
        return this.buildSpellsList(GameState.PartyManager.party[0]);
      case AbilityFilter.FEATS:
        return this.buildFeatList(GameState.PartyManager.party[0]);
    }
  }

  buildFeatList(creature: ModuleCreature): any[][] {
    const featTable = GameState.TwoDAManager.datatables.get('feat');
    let feats = featTable.rows;
    let featCount = featTable.RowCount;
    let knownFeats = [];
    if(creature){
      knownFeats = creature.getFeats();
    }
    let groups = [];
    for (let i = 0; i < knownFeats.length; i++) {
      let feat = knownFeats[i];
      let group = [];
      let prereqfeat1 = featTable.rows[feat.prereqfeat1];
      let prereqfeat2 = featTable.rows[feat.prereqfeat2];
      if (!prereqfeat1 && !prereqfeat2) {
        group.push(feat);
        for (let j = 0; j < featCount; j++) {
          let chainFeat = feats[j];
          if (chainFeat.prereqfeat1 == feat.__index || chainFeat.prereqfeat2 == feat.__index) {
            if (chainFeat.prereqfeat1 != '****' && chainFeat.prereqfeat2 != '****') {
              group[2] = chainFeat;
            } else {
              group[1] = chainFeat;
            }
          }
        }
        // this.LB_FEATS.addItem(group);
      }
      if(group && group.length){
        groups.push(group);
      }
    }
    // groups.sort((groupa, groupb) => groupa[0].toolscategories > groupb[0].toolscategories ? 1 : -1);
    console.log('feats', groups);
    return groups;
  }

  buildSpellsList(creature: ModuleCreature): any[][] {
    const spellsTable = GameState.TwoDAManager.datatables.get('spells');
    const spells = spellsTable.rows;
    const spellCount = spellsTable.RowCount;
    const allowedTypes = [1, 6];
    const knownSpells: any[] = [];

    const unknownSpells: number[] = [176, 177, 178, 179, 180, 181, 182];

    const allowedSpells: any[] = [];
    for (let i = 0; i < spellCount; i++) {
      const spell = spells[i];
      const id = spell.__index;
      const usertype = parseInt(spell.usertype);

      //skip unsupported spells
      if(allowedTypes.indexOf(usertype) == -1){ continue; }

      if(!GameState.PartyManager.party[0].getHasSpell(id) && unknownSpells.indexOf(id) == -1){ continue; }

      allowedSpells.push(spell);
    }

    console.log('allowedSpells', allowedSpells);

    const rootSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 0; });
    const midSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 1; });
    const endSpells: any[] = allowedSpells.filter((spell) => { return parseInt(spell.forcepriority) === 2; });

    const mapSpells = new Map<number, any[]>();

    for (let i = 0; i < rootSpells.length; i++) {
      const spell = rootSpells[i];
      const id = spell.__index;
      const group = [spell];

      //MID SPELL
      const midSpell = midSpells.find( (curSpell) => {
        const prereqs = curSpell.prerequisites.split('_').map((id:string) => parseInt(id));
        return prereqs[0] == id && GameState.PartyManager.party[0].getHasSpell(curSpell.__index);
      });

      if(midSpell){ 
        group[parseInt(midSpell.forcepriority)] = midSpell; 
      }

      //END SPELL
      const endSpell = endSpells.find( (curSpell) => {
        const prereqs = curSpell.prerequisites.split('_').map((id:string) => parseInt(id));
        return prereqs[0] == id && GameState.PartyManager.party[0].getHasSpell(curSpell.__index);
      });

      if(endSpell){ 
        group[parseInt(endSpell.forcepriority)] = endSpell; 
      }

      mapSpells.set(id, group);
    }

    const groups: any[] = Array.from(mapSpells.values());
    console.log('spells', groups);
    return groups;
  }

  updateFilter(){
    console.log('updateFilter');

    this.LB_ABILITY.show();

    this.LB_DESC.hide();
    this.LB_DESC_FEATS.hide();

    this.LB_DESC.clearItems();
    this.LB_DESC_FEATS.clearItems();
    this.LB_ABILITY.clearItems();
    let items = this.getFilteredItems();

    switch(this.filter){
      case AbilityFilter.SKILLS:
        this.LB_ABILITY.GUIProtoItemClass = GUICreatureSkill;
        this.LB_ABILITY.padding = 0;
        this.LB_DESC.show();
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
        this.LB_DESC.show();
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
        this.LB_DESC_FEATS.show();
        this.LBL_BONUS.hide();
        this.LBL_BONUSVAL.hide();
        this.LBL_TOTAL.hide();
        this.LBL_TOTALVAL.hide();
        this.LBL_SKILLRANK.hide();
        this.LBL_RANKVAL.hide();
        this.LBL_INFOBG.hide();
      break;
    }
    
    console.log(this.filter);
    console.log(this.LB_ABILITY.GUIProtoItemClass);

    for(let i = 0; i < items.length; i++){
      this.LB_ABILITY.addItem(items[i]);
    }
    this.LB_ABILITY.updateList();

  }
  
}
