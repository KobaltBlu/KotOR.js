import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";
import type { GameObject } from "@engine/module/GameObject";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import { TalentFeat, TalentSpell } from "@engine/talents";
import { AttackResult } from "@core/enums/combat/AttackResult";
import { ProjectilePath } from "@core/enums/combat/ProjectilePath";
import { OdysseyModelAnimation } from "@engine/odyssey";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import { SpellCastInstance } from "@engine/combat/SpellCastInstance";
import { resolveSpellProjectilePathType } from "@engine/combat/spell-projectile-time";
import { CombatFeatType } from "@core/enums/combat/CombatFeatType";
import { GFFStruct } from "@core/resource/GFFStruct";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { GameState } from "@engine/runtime/GameState";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  lookupCombatObjectById,
  normalizeCombatObjectId,
} from "@engine/combat/resolve-combat-object-id";

export class CombatRoundAction {
  owner: GameObject;

  actionTimer: number = 0;
  animation: number = 0;
  animationTime: number = 0;
  animationName: string = '';
  swAnimation: SWAnimation;

  numAttacks: number = 0;
  actionType: CombatActionType = CombatActionType.INVALID;
  target: GameObject;
  /** Saved Target DWORD — kept for post-load re-resolve (PerceptionList pattern). */
  targetObjectId: number = 0;
  retargettable: number = 0;
  /**
   * Equipment slot for ITEM_EQUIP (InventorySlot dword).
   * ModuleCreatureArmorSlot / INVENTORY_SLOT_* — not an object id.
   */
  inventorySlot: number = 0;
  targetRepository: GameObject;
  /** Saved TargetRepository DWORD for deferred resolve. */
  targetRepositoryObjectId: number = 0;

  isUserAction: boolean = false; //Was this action created by the player

  /**
   * Combat-round action — designer-precomputed attack
   * (CutsceneAttack). Distinct from `resolved`, which gates ResolveAttack once.
   */
  resultsCalculated: boolean = false;
  /** Set once ResolveAttack has run for this scheduled action. */
  resolved: boolean = false;
  /** animations.2da row index when resultsCalculated (`animation`). */
  attackAnimation: number = 0;
  attackResult: AttackResult = AttackResult.MISS;
  attackDamage: number = 0;

  /** CutsceneMove destination (move_to_position). */
  moveToPosition?: { x: number; y: number; z: number };
  /** CutsceneMove run flag (should_run). */
  shouldRun: number = 0;

  iconResRef: string;

  featId: number = -1;
  feat: TalentFeat;

  spellId: number = -1;
  spell: TalentSpell;
  spellInstance: SpellCastInstance;
  spellClassIndex: number = -1;
  domainLevel: number = 0;
  projectilePath: ProjectilePath = ProjectilePath.DEFAULT;
  overrideSpellId: number = -1;
  overrideSpell: TalentSpell;

  item: Item;
  activePropertyIndex: number = -1;

  equipInstant: boolean = false;

  constructor(owner?: GameObject){
    this.owner = owner;
    this.iconResRef = 'i_attack';
  }

  setFeat(feat: TalentFeat){
    if(!feat){
      this.featId = -1;
      this.feat = undefined;
      return;
    }
    this.feat = feat;
    this.featId = feat.id;
    this.iconResRef = feat.icon;
  }

  setSpell(spell: TalentSpell){
    if(!spell){
      this.spellId = -1;
      this.spell = undefined;
      return;
    }
    this.spell = spell;
    this.spellId = spell.id;
    const icon = String(spell.iconresref || '').trim();
    this.iconResRef = (!icon || icon === '****')
      ? (this.item?.getIcon?.() || this.iconResRef || 'i_attack')
      : icon;
    // Carry spells.2da projtype into ActionCombat param 9
    const path = resolveSpellProjectilePathType(spell.projtype);
    if(path !== ProjectilePath.DEFAULT){
      this.projectilePath = path;
    }
  }

  addSpellInstance(spellInstance: SpellCastInstance) {
    this.spellInstance = spellInstance;
  }

