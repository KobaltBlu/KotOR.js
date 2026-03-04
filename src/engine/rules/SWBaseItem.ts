import { DiceType } from "@/enums/combat/DiceType";
import { WeaponSize } from "@/enums/combat/WeaponSize";
import { WeaponType } from "@/enums/combat/WeaponType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { TwoDAObject } from "@/resource/TwoDAObject";
import type { ITwoDARowData } from "@/resource/TwoDAObject";

export class SWBaseItem {
  id: number = 0;
  name: number = 0;
  label: string = '';
  equipableSlots: number = 0;
  canRotateIcon: boolean = false;
  modelType: number = 0;
  itemClass: string = '';
  genderSpecific: number = 0;
  partEnvMap: boolean = false;
  defaultModel: string = 'I_Null';
  defaultIcon: string = '';
  container: boolean = false;
  weaponWield: WeaponWield = WeaponWield.INVALID;
  weaponType: WeaponType = WeaponType.INVALID;
  damageFlags: number = 0;
  weaponSize: WeaponSize = WeaponSize.INVALID;
  rangedWeapon: boolean = false;
  maxAttackRange: number = -1;
  prefAttackDist: number = -1;
  minRange: number = 0;
  maxRange: number = 100;
  bloodColor: 'S'|undefined = undefined;
  numDice: number = 0;
  dieToRoll: number = 0;
  die: DiceType = DiceType.d8;
  criticalThreat: number = 0;
  criticalHitMultiplier: number = 0;
  baseCost: number = 0;
  stacking: number = 1;
  itemMultiplier: number = 1;
  description: number = 0;
  invSoundType: number = -1;
  maxProps: number = 0;
  minProps: number = 0;
  propColumn: number = 0;
  requiredFeat0: number = -1;
  requiredFeat1: number = -1;
  requiredFeat2: number = -1;
  requiredFeat3: number = -1;
  requiredFeat4: number = -1;
  acEnchant: boolean = false;
  baseAC: number = 0;
  dexBonus: number = -1;
  acCheck: boolean = false;
  armorCheckPen: boolean = false;
  baseItemStatRef: number = -1;
  chargesStarting: number = 0;
  rotateOnGround: boolean = false;
  tenthLBS: number = 1;
  weaponMaterialType: number = -1;
  ammunitionType: number = -1;
  poweredItem: number = -1;
  powerUpSound: string = '';
  powerDownSound: string = '';
  poweredSound: string = '';
  itemType: number = -1;
  bodyVar: 'B'|'F'|'S'|'L'|undefined = undefined;
  specFeat: number = -1;
  focFeat: number = -1;
  droidOrHuman: number = 0;
  denySubrace: number = 0;
  armorType: string = '';
  storePanelSort: number = 0;

  postProcess(){
    switch(this.dieToRoll){
      case 2:
        this.die = DiceType.d2;
      break;
      case 3:
        this.die = DiceType.d3;
      break;
      case 4:
        this.die = DiceType.d4;
      break;
      case 6:
        this.die = DiceType.d6;
      break;
      case 8:
        this.die = DiceType.d8;
      break;
      case 10:
        this.die = DiceType.d10;
      break;
      case 12:
        this.die = DiceType.d12;
      break;
      case 20:
        this.die = DiceType.d20;
      break;
      case 100:
        this.die = DiceType.d100;
      break;
    }
  }

