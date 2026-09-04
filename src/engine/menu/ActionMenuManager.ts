import { GameState } from "@/GameState";
import { ActionMenuPanel } from "@/engine/menu/ActionMenuPanel";
import { ActionMenuItem } from "@/engine/menu/ActionMenuItem";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { IActionPanelLists } from "@/interface/gui/IActionPanelLists";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ActionType } from "@/enums/actions/ActionType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { ActionParameterType, ModuleObjectConstant, ModuleTriggerType } from "@/enums";
import { TalentFeat } from "@/talents/TalentFeat";
import { TalentObject } from "@/talents/TalentObject";
import { TalentSpell } from "@/talents/TalentSpell";
import {
  UsableItemMask,
  getMineStrengthLevel,
  getUsableItemMenuName,
  isDoorOrPlaceableMineItem,
  isGrenadeHostileItem,
  isLeaderUsableItem,
  isPlaceableTargetUseItem,
  isSecuritySpikeItem,
  isUsableItemActive,
} from "@/engine/menu/action-menu-usable";
import { shouldShowCounterSpellAction } from "@/combat/spell-cast-gates";

/** Appearance racialtype 5 (droid) — retail global. */
const APPEARANCE_RACIALTYPE_DROID = 5;
/** Appearance racialtype 6 — retail global. */
const APPEARANCE_RACIALTYPE_ALT = 6;

/** Spell exclusion flags passed into GetMenuInfo (GetHostileForcePowers). */
const ForceMenuExclusion = {
  NONE: 0,
  /** Target appearance racialtype == 6 */
  RACIALTYPE_ALT: 1,
  /** Target appearance racialtype == 5 (droid) */
  DROID: 2,
  /** Target is not a creature */
  NON_CREATURE: 4,
} as const;

/**
 * K1 ranges.2da secondary values used by GetMinSpellRange.
 * P/T share Touch (row 1); W uses Throw row 19.
 */
const FORCE_MENU_MIN_RANGE_FALLBACK: Record<string, number> = {
  P: 0,
  T: 0,
  S: 0,
  M: 0,
  L: 0,
  W: 5,
};

type ForceMenuMode = 'hostile' | 'friendly';

interface ForceMenuSpellEntry {
  spell: TalentSpell;
  /** Equipped item that owns this power (droid GetEquipmentForcePowers). */
  item?: ModuleItem;
  sortIndex: number;
  priority: number;
}

const MELEE_FEAT_CHAINS = [
  [81, 19, 8],   // Master / Improved / Critical Strike
  [53, 91, 11],  // Master / Improved / Flurry
  [83, 17, 28],  // Master / Improved / Power Attack
];

const RANGED_FEAT_CHAINS = [
  [82, 18, 29],  // Master / Improved / Power Blast
  [26, 92, 30],  // Master / Improved / Rapid Shot
  [77, 20, 31],  // Master / Improved / Sniper Shot
];

const EQUIP_FORCE_SLOTS: (keyof ModuleCreature['equipment'])[] = [
  'HEAD', 'ARMOR', 'ARMS', 'RIGHTHAND', 'LEFTHAND',
  'LEFTARMBAND', 'RIGHTARMBAND', 'IMPLANT', 'BELT',
  'RIGHTHAND2', 'LEFTHAND2', 'CLAW1', 'CLAW2', 'CLAW3',
];

/** TSL GetStances / GetMenuInfo form spell id range (0x102–0x10C). */
const STANCE_FORM_SPELL_MIN = 0x102;
const STANCE_FORM_SPELL_MAX = 0x10c;

/** TSL trap Force counters: Destroy Droid / Disable Droid / Shock (by mine strength). */
const MINE_FORCE_SPELL_DESTROY = 0xd;
const MINE_FORCE_SPELL_DISABLE = 0xc;
const MINE_FORCE_SPELL_SHOCK = 0x2f;

