import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";
import { GUISpellItem } from "@/game/tsl/gui/GUISpellItem";
import { GUICreatureSkill } from "@/game/tsl/gui/GUICreatureSkill";
import { type TalentFeat } from "@/talents/TalentFeat";
import type { TalentSkill } from "@/talents/TalentSkill";
import {
  createInGameFeatChart,
  createInGamePowerChart,
} from "@/engine/menu/skill-flow-chart";
import { SWRuleSet } from "@/engine/rules/SWRuleSet";
import { SkillFlowStatus } from "@/gui/protoitem/protoItemHelpers";

enum AbilityFilter {
  SKILLS = 1,
  POWERS = 2,
  FEATS = 3
}

/** TLK label strrefs — retail UpdateView / OnEnterPower / OnEnterSkill. */
const STRREF_SKILL_RANK = 0x62b;
const STRREF_BONUS = 0x7d81;
const STRREF_TOTAL = 0xa3b0;
const STRREF_POWER_RANK = 0x9317;
const STRREF_POWER_TOTAL = 0xa3b1;
const STRREF_ALIGN_LIGHT = 0xa3a2;
const STRREF_ALIGN_DARK = 0xa3a3;
const STRREF_COST = 0xbb10;

const COLOR_GREEN = { r: 0, g: 1, b: 0 };
const COLOR_RED = { r: 1, g: 0, b: 0 };
const COLOR_BLUE = { r: 0, g: 0.658824, b: 0.980392 };

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
  LB_DESC_FEATS: GUIListBox;
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
  /** Currently focused feat in the skill-flow chart (SetSelectedSkill). */
  selectedFeat: TalentFeat | any = null;

  constructor(){
    super();
    this.gui_resref = 'abilities';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve) => {
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

      this.BTN_CHANGE1?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 1){
          GameState.PartyManager.SwitchLeaderAtIndex(1);
          this.refreshAfterPartyChange();
        }
      });
      this.BTN_CHANGE2?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 2){
          GameState.PartyManager.SwitchLeaderAtIndex(2);
          this.refreshAfterPartyChange();
        }
      });

      GameState.PartyManager.AddEventListener('change', () => {
        if(!this.isVisible()) return;
        this.refreshAfterPartyChange();
      });

      resolve();
    });
  }

  /**
   * Refresh party swap portraits (BTN_CHANGE1/2) to match current party order.
   * Mirrors MenuCharacter / MenuEquipment — K1 abilities.gui uses these controls.
   */
  updatePartyMemberButtons() {
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      if(i == 0) continue;
      const btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(!btn_change) continue;
      const partyMember = GameState.PartyManager.party[i];
      if(!partyMember) continue;
      btn_change.show();
      const portraitResRef = partyMember.getPortraitResRef();
      if(btn_change.getFillTextureName() != portraitResRef){
        btn_change.setFillTextureName(portraitResRef);
      }
    }
  }

  updateSelectedPortrait() {
    const creature = GameState.PartyManager.party[0];
    if(!creature || !this.LBL_PORTRAIT) return;
    const portraitResRef = creature.getPortraitResRef();
    if(this.LBL_PORTRAIT.getFillTextureName() != portraitResRef){
      this.LBL_PORTRAIT.setFillTextureName(portraitResRef);
    }
  }

  refreshAfterPartyChange() {
    this.updateSelectedPortrait();
    this.updatePartyMemberButtons();
    this.updateFilter();
  }

  show() {
    super.show();
    this.manager.MenuTop?.LBLH_ABI?.onHoverIn?.();
    this.updateSelectedPortrait();
    this.updatePartyMemberButtons();
    this.updateFilter();
  }

  getFilteredItems(): any[] {
    const creature = GameState.PartyManager.party[0];
    if(!creature) return [];
    switch(this.filter){
      case AbilityFilter.SKILLS:
        return creature.skills.slice();
      case AbilityFilter.POWERS:
        return this.buildSpellsList(creature);
      case AbilityFilter.FEATS:
        return this.buildFeatList(creature);
    }
  }

  /**
   * Retail CSWGuiSkillFlowChart::CreateFeatChart @ 006ce370 (in-game SetCharacter).
   */
  buildFeatList(creature: ModuleCreature): any[][] {
    const feats = GameState.SWRuleSet?.feats ?? SWRuleSet.feats ?? [];
    return createInGameFeatChart(creature, feats);
  }

  /**
   * Retail CSWGuiSkillFlowChart::CreatePowerChart @ 006ce0f0 (CreatePowerList param_2=0).
   */
  buildSpellsList(creature: ModuleCreature): any[][] {
    const spells = GameState.SWRuleSet?.spells ?? SWRuleSet.spells ?? [];
    return createInGamePowerChart(creature, spells);
  }

  private tlk(strRef: number): string {
    return GameState.TLKManager.GetStringById(strRef)?.Value
      ?? GameState.TLKManager.TLKStrings?.[strRef]?.Value
      ?? '';
  }

  private setLabelStrRef(control: GUILabel | undefined, strRef: number) {
    if(!control) return;
    const text = this.tlk(strRef);
    if(text != null && text !== ''){
      control.setText(text);
    }
  }

  private clearDetailPanel() {
    this.LBL_RANKVAL?.setText('');
    this.LBL_BONUSVAL?.setText('');
    this.LBL_TOTALVAL?.setText('');
    this.LBL_NAME?.setText('');
    this.LB_DESC?.setItem?.(null);
    this.LB_DESC_FEATS?.setItem?.(null);
  }

  /** K1 abilities.gui has only LB_DESC; TSL abilities_p also has LB_DESC_FEATS for feats. */
  private featDescriptionList(): GUIListBox | undefined {
    return this.LB_DESC_FEATS ?? this.LB_DESC;
  }

  /**
   * Retail CSWGuiInGameAbilities::OnEnterSkill — populate rank / bonus / total / desc.
   */
  selectSkill(skill: TalentSkill) {
    const creature = GameState.PartyManager.party[0];
    if(!creature || !skill){
      this.clearDetailPanel();
      return;
    }

    const skillId = skill.id | 0;
    const baseRank = creature.getSkillRank(skillId, true);
    const total = creature.getSkillRank(skillId, false);
    const bonus = total - baseRank;

    this.LBL_RANKVAL?.setText(String(baseRank));
    this.LBL_TOTALVAL?.setText(String(total));
    this.LBL_NAME?.setText(skill.getName?.() || '');

    let bonusText = String(bonus);
    if(bonus > 0){
      bonusText = '+' + bonus;
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_GREEN.r, COLOR_GREEN.g, COLOR_GREEN.b);
    }else if(bonus < 0){
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
    }else{
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    }
    this.LBL_BONUSVAL?.setText(bonusText);
    this.setLabelStrRef(this.LBL_BONUS, STRREF_BONUS);

    const description = skill.getDescription?.() || '';
    this.LB_DESC?.setItem?.(description || null);
  }

  /**
   * Retail CSWGuiInGameAbilities::OnEnterPower — force cost with alignment adjust.
   */
  selectPower(spell: any) {
    if(!spell){
      this.clearDetailPanel();
      return;
    }

    const creature = GameState.PartyManager.party[0];
    const base = parseInt(String(spell.forcepoints ?? spell.forcePoints ?? 0), 10) || 0;
    const goodEvil = String(spell.goodevil ?? spell.goodEvil ?? '-').toUpperCase().charAt(0);

    let delta = 0;
    let alignPrefix = '';
    if(creature && (goodEvil === 'G' || goodEvil === 'E')){
      const band = Math.min(10, Math.max(0, Math.floor(creature.getGoodEvil() / 10)));
      const table = GameState.TwoDAManager.datatables.get('forceadjust');
      const row = table?.getRowByIndex?.(band) || table?.rows?.[band] || table?.rows?.[String(band)];
      if(row){
        const mult = parseFloat(goodEvil === 'G' ? (row.goodcost ?? 1) : (row.evilcost ?? 1));
        if(isFinite(mult) && mult > 0){
          // Retail OnEnterPower: ftol(base * mult + 0.5) - base
          delta = Math.floor(base * mult + 0.5) - base;
        }
      }
      if(band < 5){
        alignPrefix = this.tlk(STRREF_ALIGN_LIGHT);
      }else if(band > 5){
        alignPrefix = this.tlk(STRREF_ALIGN_DARK);
      }
    }

    const costWord = this.tlk(STRREF_COST) || 'Cost';
    const bonusLabel = alignPrefix ? `${alignPrefix} ${costWord}` : costWord;
    this.LBL_BONUS?.setText(bonusLabel);

    let bonusText: string;
    if(delta < 0){
      bonusText = String(delta);
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_GREEN.r, COLOR_GREEN.g, COLOR_GREEN.b);
    }else if(delta > 0){
      bonusText = '+' + delta;
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
    }else{
      bonusText = '0';
      this.LBL_BONUSVAL?.setTextColor?.(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    }
    this.LBL_BONUSVAL?.setText(bonusText);
    this.LBL_RANKVAL?.setText(String(base));
    this.LBL_TOTALVAL?.setText(String(base + delta));

    const nameRef = parseInt(String(spell.name), 10);
    this.LBL_NAME?.setText(!isNaN(nameRef) && nameRef >= 0 ? this.tlk(nameRef) : (spell.label || ''));

    const descRef = parseInt(String(spell.spelldesc), 10);
    const description = !isNaN(descRef) && descRef >= 0 ? this.tlk(descRef) : '';
    this.LB_DESC?.setItem?.(description || null);
  }

  /**
   * Retail in-game feat slots are always SetSkillStatus(6).
   * Selection chrome is the yellow pulsing border (SetSelectedSkill).
   */
  getFeatSlotStatus(_feat: TalentFeat | any): SkillFlowStatus {
    return SkillFlowStatus.InGame;
  }

  /**
   * Retail CSWGuiInGameAbilities::OnEnterFeat — name + description only.
   * Also mirrors SetSelectedSkill selection visuals on feat proto items.
   */
  selectFeat(feat: TalentFeat | any) {
    this.selectedFeat = feat || null;
    this.refreshFeatSlotVisuals();

    if(!feat){
      this.clearDetailPanel();
      return;
    }

    const nameRef = typeof feat.name === 'number' ? feat.name : parseInt(String(feat.name), 10);
    const descRef = typeof feat.description === 'number' ? feat.description : parseInt(String(feat.description), 10);

    this.LBL_NAME?.setText(
      !isNaN(nameRef) && nameRef >= 0 ? this.tlk(nameRef) : (feat.label || '')
    );

    const description = !isNaN(descRef) && descRef >= 0 ? this.tlk(descRef) : '';
    this.featDescriptionList()?.setItem?.(description || null);
  }

  /** Refresh SetSkillStatus selection chrome on visible GUIFeatItem rows. */
  refreshFeatSlotVisuals(){
    const children = this.LB_ABILITY?.children;
    if(!children) return;
    for(let i = 0; i < children.length; i++){
      const row = children[i] as any;
      if(typeof row.refreshSlotVisuals === 'function'){
        row.refreshSlotVisuals();
      }
    }
  }

  private firstPowerInList(items: any[][]): any | undefined {
    for(let i = 0; i < items.length; i++){
      const group = items[i];
      if(!group) continue;
      for(let j = 0; j < group.length; j++){
        if(group[j]) return group[j];
      }
    }
    return undefined;
  }

  private firstFeatInList(items: any[][]): TalentFeat | undefined {
    for(let i = 0; i < items.length; i++){
      const group = items[i];
      if(!group) continue;
      for(let j = 0; j < group.length; j++){
        if(group[j]) return group[j];
      }
    }
    return undefined;
  }

  updateFilter(){
    if(!this.LB_ABILITY) return;

    this.LB_ABILITY.show();
    this.LB_DESC?.hide();
    this.LB_DESC_FEATS?.hide();
    this.LB_DESC?.setItem?.(null);
    this.LB_DESC_FEATS?.setItem?.(null);
    const items = this.getFilteredItems();

    // Retail UpdateView: selected tab yellow, others blue.
    const yellow = { r: 1, g: 1, b: 0 };
    const blue = COLOR_BLUE;
    const paintTab = (btn: GUIButton | undefined, selected: boolean) => {
      if(!btn?.setTextColor) return;
      const c = selected ? yellow : blue;
      btn.setTextColor(c.r, c.g, c.b);
    };
    paintTab(this.BTN_SKILLS, this.filter === AbilityFilter.SKILLS);
    paintTab(this.BTN_POWERS, this.filter === AbilityFilter.POWERS);
    paintTab(this.BTN_FEATS, this.filter === AbilityFilter.FEATS);

    switch(this.filter){
      case AbilityFilter.SKILLS:
        this.LB_ABILITY.setProtoBuilder(GUICreatureSkill);
        // GFF LB_ABILITY PADDING=0 — do not override (inventory Pass AN lesson).
        this.LB_DESC?.show();
        this.LBL_BONUS?.show();
        this.LBL_BONUSVAL?.show();
        this.LBL_TOTAL?.show();
        this.LBL_TOTALVAL?.show();
        this.LBL_SKILLRANK?.show();
        this.LBL_RANKVAL?.show();
        this.LBL_INFOBG?.show();
        this.setLabelStrRef(this.LBL_SKILLRANK, STRREF_SKILL_RANK);
        this.setLabelStrRef(this.LBL_BONUS, STRREF_BONUS);
        this.setLabelStrRef(this.LBL_TOTAL, STRREF_TOTAL);
        this.LB_ABILITY.onSelected = (skill: TalentSkill) => {
          this.selectSkill(skill);
        };
        this.LB_ABILITY.setItems(items.length ? items : [], items.length ? { selectIndex: 0 } : undefined);
      break;
      case AbilityFilter.POWERS:
        this.LB_ABILITY.setProtoBuilder(GUISpellItem);
        this.LB_DESC?.show();
        this.LBL_BONUS?.show();
        this.LBL_BONUSVAL?.show();
        this.LBL_TOTAL?.show();
        this.LBL_TOTALVAL?.show();
        this.LBL_SKILLRANK?.show();
        this.LBL_RANKVAL?.show();
        this.LBL_INFOBG?.show();
        this.setLabelStrRef(this.LBL_SKILLRANK, STRREF_POWER_RANK);
        this.setLabelStrRef(this.LBL_TOTAL, STRREF_POWER_TOTAL);
        this.LB_ABILITY.onSelected = (group: any[]) => {
          const spell = Array.isArray(group) ? group.find((s) => !!s) : group;
          this.selectPower(spell);
        };
        this.LB_ABILITY.setItems(items);
        {
          const first = this.firstPowerInList(items as any[][]);
          if(first) this.selectPower(first);
          else this.clearDetailPanel();
        }
      break;
      case AbilityFilter.FEATS:
        this.LB_ABILITY.setProtoBuilder(GUIFeatItem);
        // K1: only LB_DESC exists. TSL: LB_DESC_FEATS for feats tab.
        this.featDescriptionList()?.show();
        this.LBL_BONUS?.hide();
        this.LBL_BONUSVAL?.hide();
        this.LBL_TOTAL?.hide();
        this.LBL_TOTALVAL?.hide();
        this.LBL_SKILLRANK?.hide();
        this.LBL_RANKVAL?.hide();
        this.LBL_INFOBG?.hide();
        this.LB_ABILITY.onSelected = (group: TalentFeat[]) => {
          const feat = Array.isArray(group) ? group.find((f) => !!f) : group;
          this.selectFeat(feat);
        };
        this.LB_ABILITY.setItems(items);
        {
          const first = this.firstFeatInList(items as any[][]);
          if(first) this.selectFeat(first);
          else this.clearDetailPanel();
        }
      break;
    }
  }

}