  static From2DA (row: ITwoDARowData | Record<string, string | number> = {}): SWBaseItem {
    const baseItem = new SWBaseItem();
    
    if(Object.hasOwn(row,'__index'))
      baseItem.id = TwoDAObject.normalizeValue(row.__index, 'number', 0) as number;
    if(Object.hasOwn(row,'name'))
      baseItem.name = TwoDAObject.normalizeValue(row.name, 'number', 0) as number;
    if(Object.hasOwn(row,'label'))
      baseItem.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    if(Object.hasOwn(row,'equipableslots'))
      baseItem.equipableSlots = TwoDAObject.normalizeValue(row.equipableslots, 'number', 0) as number;
    if(Object.hasOwn(row,'walkdist'))
      baseItem.canRotateIcon = TwoDAObject.normalizeValue(row.walkdist, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'modeltype'))
      baseItem.modelType = TwoDAObject.normalizeValue(row.modeltype, 'number', 1.7) as number;
    if(Object.hasOwn(row,'itemclass'))
      baseItem.itemClass = TwoDAObject.normalizeValue(row.itemclass, 'string', '') as string;
    if(Object.hasOwn(row,'genderspecific'))
      baseItem.genderSpecific = TwoDAObject.normalizeValue(row.genderspecific, 'number', 0) as number;
    if(Object.hasOwn(row,'partenvmap'))
      baseItem.partEnvMap = TwoDAObject.normalizeValue(row.partenvmap, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'defaultmodel'))
      baseItem.defaultModel = TwoDAObject.normalizeValue(row.defaultmodel, 'string', 'I_Null') as string;
    if(Object.hasOwn(row,'defaulticon'))
      baseItem.defaultIcon = TwoDAObject.normalizeValue(row.defaulticon, 'string', '') as string;
    if(Object.hasOwn(row,'container'))
      baseItem.container = TwoDAObject.normalizeValue(row.container, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'weaponwield'))
      baseItem.weaponWield = TwoDAObject.normalizeValue(row.weaponwield, 'number', 0) as number;
    if(Object.hasOwn(row,'weapontype'))
      baseItem.weaponType = TwoDAObject.normalizeValue(row.weapontype, 'number', 0) as number;
    if(Object.hasOwn(row,'damageflags'))
      baseItem.damageFlags = TwoDAObject.normalizeValue(row.damageflags, 'number', 0) as number;
    if(Object.hasOwn(row,'weaponsize'))
      baseItem.weaponSize = TwoDAObject.normalizeValue(row.weaponsize, 'number', 0) as number;
    if(Object.hasOwn(row,'rangedweapon'))
      baseItem.rangedWeapon = TwoDAObject.normalizeValue(row.rangedweapon, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'maxattackrange'))
      baseItem.maxAttackRange = TwoDAObject.normalizeValue(row.maxattackrange, 'number', 0) as number;
    if(Object.hasOwn(row,'prefattackdist'))
      baseItem.prefAttackDist = TwoDAObject.normalizeValue(row.prefattackdist, 'number', 0.5) as number;
    if(Object.hasOwn(row,'minrange'))
      baseItem.minRange = TwoDAObject.normalizeValue(row.minrange, 'number', 0) as number;
    if(Object.hasOwn(row,'maxrange'))
      baseItem.maxRange = TwoDAObject.normalizeValue(row.maxrange, 'number', 100) as number;
    if(Object.hasOwn(row,'bloodcolr'))
      baseItem.bloodColor = TwoDAObject.normalizeValue(row.bloodcolr, 'string', '') as SWBaseItem['bloodColor'];
    if(Object.hasOwn(row,'numdice'))
      baseItem.numDice = TwoDAObject.normalizeValue(row.numdice, 'number', 0) as number;
    if(Object.hasOwn(row,'dietoroll'))
      baseItem.dieToRoll = TwoDAObject.normalizeValue(row.dietoroll, 'number', 4) as number;
    if(Object.hasOwn(row,'critthreat'))
      baseItem.criticalThreat = TwoDAObject.normalizeValue(row.critthreat, 'number', 0) as number;
    if(Object.hasOwn(row,'crithitmult'))
      baseItem.criticalHitMultiplier = TwoDAObject.normalizeValue(row.crithitmult, 'number', 1) as number;
    if(Object.hasOwn(row,'basecost'))
      baseItem.baseCost = TwoDAObject.normalizeValue(row.basecost, 'number', 1) as number;
    if(Object.hasOwn(row,'stacking'))
      baseItem.stacking = TwoDAObject.normalizeValue(row.stacking, 'number', 99) as number;
    if(Object.hasOwn(row,'itemmultiplier'))
      baseItem.itemMultiplier = TwoDAObject.normalizeValue(row.itemmultiplier, 'number', 1) as number;
    if(Object.hasOwn(row,'description'))
      baseItem.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;
    if(Object.hasOwn(row,'invsoundtype'))
      baseItem.invSoundType = TwoDAObject.normalizeValue(row.invsoundtype, 'number', 0) as number;
    if(Object.hasOwn(row,'maxprops'))
      baseItem.maxProps = TwoDAObject.normalizeValue(row.maxprops, 'number', 8) as number;
    if(Object.hasOwn(row,'minprops'))
      baseItem.minProps = TwoDAObject.normalizeValue(row.minprops, 'number', 0) as number;
    if(Object.hasOwn(row,'propcolumn'))
      baseItem.propColumn = TwoDAObject.normalizeValue(row.propcolumn, 'number', 0) as number;
    if(Object.hasOwn(row,'reqfeat0'))
      baseItem.requiredFeat0 = TwoDAObject.normalizeValue(row.reqfeat0, 'number', -1) as number;
    if(Object.hasOwn(row,'reqfeat1'))
      baseItem.requiredFeat1 = TwoDAObject.normalizeValue(row.reqfeat1, 'number', -1) as number;
    if(Object.hasOwn(row,'reqfeat2'))
      baseItem.requiredFeat2 = TwoDAObject.normalizeValue(row.reqfeat2, 'number', -1) as number;
    if(Object.hasOwn(row,'reqfeat3'))
      baseItem.requiredFeat3 = TwoDAObject.normalizeValue(row.reqfeat3, 'number', -1) as number;
    if(Object.hasOwn(row,'reqfeat4'))
      baseItem.requiredFeat4 = TwoDAObject.normalizeValue(row.reqfeat4, 'number', -1) as number;
    if(Object.hasOwn(row,'ac_enchant'))
      baseItem.acEnchant = TwoDAObject.normalizeValue(row.ac_enchant, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'baseac'))
      baseItem.baseAC = TwoDAObject.normalizeValue(row.baseac, 'number', 0) as number;
    if(Object.hasOwn(row,'accheck'))
      baseItem.acCheck = TwoDAObject.normalizeValue(row.accheck, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'armorcheckpen'))
      baseItem.armorCheckPen = TwoDAObject.normalizeValue(row.armorcheckpen, 'boolean', false) as boolean;
    if(Object.hasOwn(row,'baseitemstatref'))
      baseItem.baseItemStatRef = TwoDAObject.normalizeValue(row.baseitemstatref, 'number', -1) as number;
    if(Object.hasOwn(row,'chargesstarting'))
      baseItem.chargesStarting = TwoDAObject.normalizeValue(row.chargesstarting, 'number', 0) as number;
    if(Object.hasOwn(row,'rotateonground'))
      baseItem.rotateOnGround = TwoDAObject.normalizeValue(row.rotateonground, 'boolean', true) as boolean;
    if(Object.hasOwn(row,'tenthlbs'))
      baseItem.tenthLBS = TwoDAObject.normalizeValue(row.tenthlbs, 'number', 1.7) as number;
    if(Object.hasOwn(row,'weaponmattype'))
      baseItem.weaponMaterialType = TwoDAObject.normalizeValue(row.weaponmattype, 'number', -1) as number;
    if(Object.hasOwn(row,'ammunitiontype'))
      baseItem.ammunitionType = TwoDAObject.normalizeValue(row.ammunitiontype, 'number', -1) as number;
    if(Object.hasOwn(row,'powereditem'))
      baseItem.poweredItem = TwoDAObject.normalizeValue(row.powereditem, 'number', -1) as number;
    if(Object.hasOwn(row,'powerupsnd'))
      baseItem.powerUpSound = TwoDAObject.normalizeValue(row.powerupsnd, 'string', '') as string;
    if(Object.hasOwn(row,'powerdownsnd'))
      baseItem.powerDownSound = TwoDAObject.normalizeValue(row.powerdownsnd, 'string', '') as string;
    if(Object.hasOwn(row,'poweredsnd'))
      baseItem.poweredSound = TwoDAObject.normalizeValue(row.poweredsnd, 'string', '') as string;
    if(Object.hasOwn(row,'itemtype'))
      baseItem.itemType = TwoDAObject.normalizeValue(row.itemtype, 'number', 0) as number;
    if(Object.hasOwn(row,'bodyvar'))
      baseItem.bodyVar = TwoDAObject.normalizeValue(row.bodyvar, 'string', undefined) as SWBaseItem['bodyVar'];
    if(Object.hasOwn(row,'specfeat'))
      baseItem.specFeat = TwoDAObject.normalizeValue(row.specfeat, 'number', -1) as number;
    if(Object.hasOwn(row,'focfeat'))
      baseItem.focFeat = TwoDAObject.normalizeValue(row.focfeat, 'number', -1) as number;
    if(Object.hasOwn(row,'droidorhuman'))
      baseItem.droidOrHuman = TwoDAObject.normalizeValue(row.droidorhuman, 'number', 0) as number;
    if(Object.hasOwn(row,'denysubrace'))
      baseItem.denySubrace = TwoDAObject.normalizeValue(row.denysubrace, 'number', 0) as number;
    if(Object.hasOwn(row,'armortype'))
      baseItem.armorType = TwoDAObject.normalizeValue(row.armortype, 'string', '') as string;
    if(Object.hasOwn(row,'storepanelsort'))
      baseItem.storePanelSort = TwoDAObject.normalizeValue(row.storepanelsort, 'number', 1.7) as number;

    baseItem.postProcess();

    return baseItem;
  }
}