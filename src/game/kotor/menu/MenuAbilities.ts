import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";
import { GUISpellItem } from "@/game/tsl/gui/GUISpellItem";
import { GUICreatureSkill } from "@/game/tsl/gui/GUICreatureSkill";
import { type TalentFeat } from "@/talents/TalentFeat";
import type { TalentSpell } from "@/talents/TalentSpell";
import type { TalentSkill } from "@/talents/TalentSkill";
import { SWRuleSet } from "@/engine/rules/SWRuleSet";
import { SkillFlowStatus } from "@/gui/protoitem/protoItemHelpers";


/** Minimal creature surface used by in-game chart builders. */
export type SkillFlowCreature = {
  getHasFeat?: (id: number) => boolean;
  getHasSpell?: (id: number) => boolean;
  getFP?: () => number;
  getAdjustedForcePointCost?: (spell: {
    forcepoints?: number;
    goodEvil?: string;
  }) => number;
};

export type SpellSubRadialFields = {
  forcehostile?: number;
  forcefriendly?: number;
  forcepassive?: number;
  forcepriority?: number;
};

enum AbilityFilter {
  SKILLS = 1,
  POWERS = 2,
  FEATS = 3
}

/** TLK label strrefs — UpdateView / OnEnterPower / OnEnterSkill. */
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
  private static isUnsetPrereq(id: number | null | undefined): boolean {
    if (id == null) return true;
    const n = id | 0;
    return n < 0 || n === 0xffffffff;
  }

  /**
   * feat chain depth for BuildSortedFeatList:
   * 0 = root (no prereqFeat1), 1 = mid (prereqFeat2 unset), 2 = end.
   */
  static featChainDepth(feat: {
    prereqFeat1?: number;
    prereqFeat2?: number;
  }): number {
    if (this.isUnsetPrereq(feat.prereqFeat1)) return 0;
    if (this.isUnsetPrereq(feat.prereqFeat2)) return 1;
    return 2;
  }

  /**
   * BuildSortedFeatList — feats with name != 0, ordered by depth ascending.
   */
  static buildSortedFeatIds(feats: readonly (TalentFeat | undefined | null)[]): number[] {
    const sorted: number[] = [];
    for (let i = 0; i < feats.length; i++) {
      const feat = feats[i];
      if (!feat) continue;
      const nameRef = typeof feat.name === "number" ? feat.name : parseInt(String(feat.name), 10);
      if (!nameRef) continue;

      const depth = this.featChainDepth(feat);
      let inserted = false;
      for (let j = 0; j < sorted.length; j++) {
        const other = feats[sorted[j]];
        if (!other) continue;
        if (depth < this.featChainDepth(other)) {
          sorted.splice(j, 0, i);
          inserted = true;
          break;
        }
      }
      if (!inserted) sorted.push(i);
    }
    return sorted;
  }

  /**
   * CreateFeatChart (in-game).
   * Known roots only; mid/end only when HasFeat. Sparse [root, mid?, end?].
   */
  static createInGameFeatChart(
    creature: SkillFlowCreature,
    feats: readonly (TalentFeat | undefined | null)[] = [],
  ): (TalentFeat | undefined)[][] {
    const sorted = this.buildSortedFeatIds(feats);
    const groups: (TalentFeat | undefined)[][] = [];

    for (let si = 0; si < sorted.length; si++) {
      const rootId = sorted[si];
      const root = feats[rootId];
      if (!root) continue;

      if (!this.isUnsetPrereq(root.prereqFeat1)) {
        break; // past contiguous root block
      }

      if (!creature.getHasFeat?.(rootId)) continue;

      let mid: TalentFeat | undefined;
      let end: TalentFeat | undefined;
      for (let j = si + 1; j < sorted.length; j++) {
        if (mid && end) break;
        const childId = sorted[j];
        const child = feats[childId];
        if (!child) continue;
        if ((child.prereqFeat1 | 0) !== rootId) continue;
        if (!creature.getHasFeat?.(childId)) continue;

        if (this.isUnsetPrereq(child.prereqFeat2)) {
          mid = child;
        } else {
          end = child;
        }
      }

      const group: (TalentFeat | undefined)[] = [root];
      if (mid) group[1] = mid;
      if (end) group[2] = end;
      groups.push(group);
    }

    return groups;
  }

  /**
   * Load subradial encode.
   * Returns the first radial key (FORCEFRIENDLY, then HOSTILE, then PASSIVE order in Load).
   * -1 when no force menu column is set.
   */
  static encodeSpellSubRadial(spell: SpellSubRadialFields): number {
    const priority = Number.isFinite(spell.forcepriority as number) && (spell.forcepriority as number) >= 0
      ? (spell.forcepriority as number) | 0
      : 0;

    // Load builds an array; GetSubRadialSpell(0) is the first entry written.
    // Order in Load: FRIENDLY first (if present), then HOSTILE, then PASSIVE.
    if (Number.isFinite(spell.forcefriendly as number) && (spell.forcefriendly as number) >= 0) {
      return ((spell.forcefriendly as number) * 5 + 1500) * 2 + priority;
    }
    if (Number.isFinite(spell.forcehostile as number) && (spell.forcehostile as number) >= 0) {
      return ((spell.forcehostile as number) * 5 + 500) * 2 + priority;
    }
    if (Number.isFinite(spell.forcepassive as number) && (spell.forcepassive as number) >= 0) {
      return ((spell.forcepassive as number) * 5 + 1000) * 2 + priority;
    }
    return -1;
  }

  /** GetPriority */
  static spellSubRadialPriority(key: number): number {
    if (key < 0) return -1;
    return key % 10;
  }

  /** GetSlot */
  static spellSubRadialSlot(key: number): number {
    if (key < 0) return -1;
    return Math.floor((key % 1000) / 10);
  }

  /** Thousands digit — hostile≈1, passive≈2, friendly≈3 */
  static spellSubRadialFamily(key: number): number {
    if (key < 0) return -1;
    return Math.floor(key / 1000);
  }

  private static spellUserType(spell: TalentSpell | { userType?: number; usertype?: number }): number {
    const raw = (spell as TalentSpell).userType ?? (spell as any).usertype;
    const n = typeof raw === "number" ? raw : parseInt(String(raw ?? 0), 10);
    return Number.isFinite(n) ? n : 0;
  }

  private static spellNameRef(spell: TalentSpell | { name?: number }): number {
    const n = typeof spell.name === "number" ? spell.name : parseInt(String(spell.name ?? 0), 10);
    return Number.isFinite(n) ? n : 0;
  }

  private static spellIdOf(spell: TalentSpell, fallbackIndex: number): number {
    if (typeof spell.id === "number" && Number.isFinite(spell.id)) return spell.id | 0;
    const row = (spell as any).__index ?? (spell as any).__rowlabel;
    if (typeof row === "number" && Number.isFinite(row)) return row | 0;
    return fallbackIndex | 0;
  }

  /**
   * BuildSortedPowerList — usertype==1, name!=0;
   * sort by priority, then family, then slot.
   */
  static buildSortedPowerIds(spells: readonly (TalentSpell | undefined | null)[]): number[] {
    const sorted: number[] = [];
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      if (!spell) continue;
      if (this.spellUserType(spell) !== 1) continue;
      if (!this.spellNameRef(spell)) continue;

      const key = this.encodeSpellSubRadial(spell);
      // Missing subradial sorts like unsigned 0xffffffff priority (before 0).
      const pri = key < 0 ? -1 : this.spellSubRadialPriority(key);
      const fam = key < 0 ? -1 : this.spellSubRadialFamily(key);
      const slot = key < 0 ? -1 : this.spellSubRadialSlot(key);

      let inserted = false;
      for (let j = 0; j < sorted.length; j++) {
        const other = spells[sorted[j]];
        if (!other) continue;
        const oKey = this.encodeSpellSubRadial(other);
        const oPri = this.spellSubRadialPriority(oKey);
        if (pri < oPri) {
          sorted.splice(j, 0, i);
          inserted = true;
          break;
        }
        if (pri === oPri) {
          const oFam = this.spellSubRadialFamily(oKey);
          if (fam < oFam) {
            sorted.splice(j, 0, i);
            inserted = true;
            break;
          }
          if (fam === oFam) {
            const oSlot = this.spellSubRadialSlot(oKey);
            if (slot < oSlot) {
              sorted.splice(j, 0, i);
              inserted = true;
              break;
            }
          }
        }
      }
      if (!inserted) sorted.push(i);
    }
    return sorted;
  }

  private static hasSpellKnown(creature: SkillFlowCreature, id: number): boolean {
    return !!creature.getHasSpell?.(id);
  }

  /**
   * HasSpell with arg3 != 0:
   * known and adjusted force cost ≤ current FP.
   */
  private static hasSpellAffordable(
    creature: SkillFlowCreature,
    spell: TalentSpell,
    id: number,
  ): boolean {
    if (!this.hasSpellKnown(creature, id)) return false;
    const cost = typeof creature.getAdjustedForcePointCost === "function"
      ? creature.getAdjustedForcePointCost({
          forcepoints: spell.forcepoints,
          goodEvil: spell.goodEvil,
        })
      : (spell.forcepoints | 0);
    const fp = typeof creature.getFP === "function" ? creature.getFP() : 0;
    return cost <= fp;
  }

  /**
   * root test in CreatePowerChart: ones digit == 0, OR GetPriority < 0
   * (no subradial → 0xffffffff → signed priority < 0).
   */
  static isSpellChartRoot(key: number): boolean {
    if (key < 0) return true;
    return this.spellSubRadialPriority(key) === 0;
  }

  /**
   * CreatePowerChart with arg2=0 (in-game abilities).
   * Roots: known + root priority. Children: same family/slot; HasSpell afford gate.
   * Sparse [root, mid?, end?].
   */
  static createInGamePowerChart(
    creature: SkillFlowCreature,
    spells: readonly (TalentSpell | undefined | null)[] = [],
  ): (TalentSpell | undefined)[][] {
    const sorted = this.buildSortedPowerIds(spells);
    const groups: (TalentSpell | undefined)[][] = [];

    for (let si = 0; si < sorted.length; si++) {
      const rootIndex = sorted[si];
      const root = spells[rootIndex];
      if (!root) continue;

      const rootKey = this.encodeSpellSubRadial(root);
      // Contiguous root block ends at first mid/end (priority 1+).
      if (!this.isSpellChartRoot(rootKey)) {
        break;
      }

      const rootId = this.spellIdOf(root, rootIndex);
      if (!this.hasSpellKnown(creature, rootId)) continue;

      const rootFam = this.spellSubRadialFamily(rootKey);
      const rootSlot = this.spellSubRadialSlot(rootKey);
      let mid: TalentSpell | undefined;
      let end: TalentSpell | undefined;

      // Orphans with no force columns still get a single-slot row (no children).
      if (rootKey >= 0) {
        for (let j = si + 1; j < sorted.length; j++) {
          if (mid && end) break;
          const childIndex = sorted[j];
          const child = spells[childIndex];
          if (!child) continue;

          const childId = this.spellIdOf(child, childIndex);
          if (!this.hasSpellAffordable(creature, child, childId)) continue;

          const childKey = this.encodeSpellSubRadial(child);
          if (childKey < 0) continue;
          if (this.spellSubRadialFamily(childKey) !== rootFam) continue;
          if (this.spellSubRadialSlot(childKey) !== rootSlot) continue;

          const childPri = this.spellSubRadialPriority(childKey);
          if (childPri === 1) {
            mid = child;
          } else if (childPri === 2) {
            end = child;
          }
        }
      }

      const group: (TalentSpell | undefined)[] = [root];
      if (mid) group[1] = mid;
      if (end) group[2] = end;
      groups.push(group);
    }

    return groups;
  }


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
   * CreateFeatChart (in-game SetCharacter).
   */
  buildFeatList(creature: ModuleCreature): any[][] {
    const feats = GameState.SWRuleSet?.feats ?? SWRuleSet.feats ?? [];
    return MenuAbilities.createInGameFeatChart(creature, feats);
  }

  /**
   * CreatePowerChart (CreatePowerList arg2=0).
   */
  buildSpellsList(creature: ModuleCreature): any[][] {
    const spells = GameState.SWRuleSet?.spells ?? SWRuleSet.spells ?? [];
    return MenuAbilities.createInGamePowerChart(creature, spells);
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
   * OnEnterSkill — populate rank / bonus / total / desc.
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
   * OnEnterPower — force cost with alignment adjust.
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
      const row = GameState.SWRuleSet.forceAdjustments[band];
      if(row){
        const mult = goodEvil === 'G' ? row.goodcost : row.evilcost;
        if(isFinite(mult) && mult > 0){
          // OnEnterPower: ftol(base * mult + 0.5) - base
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
   * in-game feat slots are always SetSkillStatus(6).
   * Selection chrome is the yellow pulsing border (SetSelectedSkill).
   */
  getFeatSlotStatus(_feat: TalentFeat | any): SkillFlowStatus {
    return SkillFlowStatus.InGame;
  }

  /**
   * OnEnterFeat — name + description only.
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

    // UpdateView: selected tab yellow, others blue.
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
