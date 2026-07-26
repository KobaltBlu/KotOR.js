import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { TalentFeat, TalentSpell } from "@/talents";
import { AttackResult } from "@/enums/combat/AttackResult";
import { ProjectilePath } from "@/enums/combat/ProjectilePath";
import { OdysseyModelAnimation } from "@/odyssey";
import { ITwoDAAnimation } from "@/interface/twoDA/ITwoDAAnimation";
import { SpellCastInstance } from "@/combat/SpellCastInstance";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums";
import { GFFStruct } from "@/resource/GFFStruct";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";

export class CombatRoundAction {
  owner: ModuleObject;

  actionTimer: number = 0;
  animation: number = 0;
  animationTime: number = 0;
  animationName: string = '';
  twoDAAnimation: ITwoDAAnimation;

  numAttacks: number = 0;
  actionType: CombatActionType = CombatActionType.INVALID;
  target: ModuleObject;
  retargettable: number = 0;
  /**
   * Equipment slot for ITEM_EQUIP (retail InventorySlot dword).
   * ModuleCreatureArmorSlot / INVENTORY_SLOT_* — not an object id.
   */
  inventorySlot: number = 0;
  targetRepository: ModuleObject;

  isUserAction: boolean = false; //Was this action created by the player

  /**
   * Retail CSWSCombatRoundAction field31_0x74 — designer-precomputed attack
   * (CutsceneAttack). Distinct from `resolved`, which gates ResolveAttack once.
   */
  resultsCalculated: boolean = false;
  /** Set once ResolveAttack has run for this scheduled action. */
  resolved: boolean = false;
  /** animations.2da row index when resultsCalculated (retail `animation`). */
  attackAnimation: number = 0;
  attackResult: AttackResult = AttackResult.MISS;
  attackDamage: number = 0;

  /** CutsceneMove destination (retail move_to_position). */
  moveToPosition?: { x: number; y: number; z: number };
  /** CutsceneMove run flag (retail should_run). */
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

  item: ModuleItem;
  activePropertyIndex: number = -1;

  equipInstant: boolean = false;

  constructor(owner?: ModuleObject){
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
    this.iconResRef = spell.iconresref;
  }

  addSpellInstance(spellInstance: SpellCastInstance) {
    this.spellInstance = spellInstance;
  }

  calculateAttackAnimation(){
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;

    const owner: ModuleCreature = this.owner as any;
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
    if(attackKey == 'm' && BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      const target: ModuleCreature = this.target as any;
      if(owner.isDuelingObject(target)){
        attackKey = 'c';
        attackType = Math.round(Math.random()*4)+1;
      }
    }
    
    let animation = attackKey+weaponWield+'a'+attackType;
    // Retail GetClientMeleeAnimation @ 005f32e0 — resultsCalculated returns nAnimation row
    if(this.resultsCalculated && this.attackAnimation){
      const row = resolveAnimations2DARow(this.attackAnimation);
      if(row?.name){
        animation = String(row.name);
      }else if(this.animationName){
        animation = this.animationName;
      }
    }

    this.animationName = animation;
    this.twoDAAnimation = OdysseyModelAnimation.GetAnimation2DA(animation);
  }

  /**
   * Retail CSWSCombatRoundAction::SaveData @ 004d1dd0 (list element type 0xDAEA)
   */
  toStruct(structIdx: number = 0xDAEA): GFFStruct {
    const struct = new GFFStruct(structIdx);
    struct.addField(new GFFField(GFFDataType.INT, 'ActionTimer')).setValue(this.actionTimer || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'Animation')).setValue(this.animation || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'AnimationTime')).setValue(this.animationTime || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'NumAttacks')).setValue(this.numAttacks || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ActionType')).setValue(this.actionType || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'Target')).setValue(
      this.target?.id ?? ModuleObjectConstant.OBJECT_INVALID
    );
    struct.addField(new GFFField(GFFDataType.BYTE, 'Retargettable')).setValue(this.retargettable || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'InventorySlot')).setValue(
      this.inventorySlot || 0
    );
    struct.addField(new GFFField(GFFDataType.DWORD, 'TargetRepository')).setValue(
      this.targetRepository?.id ?? ModuleObjectConstant.OBJECT_INVALID
    );
    return struct;
  }

  /**
   * Retail CSWSCombatRoundAction::LoadData @ 004d1e90
   */
  fromStruct(struct: GFFStruct, owner?: ModuleObject){
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

    const targetId = get('Target', ModuleObjectConstant.OBJECT_INVALID);
    const invSlot = get('InventorySlot', 0);
    const repoId = get('TargetRepository', ModuleObjectConstant.OBJECT_INVALID);
    this.target = resolveObjectId(targetId);
    this.inventorySlot = invSlot;
    this.targetRepository = resolveObjectId(repoId);
  }

}

function resolveObjectId(id: number): ModuleObject | undefined {
  if(!id || id === ModuleObjectConstant.OBJECT_INVALID) return undefined;
  try{
    return GameState.ModuleObjectManager?.GetObjectById?.(id);
  }catch{
    return undefined;
  }
}

/** Resolve animations.2da row by label id or array index. */
export function resolveAnimations2DARow(animationRow: number): ITwoDAAnimation | undefined {
  const table = GameState.TwoDAManager?.datatables?.get?.('animations');
  if(!table || animationRow == null || animationRow < 0) return undefined;
  if(typeof table.getByID === 'function'){
    const byId = table.getByID(animationRow);
    if(byId) return byId as ITwoDAAnimation;
  }
  const rows = table.rows;
  if(rows && rows[animationRow]) return rows[animationRow] as ITwoDAAnimation;
  return undefined;
}