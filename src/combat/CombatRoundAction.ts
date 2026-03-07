import type { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { TalentFeat, TalentSpell } from "../talents";
import { AttackResult } from "../enums/combat/AttackResult";
import { ProjectilePath } from "../enums/combat/ProjectilePath";
import { OdysseyModelAnimation } from "../odyssey";
import { ITwoDAAnimation } from "../interface/twoDA/ITwoDAAnimation";
import { SpellCastInstance } from "./SpellCastInstance";
import { CombatFeatType } from "../enums/combat/CombatFeatType";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums";

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
  inventorySlot: ModuleObject;
  targetRepository: ModuleObject;

  isUserAction: boolean = false; //Was this action created by the player
  isCutsceneAttack: boolean = false;

  resultsCalculated: boolean = false;
  attackAnimation: number = 10001;
  attackResult: AttackResult = AttackResult.MISS;
  attackDamage: number = 0;

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
    if(this.isCutsceneAttack){
      animation = this.animationName;
    }

    this.animationName = animation;
    this.twoDAAnimation = OdysseyModelAnimation.GetAnimation2DA(animation);
  }

}