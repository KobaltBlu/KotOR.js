import { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { TalentFeat, TalentSpell } from "../talents";
import { AttackResult } from "../enums/combat/AttackResult";
import { ProjectilePath } from "../enums/combat/ProjectilePath";
import { OdysseyModelAnimation } from "../odyssey";
import { TwoDAAnimation } from "../interface/twoDA/TwoDAAnimation";

export class CombatRoundAction {
  owner: ModuleObject;

  actionTimer: number = 0;
  animation: number = 0;
  animationTime: number = 0;
  animationName: string = '';
  twoDAAnimation: TwoDAAnimation;

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

  calculateAttackAnimation(){
    if(!(this.owner instanceof ModuleCreature)) return;
    let attackKey = this.owner.getCombatAnimationAttackType();
    let weaponWield = this.owner.getCombatAnimationWeaponType();
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
          case 81:
          case 19:
          case 8:
            attackType = 1;
          break;
          case 83:
          case 17:
          case 28:
            attackType = 3;
          break;
          case 53:
          case 91:
          case 11:
            attackType = 2;
          break;
        }
      }else if(attackKey == 'b'){
        switch(this.feat.id){
          case 77:
          case 20:
          case 31:
            attackType = 3;
          break;
          case 82:
          case 18:
          case 29:
            attackType = 4;
          break;
          case 26:
          case 92:
          case 30:
            attackType = 2;
          break;
        }
      }
    }

    //Get random basic melee attack in combat with another melee creature that is targeting you
    if(attackKey == 'm' && (this.target instanceof ModuleCreature) && (this.owner instanceof ModuleCreature)){
      if(this.owner.isDuelingObject(this.target)){
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