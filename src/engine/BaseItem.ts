import { TwoDAObject } from "../resource/TwoDAObject";
// import { TwoDAManager } from "../managers";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { WeaponType } from "../enums/combat/WeaponType";
import { WeaponSize } from "../enums/combat/WeaponSize";
import { DiceType } from "../enums/combat/DiceType";
import { GameState } from "../GameState";

/**
 * BaseItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BaseItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BaseItem {

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

  static From2DA (baseItemId: number = -1): BaseItem {
    const baseItem = new BaseItem();

    let row: any = {};
    if(baseItemId >= 0){
      const datatable = GameState.TwoDAManager.datatables.get('baseitems');
      if(datatable){
        row = datatable.getRowByIndex(baseItemId);
      }
    }
    
    baseItem.id = parseInt(row.__index);

    if(row.hasOwnProperty('name'))
      baseItem.name = TwoDAObject.normalizeValue(row.name, 'number', 0) as number;
    if(row.hasOwnProperty('label'))
      baseItem.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    if(row.hasOwnProperty('equipableslots'))
      baseItem.equipableSlots = TwoDAObject.normalizeValue(row.equipableslots, 'number', 0) as number;
    if(row.hasOwnProperty('walkdist'))
      baseItem.canRotateIcon = TwoDAObject.normalizeValue(row.walkdist, 'boolean', false) as boolean;
    if(row.hasOwnProperty('modeltype'))
      baseItem.modelType = TwoDAObject.normalizeValue(row.modeltype, 'number', 1.7) as number;
    if(row.hasOwnProperty('itemclass'))
      baseItem.itemClass = TwoDAObject.normalizeValue(row.itemclass, 'string', '') as string;
    if(row.hasOwnProperty('genderspecific'))
      baseItem.genderSpecific = TwoDAObject.normalizeValue(row.genderspecific, 'number', 0) as number;
    if(row.hasOwnProperty('partenvmap'))
      baseItem.partEnvMap = TwoDAObject.normalizeValue(row.partenvmap, 'boolean', 0) as boolean;
    if(row.hasOwnProperty('defaultmodel'))
      baseItem.defaultModel = TwoDAObject.normalizeValue(row.defaultmodel, 'string', 'I_Null') as string;
    if(row.hasOwnProperty('defaulticon'))
      baseItem.defaultIcon = TwoDAObject.normalizeValue(row.defaulticon, 'string', '') as string;
    if(row.hasOwnProperty('container'))
      baseItem.container = TwoDAObject.normalizeValue(row.container, 'boolean', false) as boolean;
    if(row.hasOwnProperty('weaponwield'))
      baseItem.weaponWield = TwoDAObject.normalizeValue(row.weaponwield, 'number', 0) as number;
    if(row.hasOwnProperty('weapontype'))
      baseItem.weaponType = TwoDAObject.normalizeValue(row.weapontype, 'number', 0) as number;
    if(row.hasOwnProperty('damageflags'))
      baseItem.damageFlags = TwoDAObject.normalizeValue(row.damageflags, 'number', 0) as number;
    if(row.hasOwnProperty('weaponsize'))
      baseItem.weaponSize = TwoDAObject.normalizeValue(row.weaponsize, 'number', 0) as number;
    if(row.hasOwnProperty('rangedweapon'))
      baseItem.rangedWeapon = TwoDAObject.normalizeValue(row.rangedweapon, 'boolean', false) as boolean;
    if(row.hasOwnProperty('maxattackrange'))
      baseItem.maxAttackRange = TwoDAObject.normalizeValue(row.maxattackrange, 'number', 0) as number;
    if(row.hasOwnProperty('prefattackdist'))
      baseItem.prefAttackDist = TwoDAObject.normalizeValue(row.prefattackdist, 'number', 0.5) as number;
    if(row.hasOwnProperty('minrange'))
      baseItem.minRange = TwoDAObject.normalizeValue(row.minrange, 'number', 0) as number;
    if(row.hasOwnProperty('maxrange'))
      baseItem.maxRange = TwoDAObject.normalizeValue(row.maxrange, 'number', 100) as number;
    if(row.hasOwnProperty('bloodcolr'))
      baseItem.bloodColor = TwoDAObject.normalizeValue(row.bloodcolr, 'string', '') as any;
    if(row.hasOwnProperty('numdice'))
      baseItem.numDice = TwoDAObject.normalizeValue(row.numdice, 'number', 0) as number;
    if(row.hasOwnProperty('dietoroll'))
      baseItem.dieToRoll = TwoDAObject.normalizeValue(row.dietoroll, 'number', 4) as number;
    if(row.hasOwnProperty('critthreat'))
      baseItem.criticalThreat = TwoDAObject.normalizeValue(row.critthreat, 'number', 0) as number;
    if(row.hasOwnProperty('crithitmult'))
      baseItem.criticalHitMultiplier = TwoDAObject.normalizeValue(row.crithitmult, 'number', 1) as number;
    if(row.hasOwnProperty('basecost'))
      baseItem.baseCost = TwoDAObject.normalizeValue(row.basecost, 'number', 1) as number;
    if(row.hasOwnProperty('stacking'))
      baseItem.stacking = TwoDAObject.normalizeValue(row.stacking, 'number', 99) as number;
    if(row.hasOwnProperty('itemmultiplier'))
      baseItem.itemMultiplier = TwoDAObject.normalizeValue(row.itemmultiplier, 'number', 1) as number;
    if(row.hasOwnProperty('description'))
      baseItem.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;
    if(row.hasOwnProperty('invsoundtype'))
      baseItem.invSoundType = TwoDAObject.normalizeValue(row.invsoundtype, 'number', 0) as number;
    if(row.hasOwnProperty('maxprops'))
      baseItem.maxProps = TwoDAObject.normalizeValue(row.maxprops, 'number', 8) as number;
    if(row.hasOwnProperty('minprops'))
      baseItem.minProps = TwoDAObject.normalizeValue(row.minprops, 'number', 0) as number;
    if(row.hasOwnProperty('propcolumn'))
      baseItem.propColumn = TwoDAObject.normalizeValue(row.propcolumn, 'number', 0) as number;
    if(row.hasOwnProperty('reqfeat0'))
      baseItem.requiredFeat0 = TwoDAObject.normalizeValue(row.reqfeat0, 'number', -1) as number;
    if(row.hasOwnProperty('reqfeat1'))
      baseItem.requiredFeat1 = TwoDAObject.normalizeValue(row.reqfeat1, 'number', -1) as number;
    if(row.hasOwnProperty('reqfeat2'))
      baseItem.requiredFeat2 = TwoDAObject.normalizeValue(row.reqfeat2, 'number', -1) as number;
    if(row.hasOwnProperty('reqfeat3'))
      baseItem.requiredFeat3 = TwoDAObject.normalizeValue(row.reqfeat3, 'number', -1) as number;
    if(row.hasOwnProperty('reqfeat4'))
      baseItem.requiredFeat4 = TwoDAObject.normalizeValue(row.reqfeat4, 'number', -1) as number;
    if(row.hasOwnProperty('ac_enchant'))
      baseItem.acEnchant = TwoDAObject.normalizeValue(row.ac_enchant, 'boolean', false) as boolean;
    if(row.hasOwnProperty('baseac'))
      baseItem.baseAC = TwoDAObject.normalizeValue(row.baseac, 'number', 0) as number;
    if(row.hasOwnProperty('accheck'))
      baseItem.acCheck = TwoDAObject.normalizeValue(row.accheck, 'boolean', false) as boolean;
    if(row.hasOwnProperty('armorcheckpen'))
      baseItem.armorCheckPen = TwoDAObject.normalizeValue(row.armorcheckpen, 'boolean', false) as boolean;
    if(row.hasOwnProperty('baseitemstatref'))
      baseItem.baseItemStatRef = TwoDAObject.normalizeValue(row.baseitemstatref, 'number', -1) as number;
    if(row.hasOwnProperty('chargesstarting'))
      baseItem.chargesStarting = TwoDAObject.normalizeValue(row.chargesstarting, 'number', 0) as number;
    if(row.hasOwnProperty('rotateonground'))
      baseItem.rotateOnGround = TwoDAObject.normalizeValue(row.rotateonground, 'boolean', true) as boolean;
    if(row.hasOwnProperty('tenthlbs'))
      baseItem.tenthLBS = TwoDAObject.normalizeValue(row.tenthlbs, 'number', 1.7) as number;
    if(row.hasOwnProperty('weaponmattype'))
      baseItem.weaponMaterialType = TwoDAObject.normalizeValue(row.weaponmattype, 'number', -1) as number;
    if(row.hasOwnProperty('ammunitiontype'))
      baseItem.ammunitionType = TwoDAObject.normalizeValue(row.ammunitiontype, 'number', -1) as number;
    if(row.hasOwnProperty('powereditem'))
      baseItem.poweredItem = TwoDAObject.normalizeValue(row.powereditem, 'number', -1) as number;
    if(row.hasOwnProperty('powerupsnd'))
      baseItem.powerUpSound = TwoDAObject.normalizeValue(row.powerupsnd, 'string', '') as string;
    if(row.hasOwnProperty('powerdownsnd'))
      baseItem.powerDownSound = TwoDAObject.normalizeValue(row.powerdownsnd, 'string', '') as string;
    if(row.hasOwnProperty('poweredsnd'))
      baseItem.poweredSound = TwoDAObject.normalizeValue(row.poweredsnd, 'string', '') as string;
    if(row.hasOwnProperty('itemtype'))
      baseItem.itemType = TwoDAObject.normalizeValue(row.itemtype, 'number', 0) as number;
    if(row.hasOwnProperty('bodyvar'))
      baseItem.bodyVar = TwoDAObject.normalizeValue(row.bodyvar, 'string', undefined) as any;
    if(row.hasOwnProperty('specfeat'))
      baseItem.specFeat = TwoDAObject.normalizeValue(row.specfeat, 'number', -1) as number;
    if(row.hasOwnProperty('focfeat'))
      baseItem.focFeat = TwoDAObject.normalizeValue(row.focfeat, 'number', -1) as number;
    if(row.hasOwnProperty('droidorhuman'))
      baseItem.droidOrHuman = TwoDAObject.normalizeValue(row.droidorhuman, 'number', 0) as number;
    if(row.hasOwnProperty('denysubrace'))
      baseItem.denySubrace = TwoDAObject.normalizeValue(row.denysubrace, 'number', 0) as number;
    if(row.hasOwnProperty('armortype'))
      baseItem.armorType = TwoDAObject.normalizeValue(row.armortype, 'string', '') as string;
    if(row.hasOwnProperty('storepanelsort'))
      baseItem.storePanelSort = TwoDAObject.normalizeValue(row.storepanelsort, 'number', 1.7) as number;

    baseItem.postProcess();

    return baseItem;
  }

}