  calculateAttackAnimation(){
    if(!isCreature(this.owner)) return;

    const owner: Creature = this.owner as any;
    let attackKey = owner.getCombatAnimationAttackType();
    let weaponWield = owner.getCombatAnimationWeaponType();
    let attackType = 1;
    let isMelee = true;
    let isRanged = false;

    if(attackKey == 'b'){
      isMelee = false;
      isRanged = true;
    }

    if(this.feat){
      if(attackKey == 'm'){
        attackKey = 'f';
        switch(this.feat.id){
          case CombatFeatType.CRITICAL_STRIKE:
          case CombatFeatType.IMPROVED_CRITICAL_STRIKE:
          case CombatFeatType.MASTER_CRITICAL_STRIKE:
            attackType = 1;
          break;
          case CombatFeatType.FLURRY:
          case CombatFeatType.IMPROVED_FLURRY:
          case CombatFeatType.MASTER_FLURRY:
            attackType = 2;
          break;
          case CombatFeatType.POWER_ATTACK:
          case CombatFeatType.IMPROVED_POWER_ATTACK:
          case CombatFeatType.MASTER_POWER_ATTACK:
            attackType = 3;
          break;
        }
      }else if(attackKey == 'b'){
        switch(this.feat.id){
          case CombatFeatType.RAPID_SHOT:
          case CombatFeatType.IMPROVED_RAPID_SHOT:
          case CombatFeatType.MASTER_RAPID_SHOT:
            attackType = 2;
          break;
          case CombatFeatType.SNIPER_SHOT:
          case CombatFeatType.IMPROVED_SNIPER_SHOT:
          case CombatFeatType.MASTER_SNIPER_SHOT:
            attackType = 3;
          break;
          case CombatFeatType.POWER_BLAST:
          case CombatFeatType.IMPROVED_POWER_BLAST:
          case CombatFeatType.MASTER_POWER_BLAST:
            attackType = 4;
          break;
        }
      }
    }

    //Get random basic melee attack in combat with another melee creature that is targeting you
    if(attackKey == 'm' && isCreature(this.target)){
      const target: Creature = this.target as any;
      if(owner.isDuelingObject(target)){
        attackKey = 'c';
        attackType = Math.round(Math.random()*4)+1;
      }
    }
    
    let animationName = attackKey+weaponWield+'a'+attackType;
    // GetClientMeleeAnimation — resultsCalculated returns nAnimation row
    if(this.resultsCalculated && this.attackAnimation){
      const animFromId = GameState.SWRuleSet.animationIdMap.get(this.attackAnimation);
      if(animFromId){
        animationName = animFromId.name || animationName;
      }
    }

    this.animationName = animationName;
    this.swAnimation = OdysseyModelAnimation.GetAnimation2DA(animationName);
  }

  /**
   * SaveData (list element type 0xDAEA)
   */
  toStruct(structIdx: number = 0xDAEA): GFFStruct {
    const struct = new GFFStruct(structIdx);
    struct.addField(new GFFField(GFFDataType.INT, 'ActionTimer')).setValue(this.actionTimer || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'Animation')).setValue(this.animation || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'AnimationTime')).setValue(this.animationTime || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'NumAttacks')).setValue(this.numAttacks || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ActionType')).setValue(this.actionType || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'Target')).setValue(
      this.target?.id ?? GameObjectConstant.OBJECT_INVALID
    );
    struct.addField(new GFFField(GFFDataType.BYTE, 'Retargettable')).setValue(this.retargettable || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'InventorySlot')).setValue(
      this.inventorySlot || 0
    );
    struct.addField(new GFFField(GFFDataType.DWORD, 'TargetRepository')).setValue(
      this.targetRepository?.id ?? GameObjectConstant.OBJECT_INVALID
    );
    return struct;
  }

  /**
   * LoadData 
   */
  fromStruct(struct: GFFStruct, owner?: GameObject){
    if(!struct) return;
    if(owner) this.owner = owner;
    const get = (label: string, fallback: number = 0) =>
      struct.hasField(label) ? struct.getFieldByLabel(label).getValue() : fallback;

    this.actionTimer = get('ActionTimer');
    this.animation = get('Animation');
    this.animationTime = get('AnimationTime');
    this.numAttacks = get('NumAttacks');
    this.actionType = get('ActionType', CombatActionType.INVALID);
    this.retargettable = get('Retargettable');

    const targetId = get('Target', GameObjectConstant.OBJECT_INVALID);
    const invSlot = get('InventorySlot', 0);
    const repoId = get('TargetRepository', GameObjectConstant.OBJECT_INVALID);
    this.targetObjectId = normalizeCombatObjectId(targetId);
    this.targetRepositoryObjectId = normalizeCombatObjectId(repoId);
    this.target = lookupCombatObjectById(this.targetObjectId);
    this.inventorySlot = invSlot;
    this.targetRepository = lookupCombatObjectById(this.targetRepositoryObjectId);
  }

  /**
   * Re-resolve Target / TargetRepository after all creatures are registered.
   */
  resolveObjectReferences(){
    if(this.targetObjectId && !this.target){
      this.target = lookupCombatObjectById(this.targetObjectId);
    }
    if(this.targetRepositoryObjectId && !this.targetRepository){
      this.targetRepository = lookupCombatObjectById(this.targetRepositoryObjectId);
    }
  }

}

/** Resolve animations.2da row by label id or array index. */
export function resolveAnimations2DARow(animationRow: number): SWAnimation | undefined {
  const animFromId = GameState.SWRuleSet.animationIdMap.get(animationRow);
  if(animFromId) return animFromId;
  return GameState.SWRuleSet.animations[animationRow];
}