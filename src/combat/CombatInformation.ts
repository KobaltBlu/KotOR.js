import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";

/**
 * One AttackList / DamageList element — retail CCombatInformationNode (5 bytes).
 * Attack list type 0xAAEE; Damage list type 0xDDEE.
 */
export class CombatInformationNode {
  modifier: number = 0;
  /** DamageList only (AttackList omits ModifierType). */
  modifierType: number = 0;
  weaponWield: number = 0;
  versusGoodEvil: number = 0;
  versusRace: number = 0;

  constructor(){
    this.versusRace = GameState.SWRuleSet?.racialTypeCount ?? 0;
  }

  toStruct(structIdx: number, includeModifierType: boolean): GFFStruct {
    const struct = new GFFStruct(structIdx);
    struct.addField(new GFFField(GFFDataType.CHAR, 'Modifier')).setValue(this.modifier | 0);
    if(includeModifierType){
      struct.addField(new GFFField(GFFDataType.BYTE, 'ModifierType')).setValue(this.modifierType | 0);
    }
    struct.addField(new GFFField(GFFDataType.BYTE, 'WeaponWield')).setValue(this.weaponWield | 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'VersusGoodEvil')).setValue(this.versusGoodEvil | 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'VersusRace')).setValue(
      this.versusRace | (GameState.SWRuleSet?.racialTypeCount ?? 0)
    );
    return struct;
  }

  fromStruct(struct: GFFStruct, includeModifierType: boolean){
    if(!struct) return;
    const get = (label: string, fallback: number = 0) =>
      struct.hasField(label) ? struct.getFieldByLabel(label).getValue() : fallback;
    this.modifier = get('Modifier');
    if(includeModifierType){
      this.modifierType = get('ModifierType');
    }
    this.weaponWield = get('WeaponWield');
    this.versusGoodEvil = get('VersusGoodEvil');
    this.versusRace = get('VersusRace', GameState.SWRuleSet?.racialTypeCount ?? 0);
  }
}

/**
 * Retail CCombatInformation — SaveData @ 00550f30 / LoadData @ 00552350.
 * GFF struct type 0xCAAA under creature "CombatInfo".
 *
 * @file CombatInformation.ts
 */
export class CombatInformation {
  numAttacks: number = 0;
  onHandAttackMod: number = 0;
  onHandDamageMod: number = 0;
  offHandAttackMod: number = 0;
  offHandDamageMod: number = 0;
  forceResistance: number = 0;
  arcaneSpellFail: number = 0;
  armorCheckPen: number = 0;
  unarmedDamDice: number = 0;
  unarmedDamDie: number = 0;
  onHandCritRng: number = 0;
  onHandCritMult: number = 0;
  offHandWeaponEq: number = 0;
  offHandCritRng: number = 0;
  offHandCritMult: number = 0;
  leftEquip: number = ModuleObjectConstant.OBJECT_INVALID;
  rightEquip: number = ModuleObjectConstant.OBJECT_INVALID;
  leftString: string = '';
  rightString: string = '';
  damageDice: number = 0;
  damageDie: number = 0;
  attackList: CombatInformationNode[] = [];
  damageList: CombatInformationNode[] = [];