/**
 * ActionMenuManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * Populates mipc personal/target action slots like retail
 * {GetPersonalActions,GetTargetActions}.
 *
 * @file ActionMenuManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuManager {

  static ActionMenuPanel: typeof ActionMenuPanel = ActionMenuPanel;
  static ActionMenuItem: typeof ActionMenuItem = ActionMenuItem;

  static TARGET_MENU_COUNT = 3;
  static SELF_MENU_COUNT = 4;

  static oPC: ModuleCreature;
  static oTarget: ModuleObject;
  /**
   * When the look-at / selected target changes, slot 0 defaults to Attack
   * (retail appends Attack after combat feats). Per-frame rebuilds must not
   * reset the player's cycled selection (Power Attack, Flurry, …).
   */
  static #preferDefaultAttack = false;

  static ActionPanels: IActionPanelLists = {
    targetPanels: [],
    selfPanels: [],
  };

  static SetPC(oPC: ModuleCreature){
    ActionMenuManager.oPC = oPC;
  }

  static SetTarget(oTarget: ModuleObject){
    if(ActionMenuManager.oTarget !== oTarget){
      ActionMenuManager.#preferDefaultAttack = true;
    }
    ActionMenuManager.oTarget = oTarget;
  }

  static InitActionMenuPanels(){
    ActionMenuManager.TARGET_MENU_COUNT = 3;
    ActionMenuManager.SELF_MENU_COUNT = (GameState.GameKey == GameEngineType.KOTOR ? 4 : 6);
    ActionMenuManager.ActionPanels = {
      targetPanels: [],
      selfPanels: [],
    };

    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i] = new GameState.ActionMenuManager.ActionMenuPanel();
    }

    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i] = new GameState.ActionMenuManager.ActionMenuPanel();
    }
  }

  static areaIsRestricted(): boolean {
    return !!ActionMenuManager.oPC?.area?.restrictMode;
  }

  /** TSL DoorSaber gate: main-hand (RIGHTHAND / inventory slot 0x10) lightsaber only. */
  static oPCHasMainHandLightsaber(): boolean {
    const pc = ActionMenuManager.oPC;
    return !!pc?.equipment?.RIGHTHAND?.isLightsaber?.();
  }

  static tlkName(strRef: number, fallback: string = ''): string {
    return GameState.TLKManager?.GetStringById?.(strRef)?.Value || fallback;
  }

  /**
   * Retail GetCombatFeatsSkills → CheckFeat: one highest-owned feat per chain,
   * in the fixed menu order used by K1.
   */
  static getCombatMenuFeatIds(
    hasFeat: (id: number) => boolean,
    ranged: boolean
  ): number[] {
    const chains = ranged ? RANGED_FEAT_CHAINS : MELEE_FEAT_CHAINS;
    const result: number[] = [];
    for(let i = 0; i < chains.length; i++){
      const chain = chains[i];
      for(let j = 0; j < chain.length; j++){
        if(hasFeat(chain[j])){
          result.push(chain[j]);
          break;
        }
      }
    }
    return result;
  }

  static #isCreatureLike(target: ModuleObject | undefined): target is ModuleCreature {
    return !!(target && typeof (target as ModuleCreature).getAppearance === 'function');
  }

  /** Retail GetHostileForcePowers tmp14 — exclusion bits for the current target. */
  static getHostileTargetExclusionFlags(target: ModuleObject | undefined): number {
    if(!ActionMenuManager.#isCreatureLike(target)){
      return ForceMenuExclusion.NON_CREATURE;
    }
    const racialtype = target.getAppearance()?.racialtype ?? -1;
    if(racialtype === APPEARANCE_RACIALTYPE_DROID){
      return ForceMenuExclusion.DROID;
    }
    if(racialtype === APPEARANCE_RACIALTYPE_ALT){
      return ForceMenuExclusion.RACIALTYPE_ALT;
    }
    return ForceMenuExclusion.NONE;
  }

  /** Retail: include when `(spell.exclusion & flags) == 0`. */
  static spellPassesForceMenuExclusion(spell: TalentSpell, flags: number): boolean {
    return ((spell.exclusion | 0) & (flags | 0)) === 0;
  }

  /** retail secondary_ranges used by GetMinSpellRange. */
  static resolveForceMenuMinRange(rangeLetter: string): number {
    const key = (rangeLetter || '').toUpperCase();
    if(Object.prototype.hasOwnProperty.call(FORCE_MENU_MIN_RANGE_FALLBACK, key)){
      return FORCE_MENU_MIN_RANGE_FALLBACK[key];
    }
    return 0;
  }

  /**
   * Retail GetMenuInfo range gate: disable when secondary > 0 and
   * distanceSq <= secondary² (too close). Max/primary range is not checked here.
   */
  static isWithinForceMenuMinRange(rangeLetter: string, distanceSq: number): boolean {
    const minRange = ActionMenuManager.resolveForceMenuMinRange(rangeLetter);
    if(!(minRange > 0)) return true;
    return distanceSq > minRange * minRange;
  }

  /** Retail forbid/require item-mask checks from GetMenuInfo. */
  static passesForceItemMask(spell: TalentSpell, forceItemMask: number): boolean {
    const forbid = spell.forbiditemmask | 0;
    const require = spell.requireitemmask | 0;
    if((forbid & forceItemMask) !== 0) return false;
    if((require & forceItemMask) !== require) return false;
    return true;
  }

  static isForceMenuSpellEnabled(
    spell: TalentSpell,
    opts: {
      resource: number;
      cost: number;
      distanceSq: number;
      forceItemMask: number;
    }
  ): boolean {
    if(opts.cost > opts.resource) return false;
    if(!ActionMenuManager.isWithinForceMenuMinRange(spell.range, opts.distanceSq)) return false;
    if(!ActionMenuManager.passesForceItemMask(spell, opts.forceItemMask)) return false;
    return true;
  }

  static #sortKeyForMode(spell: TalentSpell, mode: ForceMenuMode): number {
    const raw = mode === 'hostile' ? spell.forcehostile : spell.forcefriendly;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : -1;
  }

  static #priorityOf(spell: TalentSpell): number {
    const p = spell.forcepriority;
    if(typeof p !== 'number' || !Number.isFinite(p) || p < 0) return 0;
    return p | 0;
  }

  /**
   * Retail GetMenuInfo known-spell pass: filter by menu column + exclusion,
   * keep highest FORCEPRIORITY per sort index, ascending sort order.
   */
  static buildForceMenuSpellList(
    spells: TalentSpell[],
    mode: ForceMenuMode,
    exclusionFlags: number = ForceMenuExclusion.NONE
  ): ForceMenuSpellEntry[] {
    const bySort = new Map<number, ForceMenuSpellEntry>();

    for(let i = 0; i < spells.length; i++){
      const spell = spells[i];
      if(!spell) continue;
      const sortIndex = ActionMenuManager.#sortKeyForMode(spell, mode);
      if(sortIndex < 0) continue;
      if(!ActionMenuManager.spellPassesForceMenuExclusion(spell, exclusionFlags)) continue;

      const priority = ActionMenuManager.#priorityOf(spell);
      const existing = bySort.get(sortIndex);
      if(!existing || existing.priority < priority){
        bySort.set(sortIndex, { spell, sortIndex, priority });
      }
    }

    return Array.from(bySort.values()).sort((a, b) => a.sortIndex - b.sortIndex);
  }

  /** Retail caster appearance.racialtype == 5 → GetEquipmentForcePowers for hostile menu. */
  static isDroidForceMenuCaster(creature: ModuleCreature | undefined): boolean {
    if(!creature) return false;
    return creature.getAppearance()?.racialtype === APPEARANCE_RACIALTYPE_DROID;
  }

  /**
   * Retail GetEquipmentForcePowers — hostile (category 1) powers from equipped items.
   */
  static buildEquipmentForceMenuSpellList(
    creature: ModuleCreature,
    exclusionFlags: number
  ): ForceMenuSpellEntry[] {
    const collected: TalentSpell[] = [];
    const itemBySpellId = new Map<number, ModuleItem>();

    for(let i = 0; i < EQUIP_FORCE_SLOTS.length; i++){
      const item = creature.equipment[EQUIP_FORCE_SLOTS[i]] as ModuleItem | undefined;
      if(!item?.getSpells) continue;
      const spells = item.getSpells() || [];
      for(let j = 0; j < spells.length; j++){
        const spell = spells[j];
        if(!spell || ActionMenuManager.#sortKeyForMode(spell, 'hostile') < 0) continue;
        if(!ActionMenuManager.spellPassesForceMenuExclusion(spell, exclusionFlags)) continue;
        collected.push(spell);
        itemBySpellId.set(spell.id, item);
      }
    }

    const list = ActionMenuManager.buildForceMenuSpellList(collected, 'hostile', exclusionFlags);
    for(let i = 0; i < list.length; i++){
      list[i].item = itemBySpellId.get(list[i].spell.id);
    }
    return list;
  }

  /** Retail GetSelfForcePowers → personal slot 0. */
  static populateSelfForcePowers(){
    if(!ActionMenuManager.oPC) return;
    // GetMenuInfo returns empty while area restrict_mode != 0.
    if(ActionMenuManager.areaIsRestricted()) return;

    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();
    // Self uses known class spells only (not armband CastSpell props).
    const entries = ActionMenuManager.buildForceMenuSpellList(
      ActionMenuManager.oPC.getClassSpells(),
      'friendly'
    );

    for(let i = 0; i < entries.length; i++){
      const { spell } = entries[i];
      const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
      // Retail GetSelfForcePowers passes distanceSq = 0.0001
      const enabled = ActionMenuManager.isForceMenuSpellEnabled(spell, {
        resource,
        cost,
        distanceSq: 0.0001,
        forceItemMask,
      });
      ActionMenuManager.ActionPanels.selfPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: spell,
        target: ActionMenuManager.oPC,
        icon: spell.iconresref,
        enabled,
        name: spell.name || spell.label || '',
      }));
    }
  }

  /** Retail GetHostileForcePowers → target slot 1. */
  static populateHostileForcePowers(){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget) return;
    if(ActionMenuManager.areaIsRestricted()) return;

    const exclusionFlags = ActionMenuManager.getHostileTargetExclusionFlags(ActionMenuManager.oTarget);
    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();
    const dx = ActionMenuManager.oTarget.position.x - ActionMenuManager.oPC.position.x;
    const dy = ActionMenuManager.oTarget.position.y - ActionMenuManager.oPC.position.y;
    const dz = ActionMenuManager.oTarget.position.z - ActionMenuManager.oPC.position.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;

    const entries = ActionMenuManager.isDroidForceMenuCaster(ActionMenuManager.oPC)
      ? ActionMenuManager.buildEquipmentForceMenuSpellList(ActionMenuManager.oPC, exclusionFlags)
      : ActionMenuManager.buildForceMenuSpellList(
          ActionMenuManager.oPC.getClassSpells(),
          'hostile',
          exclusionFlags
        );

    for(let i = 0; i < entries.length; i++){
      const entry = entries[i];
      const spell = entry.spell;
      let enabled: boolean;
      if(entry.item){
        // GetEquipmentForcePowers: charges + item masks (no FP gate).
        enabled = isUsableItemActive(ActionMenuManager.oPC, entry.item)
          && ActionMenuManager.isForceMenuSpellEnabled(spell, {
            resource: Number.POSITIVE_INFINITY,
            cost: 0,
            distanceSq,
            forceItemMask,
          });
      }else{
        const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
        enabled = ActionMenuManager.isForceMenuSpellEnabled(spell, {
          resource,
          cost,
          distanceSq,
          forceItemMask,
        });
      }
      ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: spell,
        item: entry.item,
        target: ActionMenuManager.oTarget,
        icon: spell.iconresref || entry.item?.getIcon?.() || '',
        enabled,
        name: spell.name || spell.label || '',
      }));
    }
  }

  /** Retail GetUsableItems(mask) for a personal slot. */
  static populateUsableItems(panelIndex: number, mask: number){
    if(!ActionMenuManager.oPC) return;
    const panel = ActionMenuManager.ActionPanels.selfPanels[panelIndex];
    if(!panel) return;

    // Retail skips equipped bands/belt in restricted areas, but still scans
    // inventory so plot items can pass IsLeaderUsableItem.
    if(!ActionMenuManager.areaIsRestricted()){
      const equipSlots: (keyof ModuleCreature['equipment'])[] = ['LEFTARMBAND', 'RIGHTARMBAND', 'BELT'];
      for(let i = 0; i < equipSlots.length; i++){
        const item = ActionMenuManager.oPC.equipment[equipSlots[i]] as ModuleItem;
        if(!item) continue;
        if(!isLeaderUsableItem(ActionMenuManager.oPC, item, true, mask)) continue;
        panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
          item,
          target: ActionMenuManager.oPC,
          icon: item.getIcon(),
          enabled: isUsableItemActive(ActionMenuManager.oPC, item, true),
          name: getUsableItemMenuName(item),
        }));
      }
    }

    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!item) continue;
      if(!isLeaderUsableItem(ActionMenuManager.oPC, item, false, mask)) continue;
      panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target: ActionMenuManager.oPC,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item, false),
        name: getUsableItemMenuName(item),
      }));
    }
  }

  /** Retail GetHostileItems — grenades on hostile creature/placeable target slot 2. */
  static populateHostileItems(){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget || ActionMenuManager.areaIsRestricted()) return;
    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!isGrenadeHostileItem(item)) continue;
      ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target: ActionMenuManager.oTarget,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item),
        name: item.getName(),
      }));
    }
  }

  /**
   * Retail GetTargetActions CounterSpell when the hostile target is mid-cast
   * (SpellCastRound / live SpellCastInstance). Slot 1 (hostile Force panel).
   */
  static populateCounterSpell(){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget) return;
    if(!(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleCreature)) return;
    const target = ActionMenuManager.oTarget as ModuleCreature;
    if(!shouldShowCounterSpellAction({
      restricted: ActionMenuManager.areaIsRestricted(),
      isSelf: target === ActionMenuManager.oPC,
      targetDead: !!target.isDead?.(),
      hasActiveSpellCast: !!target.hasActiveSpellCast?.(),
      spellCastRound: !!target.combatRound?.spellCastRound,
    })){
      return;
    }

    ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
      action: {
        type: ActionType.ActionCounterSpell,
        object: target,
        talent: undefined,
      },
      target,
      icon: 'ir_counter',
      name: 'Counter Spell',
      enabled: true,
    }));
  }

  /**
   * Retail door/placeable GetUseItems → GetSpikeDetails(1):
   * security spikes after Security on locked targets (TSL).
   */
  static populateSecuritySpikes(target: ModuleObject){
    if(!ActionMenuManager.oPC || !target) return;
    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!isSecuritySpikeItem(item)) continue;
      ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item),
        name: item.getName(),
      }));
    }
  }

  /**
   * Retail placeable GetUseItems: CastSpell + ItemTargeting == 2 (TSL).
   */
  static populatePlaceableUseItems(target: ModuleObject){
    if(!ActionMenuManager.oPC || !target) return;
    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!isPlaceableTargetUseItem(item)) continue;
      ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item),
        name: item.getName(),
      }));
    }
  }

  /**
   * Retail GetDoorInterfaceMines / GetPlaceableInterfaceMines → target slot 2.
   * Client pre-gate: trapFlag clear (door / placeable).
   */
  static populateDoorOrPlaceableMines(target: ModuleObject, plantStrRef: number = 0xbbd9){
    if(!ActionMenuManager.oPC || !target) return;
    if(ActionMenuManager.areaIsRestricted()) return;
    if(target.trapFlag) return;
    if(!ActionMenuManager.oPC.getCanUseSkill(SkillType.DEMOLITIONS)) return;

    const inventory = ActionMenuManager.oPC.getInventory() || [];
    const plantLabel = ActionMenuManager.tlkName(plantStrRef, 'Plant');
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!isDoorOrPlaceableMineItem(item)) continue;

      const action = new GameState.ActionFactory.ActionSetMine();
      action.setOwner(ActionMenuManager.oPC as ModuleObject);
      action.setParameter(0, ActionParameterType.DWORD, item);
      action.setParameter(1, ActionParameterType.DWORD, target);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(3, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(4, ActionParameterType.FLOAT, target.position.z);

      const stack = item.getStackSize?.() | 0;
      const stackSuffix = stack > 1 ? ` (${stack})` : '';
      ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        action,
        item,
        target,
        icon: item.getIcon(),
        name: `${item.getName()} (${plantLabel})${stackSuffix}`,
      }));
    }
  }

  /**
   * Retail GetTargetActions slot 2 — one best mine-counter Force power.
   */
  static populateTrapMineForcePowers(trapType: number){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget) return;
    if(ActionMenuManager.areaIsRestricted()) return;

    const strength = getMineStrengthLevel(trapType);
    if(strength < 0) return;

    let spellId = -1;
    if(strength < 3 && ActionMenuManager.oPC.getHasSpell(MINE_FORCE_SPELL_DESTROY)){
      spellId = MINE_FORCE_SPELL_DESTROY;
    }else if(strength < 2 && ActionMenuManager.oPC.getHasSpell(MINE_FORCE_SPELL_DISABLE)){
      spellId = MINE_FORCE_SPELL_DISABLE;
    }else if(strength === 0 && ActionMenuManager.oPC.getHasSpell(MINE_FORCE_SPELL_SHOCK)){
      spellId = MINE_FORCE_SPELL_SHOCK;
    }
    if(spellId < 0) return;

    const spell = ActionMenuManager.oPC.getSpell(spellId);
    if(!spell) return;

    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();
    const dx = ActionMenuManager.oTarget.position.x - ActionMenuManager.oPC.position.x;
    const dy = ActionMenuManager.oTarget.position.y - ActionMenuManager.oPC.position.y;
    const dz = ActionMenuManager.oTarget.position.z - ActionMenuManager.oPC.position.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;
    const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
    const enabled = ActionMenuManager.isForceMenuSpellEnabled(spell, {
      resource,
      cost,
      distanceSq,
      forceItemMask,
    });

    ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
      talent: spell,
      target: ActionMenuManager.oTarget,
      icon: spell.iconresref,
      enabled,
      name: spell.name || spell.label || '',
    }));
  }

  /** Retail GetBehaviors → personal slot 4 (TSL). */
  static populateBehaviors(){
    if(!ActionMenuManager.oPC || GameState.GameKey !== GameEngineType.TSL) return;
    const table = GameState.TwoDAManager?.datatables?.get?.('aiscripts');
    if(!table?.rows) return;

    const panel = ActionMenuManager.ActionPanels.selfPanels[4];
    if(!panel) return;

    // Retail clamps invalid AIState to Aggressive (9).
    let current = ActionMenuManager.oPC.aiState | 0;
    if(current !== 9 && current !== 0xb && current !== 0xc && current !== 0xd){
      current = 9;
      ActionMenuManager.oPC.aiState = 9;
    }

    const lastClass = ActionMenuManager.oPC.classes?.[ActionMenuManager.oPC.classes.length - 1];
    const isJedi = !!lastClass?.isJedi?.();
    const keys = Object.keys(table.rows);

    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      if(!row) continue;
      const aiState = parseInt(String(row.aistate ?? row.AISTATE ?? '0'), 10) | 0;
      // Skip Defensive (AISTATE 10).
      if(aiState === 10) continue;

      let nameStrRef = parseInt(String(row.name_strref ?? row.NAME_STRREF ?? '0'), 10) | 0;
      // Support (AISTATE 13): non-Jedi uses grenadier TLK 0x1ec65.
      if(aiState === 0xd && !isJedi){
        nameStrRef = 0x1ec65;
      }

      let icon = 'ib_aggressive';
      if(aiState === 0xb) icon = 'ib_ranged';
      else if(aiState === 0xc) icon = 'ib_stationary';
      else if(aiState === 0xd) icon = isJedi ? 'ib_jedisupport' : 'ib_grenadier';

      panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
        target: ActionMenuManager.oPC,
        icon,
        name: ActionMenuManager.tlkName(nameStrRef, String(row.label || '')),
        aiState,
        enabled: true,
      }));
    }

    // Prefer the creature's current behavior as the selected entry.
    for(let i = 0; i < panel.actions.length; i++){
      if((panel.actions[i].aiState | 0) === current){
        panel.selectedIndex = i;
        break;
      }
    }
  }

  /** Retail GetStances → personal slot 5 (TSL Jedi Forms via GetMenuInfo). */
  static populateStances(){
    if(!ActionMenuManager.oPC || GameState.GameKey !== GameEngineType.TSL) return;
    // GetMenuInfo returns empty while restrict_mode != 0.
    if(ActionMenuManager.areaIsRestricted()) return;

    const panel = ActionMenuManager.ActionPanels.selfPanels[5];
    if(!panel) return;

    const spells = ActionMenuManager.oPC.getClassSpells() || [];
    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();

    for(let i = 0; i < spells.length; i++){
      const spell = spells[i];
      if(!spell) continue;
      const id = spell.id | 0;
      if(id < STANCE_FORM_SPELL_MIN || id > STANCE_FORM_SPELL_MAX) continue;

      const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
      const enabled = ActionMenuManager.isForceMenuSpellEnabled(spell, {
        resource,
        cost,
        distanceSq: 0.0001,
        forceItemMask,
      });

      panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: spell,
        target: ActionMenuManager.oPC,
        icon: spell.iconresref,
        enabled,
        name: spell.name || spell.label || '',
        formId: id,
      }));
    }

    const active = ActionMenuManager.oPC.getCurrentForm?.() | 0;
    if(active){
      for(let i = 0; i < panel.actions.length; i++){
        if((panel.actions[i].formId | 0) === active){
          panel.selectedIndex = i;
          break;
        }
      }
    }
  }

  static UpdateMenuActions(){
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i].clearActions();
    }

    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i].clearActions();
    }

    if(!ActionMenuManager.oPC){
      ActionMenuManager.#preferDefaultAttack = false;
      return ActionMenuManager.ActionPanels;
    }

    const securityTalent = ActionMenuManager.oPC.skills[SkillType.SECURITY];
    const bCanUseSecurity = ActionMenuManager.oPC.getCanUseSkill(SkillType.SECURITY);
    const bCanUseDemolitions = ActionMenuManager.oPC.getCanUseSkill(SkillType.DEMOLITIONS);
    const restricted = ActionMenuManager.areaIsRestricted();
    const isTSL = GameState.GameKey === GameEngineType.TSL;

    if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleObject){

      if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModulePlaceable){
        const placeable = ActionMenuManager.oTarget;
        // Object-update 0x10 client bits: Locked + Plot (not Useable/NotBlastable).
        if(placeable.isLocked()){
          // Slot 0 Bash: Locked && !Plot && !restrict. Grey only companion/PartyInteract.
          if(!restricted && !placeable.plot){
            const player = GameState.PartyManager.Player;
            const bashEnabled = (
              !player ||
              ActionMenuManager.oPC === player ||
              !player.isPartyMember() ||
              !player.isDead() ||
              !!placeable.partyInteract
            );
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: placeable,
                talent: undefined
              },
              target: placeable,
              icon: 'i_attack',
              name: 'Bash',
              enabled: bashEnabled,
            }));
          }

          // Slot 1 Security (+ TSL spikes / ItemTargeting==2 use-items).
          if(bCanUseSecurity){
            const action = new GameState.ActionFactory.ActionUnlockObject();
            action.setOwner(ActionMenuManager.oPC as ModuleObject);
            action.setParameter(0, ActionParameterType.DWORD, placeable);
            action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: securityTalent.getIcon()
            }));
            if(isTSL){
              ActionMenuManager.populateSecuritySpikes(placeable);
              ActionMenuManager.populatePlaceableUseItems(placeable);
            }
          }

          // Slot 2 TSL plant mines.
          if(isTSL){
            ActionMenuManager.populateDoorOrPlaceableMines(placeable, 0xbc34);
          }
        }else if(placeable.isHostile(ActionMenuManager.oPC as ModuleObject)){
          // Unlocked hostile placeable: slot 1 Force; TSL slot 2 hostile items.
          ActionMenuManager.populateHostileForcePowers();
          if(isTSL){
            ActionMenuManager.populateHostileItems();
          }
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleDoor){
        const door = ActionMenuManager.oTarget;
        // Early open/anim gate for Bash/DoorSaber (retail OPENED1/OPENED2 or open flag).
        const doorOpen = door.isOpen();

        if(door.isLocked() && !doorOpen){
          // Slot 0: TSL DoorSaber (main hand) else Bash. DoorSaber omits Bash.
          let doorSaberAdded = false;
          if(
            isTSL &&
            !door.plot &&
            ActionMenuManager.oPCHasMainHandLightsaber()
          ){
            const saber = new GameState.ActionFactory.ActionDoorSaber();
            saber.setOwner(ActionMenuManager.oPC as ModuleObject);
            saber.setParameter(0, ActionParameterType.DWORD, door);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: saber,
              icon: 'i_doorsaber',
              name: ActionMenuManager.tlkName(0xbc50, 'Cut Open'),
            }));
            doorSaberAdded = true;
          }

          if(!restricted && !door.plot && !doorSaberAdded){
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: door,
                talent: undefined
              },
              target: door,
              icon: 'i_attack',
              name: 'Bash',
            }));
          }
        }

        if(door.isLocked() && !door.keyRequired && bCanUseSecurity){
          const action = new GameState.ActionFactory.ActionUnlockObject();
          action.setOwner(ActionMenuManager.oPC as ModuleObject);
          action.setParameter(0, ActionParameterType.DWORD, door);
          action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: action,
            icon: securityTalent.getIcon()
          }));
          if(isTSL){
            ActionMenuManager.populateSecuritySpikes(door);
          }
        }

        if(isTSL && door.isLocked()){
          ActionMenuManager.populateDoorOrPlaceableMines(door);
        }
      }else if(
        ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleCreature &&
        ActionMenuManager.oTarget.isHostile(ActionMenuManager.oPC as ModuleObject)
      ){
        // Retail GetTargetActions slot 0: GetCombatFeatsSkills then Attack.
        if(!restricted){
          const featIds = ActionMenuManager.getCombatMenuFeatIds(
            id => ActionMenuManager.oPC.getHasFeat(id),
            ActionMenuManager.oPC.isRangedEquipped()
          );
          for(let i = 0; i < featIds.length; i++){
            const feat = ActionMenuManager.oPC.getFeat(featIds[i])
              || new GameState.TalentFeat(featIds[i]);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              talent: feat,
              target: ActionMenuManager.oTarget,
              icon: feat.icon,
              name: feat.name || feat.label || '',
            }));
          }

          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack',
            name: 'Attack',
          }));
          // Default to Attack only on target change — keep cycled feat selection
          // across per-frame UpdateMenuActions rebuilds.
          ActionMenuManager.applyDefaultAttackSelectionIfNeeded();

          ActionMenuManager.populateHostileForcePowers();
          ActionMenuManager.populateCounterSpell();
          ActionMenuManager.populateHostileItems();
        }

      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleTrigger){
        if(ActionMenuManager.oTarget.type == ModuleTriggerType.TRAP){
          if(bCanUseDemolitions && ActionMenuManager.oTarget.trapDisarmable){
            const action = new GameState.ActionFactory.ActionDisarmMine();
            action.setOwner(ActionMenuManager.oPC as ModuleObject);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              target: ActionMenuManager.oTarget,
              icon: 'i_disablemine',
              name: 'Disable Mine',
            }));
          }

          if(bCanUseDemolitions){
            const action = new GameState.ActionFactory.ActionRecoverMine();
            action.setOwner(ActionMenuManager.oPC as ModuleObject);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              target: ActionMenuManager.oTarget,
              icon: 'i_recovermine',
              name: 'Recover Mine',
            }));
          }

          if(isTSL){
            ActionMenuManager.populateTrapMineForcePowers(
              ActionMenuManager.oTarget.trapType | 0
            );
          }
        }
      }

    }

    // Retail GetPersonalActions slots 0–3 (+ TSL 4–5 Behaviors/Stances)
    ActionMenuManager.populateSelfForcePowers();
    ActionMenuManager.populateUsableItems(1, UsableItemMask.MEDICAL);
    ActionMenuManager.populateUsableItems(2, UsableItemMask.OTHER);
    ActionMenuManager.populateUsableItems(3, UsableItemMask.MINES);
    if(isTSL){
      ActionMenuManager.populateBehaviors();
      ActionMenuManager.populateStances();
    }

    // Clear target-change default if the hostile combat path did not run
    // (empty / non-hostile target) so the flag cannot stick across frames.
    if(ActionMenuManager.#preferDefaultAttack){
      ActionMenuManager.applyDefaultAttackSelectionIfNeeded();
    }

    return ActionMenuManager.ActionPanels;
  }

  static targetActionCount(){
    return ActionMenuManager.ActionPanels.targetPanels.reduce(
      (previousValue, currentValue) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  static selfActionCount(){
    return ActionMenuManager.ActionPanels.selfPanels.reduce(
      (previousValue, currentValue) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  /**
   * After slot-0 combat feats + Attack are built: default to Attack when the
   * selected target just changed. Otherwise preserve selectedIndex so cycling
   * to Power Attack / Flurry / etc. survives the next UpdateMenuActions.
   */
  static applyDefaultAttackSelectionIfNeeded(){
    const panel = ActionMenuManager.ActionPanels.targetPanels[0];
    if(!panel){
      ActionMenuManager.#preferDefaultAttack = false;
      return;
    }
    if(ActionMenuManager.#preferDefaultAttack){
      if(panel.actions.length){
        panel.selectedIndex = panel.actions.length - 1;
      }
      ActionMenuManager.#preferDefaultAttack = false;
    }
  }

  /**
   * Retail player input: ActionManager(1) only when **not** already in combat
   * (HandlePlayerToServerInputMessage UseItem case 9 / CastSpell case 0x12).
   * Attack case 2 calls AddAttackActions with clear=0 so the combat-round
   * schedule appends — never wipe it here.
   * Feat attacks: SendPlayerToServerInput_Attack(target, featId).
   */
  static activateMenuItem(menuItem: ActionMenuItem, defaultTarget?: ModuleObject){
    if(!ActionMenuManager.oPC || !menuItem) return;
    if(menuItem.enabled === false) return;

    const target = menuItem.target || defaultTarget || ActionMenuManager.oTarget;
    const pc = ActionMenuManager.oPC;

    // TSL GetBehaviors / ActionMenuSelectBehavior — set AIState, no action queue.
    if(typeof menuItem.aiState === 'number'){
      pc.aiState = menuItem.aiState | 0;
      return;
    }

    // TSL GetStances / ActionMenuForm — set current Jedi Form.
    if(typeof menuItem.formId === 'number'){
      pc.setCurrentForm(menuItem.formId | 0);
      return;
    }

    if(menuItem.action?.type === ActionType.ActionCounterSpell){
      GameState.ActionFactory.AddCounterSpellActions(
        pc as any,
        target as any,
        { clear: true }
      );
      return;
    }

    // Retail: ActionManager(1) only when combat state is off.
    if(!pc.combatData?.combatState){
      pc.clearAllActions(true);
    }

    // Combat feats (Power Attack, Flurry, …) before basic Attack — retail
    // SendPlayerToServerInput_Attack(targetId, featId).
    if(menuItem.talent instanceof TalentFeat){
      pc.attackCreature(target as ModuleCreature, menuItem.talent);
      return;
    }

    if(menuItem.action && menuItem.action.type == ActionType.ActionPhysicalAttacks){
      pc.attackCreature(target as ModuleCreature, undefined);
      return;
    }

    // Explicit target actions (security, disable/recover mine, set-mine, DoorSaber)
    // take precedence over their optional item metadata.
    if(menuItem.action){
      pc.actionQueue.addFront(menuItem.action);
      return;
    }

    // Force-menu entries (incl. droid equipment powers) carry talent; prefer
    // CastSpell / ForceMenuAction over UseItem when both item + talent are set.
    if(menuItem.talent instanceof TalentSpell){
      // Self-panel stamps oPC; still pass caster as both args so look-at cannot win.
      const castTarget = (defaultTarget === pc || menuItem.target === pc)
        ? pc
        : (target || pc);
      menuItem.talent.useTalentOnObject(castTarget, pc, { isUserAction: true });
      return;
    }

    if(menuItem.item){
      const useTarget = target || pc;
      menuItem.item.useItemOnObject(pc, useTarget as ModuleObject, { isUserAction: true });
      return;
    }

    if(menuItem.talent instanceof TalentObject){
      menuItem.talent.useTalentOnObject(target || pc, pc);
    }
  }

  static onTargetMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }

    const action = ActionMenuManager.ActionPanels.targetPanels[index].getSelectedAction();
    if(action){
      ActionMenuManager.activateMenuItem(action, ActionMenuManager.oTarget);
    }
  }

  static onSelfMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }

    const action = ActionMenuManager.ActionPanels.selfPanels[index].getSelectedAction();
    if(!action){ return; }

    // Retail GetSelfForcePowers stamps the controlled creature's object id onto
    // every entry; ForceMenuAction casts at that id — never the look-at target.
    action.target = ActionMenuManager.oPC;
    ActionMenuManager.activateMenuItem(action, ActionMenuManager.oPC);
  }

  /**
   * Inventory BTN_USEITEM — retail InstantUseItem (not animated UseItem).
   * Target is ignored; impact applies on the controlled PC.
   */
  static useInventoryItem(item: ModuleItem, _target?: ModuleObject){
    if(!ActionMenuManager.oPC || !item) return;
    item.instantUseItem(ActionMenuManager.oPC);
  }

}
