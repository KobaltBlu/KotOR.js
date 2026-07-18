import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";
import { GUISpellItem } from "@/game/tsl/gui/GUISpellItem";
import { GUICreatureSkill } from "@/game/tsl/gui/GUICreatureSkill";
import { type TalentFeat } from "@/talents/TalentFeat";
import type { TalentSkill } from "@/talents/TalentSkill";

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
          if (chainFeat.prereqFeat1 == feat.id || chainFeat.prereqFeat2 == feat.id) {
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
    if(!spellsTable) return [];
    const spells = spellsTable.rows;
    const spellCount = spellsTable.RowCount;
    const allowedTypes = [1, 6];
    const unknownSpells: number[] = [176, 177, 178, 179, 180, 181, 182];

    const parsePriority = (spell: any): number => {
      const n = parseInt(String(spell.forcepriority ?? ''), 10);
      return Number.isFinite(n) ? n : -1;
    };

    const parsePrereqs = (spell: any): number[] => {
      const raw = String(spell.prerequisites ?? '');
      if(!raw || raw === '****') return [];
      return raw.split('_').map((sid: string) => parseInt(sid, 10)).filter((n) => Number.isFinite(n));
    };

    const familyKey = (spell: any): string => {
      const hostile = parseInt(String(spell.forcehostile ?? ''), 10);
      const friendly = parseInt(String(spell.forcefriendly ?? ''), 10);
      if(Number.isFinite(hostile) && hostile >= 0) return `h:${hostile}`;
      if(Number.isFinite(friendly) && friendly >= 0) return `f:${friendly}`;
      return `id:${spell.__index}`;
    };

    const allowedSpells: any[] = [];
    for (let i = 0; i < spellCount; i++) {
      const spell = spells[i];
      if(!spell) continue;
      const id = spell.__index;
      const usertype = parseInt(String(spell.usertype), 10);

      if(allowedTypes.indexOf(usertype) == -1){ continue; }
      if(!creature.getHasSpell(id) && unknownSpells.indexOf(id) == -1){ continue; }

      allowedSpells.push(spell);
    }

    // Group by forcehostile/forcefriendly family (retail chain), slot by forcepriority.
    const mapSpells = new Map<string, any[]>();
    const claimed = new Set<number>();

    for (let i = 0; i < allowedSpells.length; i++) {
      const spell = allowedSpells[i];
      const priority = parsePriority(spell);
      const key = familyKey(spell);
      let group = mapSpells.get(key);
      if(!group){
        group = [];
        mapSpells.set(key, group);
      }
      const slot = priority >= 0 && priority <= 2 ? priority : group.filter(Boolean).length;
      if(!group[slot]){
        group[slot] = spell;
        claimed.add(spell.__index);
      }
    }

    // Fallback: attach mid/end via prerequisites when family columns are missing.
    for (let i = 0; i < allowedSpells.length; i++) {
      const spell = allowedSpells[i];
      if(claimed.has(spell.__index)) continue;
      const prereqs = parsePrereqs(spell);
      if(!prereqs.length) continue;
      for (const [, group] of mapSpells) {
        const root = group[0];
        const mid = group[1];
        if(root && prereqs[0] == root.__index){
          const slot = parsePriority(spell);
          group[slot >= 0 && slot <= 2 ? slot : 1] = spell;
          claimed.add(spell.__index);
          break;
        }
        if(mid && prereqs[0] == mid.__index){
          group[2] = spell;
          claimed.add(spell.__index);
          break;
        }
      }
    }

    // Orphans (known powers with no family/root) still need a row.
    for (let i = 0; i < allowedSpells.length; i++) {
      const spell = allowedSpells[i];
      if(claimed.has(spell.__index)) continue;
      mapSpells.set(`orphan:${spell.__index}`, [spell]);
      claimed.add(spell.__index);
    }

    const groups: any[][] = [];
    for (const group of mapSpells.values()) {
      // Compact sparse slots so GUISpellItem never walks undefined holes.
      const compact = group.filter((s) => !!s);
      if(compact.length) groups.push(compact);
    }
    return groups;
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
   * Retail CSWGuiInGameAbilities::OnEnterFeat — name + description only.
   */
  selectFeat(feat: TalentFeat | any) {
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
    this.LB_DESC_FEATS?.setItem?.(description || null);
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
        this.LB_ABILITY.padding = 0;
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
        this.LB_ABILITY.padding = 5.5;
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
        this.LB_ABILITY.padding = 5.5;
        this.LB_DESC_FEATS?.show();
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