  /**
   * Retail CCombatInformation::SaveData @ 00550f30 (struct type 0xCAAA).
   */
  toStruct(structIdx: number = 0xCAAA): GFFStruct {
    const struct = new GFFStruct(structIdx);
    struct.addField(new GFFField(GFFDataType.BYTE, 'NumAttacks')).setValue(this.numAttacks & 0xff);
    struct.addField(new GFFField(GFFDataType.CHAR, 'OnHandAttackMod')).setValue(this.onHandAttackMod | 0);
    struct.addField(new GFFField(GFFDataType.CHAR, 'OnHandDamageMod')).setValue(this.onHandDamageMod | 0);
    struct.addField(new GFFField(GFFDataType.CHAR, 'OffHandAttackMod')).setValue(this.offHandAttackMod | 0);
    struct.addField(new GFFField(GFFDataType.CHAR, 'OffHandDamageMod')).setValue(this.offHandDamageMod | 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ForceResistance')).setValue(this.forceResistance & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ArcaneSpellFail')).setValue(this.arcaneSpellFail & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ArmorCheckPen')).setValue(this.armorCheckPen & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'UnarmedDamDice')).setValue(this.unarmedDamDice & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'UnarmedDamDie')).setValue(this.unarmedDamDie & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'OnHandCritRng')).setValue(this.onHandCritRng & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'OnHandCritMult')).setValue(this.onHandCritMult & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'OffHandWeaponEq')).setValue(this.offHandWeaponEq & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'OffHandCritRng')).setValue(this.offHandCritRng & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'OffHandCritMult')).setValue(this.offHandCritMult & 0xff);
    struct.addField(new GFFField(GFFDataType.DWORD, 'LeftEquip')).setValue(this.leftEquip >>> 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'RightEquip')).setValue(this.rightEquip >>> 0);
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'LeftString')).setValue(this.leftString || '');
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'RightString')).setValue(this.rightString || '');
    struct.addField(new GFFField(GFFDataType.BYTE, 'DamageDice')).setValue(this.damageDice & 0xff);
    struct.addField(new GFFField(GFFDataType.BYTE, 'DamageDie')).setValue(this.damageDie & 0xff);

    const attackList = struct.addField(new GFFField(GFFDataType.LIST, 'AttackList'));
    for(let i = 0; i < this.attackList.length; i++){
      attackList.addChildStruct(this.attackList[i].toStruct(0xAAEE, false));
    }

    const damageList = struct.addField(new GFFField(GFFDataType.LIST, 'DamageList'));
    for(let i = 0; i < this.damageList.length; i++){
      damageList.addChildStruct(this.damageList[i].toStruct(0xDDEE, true));
    }

    return struct;
  }

  /**
   * Retail CCombatInformation::LoadData @ 00552350.
   */
  fromStruct(struct: GFFStruct): boolean {
    if(!struct) return false;
    const get = (label: string, fallback: number | string = 0) =>
      struct.hasField(label) ? struct.getFieldByLabel(label).getValue() : fallback;

    this.numAttacks = get('NumAttacks', this.numAttacks) as number;
    this.onHandAttackMod = get('OnHandAttackMod', this.onHandAttackMod) as number;
    this.onHandDamageMod = get('OnHandDamageMod', this.onHandDamageMod) as number;
    this.offHandAttackMod = get('OffHandAttackMod', this.offHandAttackMod) as number;
    this.offHandDamageMod = get('OffHandDamageMod', this.offHandDamageMod) as number;
    this.forceResistance = get('ForceResistance', this.forceResistance) as number;
    this.arcaneSpellFail = get('ArcaneSpellFail', this.arcaneSpellFail) as number;
    this.armorCheckPen = get('ArmorCheckPen', this.armorCheckPen) as number;
    this.unarmedDamDice = get('UnarmedDamDice', this.unarmedDamDice) as number;
    this.unarmedDamDie = get('UnarmedDamDie', this.unarmedDamDie) as number;
    this.onHandCritRng = get('OnHandCritRng', this.onHandCritRng) as number;
    this.onHandCritMult = get('OnHandCritMult', this.onHandCritMult) as number;
    this.offHandWeaponEq = get('OffHandWeaponEq', this.offHandWeaponEq) as number;
    this.offHandCritRng = get('OffHandCritRng', this.offHandCritRng) as number;
    this.offHandCritMult = get('OffHandCritMult', this.offHandCritMult) as number;
    this.leftEquip = get('LeftEquip', this.leftEquip) as number;
    this.rightEquip = get('RightEquip', this.rightEquip) as number;
    this.leftString = String(get('LeftString', this.leftString) ?? '');
    this.rightString = String(get('RightString', this.rightString) ?? '');
    this.damageDice = get('DamageDice', 0) as number;
    this.damageDie = get('DamageDie', 0) as number;

    this.attackList = [];
    if(struct.hasField('AttackList')){
      const list = struct.getFieldByLabel('AttackList').getChildStructs() || [];
      for(let i = 0; i < list.length; i++){
        const node = new CombatInformationNode();
        node.fromStruct(list[i], false);
        this.attackList.push(node);
      }
    }

    this.damageList = [];
    if(struct.hasField('DamageList')){
      const list = struct.getFieldByLabel('DamageList').getChildStructs() || [];
      for(let i = 0; i < list.length; i++){
        const node = new CombatInformationNode();
        node.fromStruct(list[i], true);
        this.damageList.push(node);
      }
    }

    return true;
  }
}
