import { SWAttackBonus } from "@/engine/rules/SWAttackBonus";
import { SWSavingThrow } from "@/engine/rules/SWSavingThrow";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
// import { TwoDAManager, TLKManager } from "@/managers";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { TwoDAObject, type ITwoDARowData } from "@/resource/TwoDAObject";
import type { TalentSpell } from "@/talents/TalentSpell";

/**
 * CreatureClass class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CreatureClass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CreatureClass {

  id: number = -1;
  label: string = '';
  name: number = -1;
  plural: number = -1;
  lower: number = -1;
  description: number = -1;
  icon: string = '';
  hitdie: number = 8;
  attackbonustable: 'CLS_ATK_1'|'CLS_ATK_2'|'CLS_ATK_3' = 'CLS_ATK_1';
  featstable: string = '';
  savingthrowtable: string = '';
  skillstable: string = '';
  skillpointbase: number = 0;
  spellgaintable: string = '';
  spellknowntable: string ='';
  playerclass: boolean = false;
  spellcaster: boolean = false;
  str: number = 10;
  dex: number = 10;
  con: number = 10;
  wis: number = 10;
  int: number = 10;
  cha: number = 10;
  primaryabil: 'STR'|'DEX'|'WIS'|'CON'|'INT'|'CHA' = 'STR';
  alignrestrict: number = 0;
  alignrstrcttype: number = 0;
  constant: string = '';

  effectiveCRLevel_1: number = 1;
  effectiveCRLevel_2: number = 1;
  effectiveCRLevel_3: number = 1;
  effectiveCRLevel_4: number = 1;
  effectiveCRLevel_5: number = 1;
  effectiveCRLevel_6: number = 1;
  effectiveCRLevel_7: number = 1;
  effectiveCRLevel_8: number = 1;
  effectiveCRLevel_9: number = 1;
  effectiveCRLevel_10: number = 1;
  effectiveCRLevel_11: number = 1;
  effectiveCRLevel_12: number = 1;
  effectiveCRLevel_13: number = 1;
  effectiveCRLevel_14: number = 1;
  effectiveCRLevel_15: number = 1;
  effectiveCRLevel_16: number = 1;
  effectiveCRLevel_17: number = 1;
  effectiveCRLevel_18: number = 1;
  effectiveCRLevel_19: number = 1;
  effectiveCRLevel_20: number = 1;

  forcedie: number = 0;
  armorclasscolumn: string = '';
  featgain: string = '';

  level: number;
  spells: TalentSpell[] = [];

  savingThrows: SWSavingThrow[] = [];
  attackBonuses: SWAttackBonus[] = [];
  featGainPoints: number[] = [];
  spellGainPoints: number[] = [];
  acbonuses: number[] = [];

  constructor(id = -1){
    this.id = id;
    this.level = 0;
    this.spells = [];
    if(id >= 0)
      this.apply2DA(GameState.TwoDAManager.datatables.get('classes').rows[this.id]);
  }

  getName(){
    return GameState.TLKManager.GetStringById(this.name).Value;
  }

  getDescription(){
    return GameState.TLKManager.GetStringById(this.description).Value;
  }

  setLevel(nLevel = 0){
    this.level = nLevel;
  }

  addSpell(tSpell: TalentSpell){
    if(!tSpell){ return; }
    this.spells.push(tSpell);
  }

  getSpells(){
    return this.spells;
  }

  getBaseAttackBonus(){
    return this.attackBonuses[this.level].bab;
  }

  getACBonus(){
    return this.acbonuses[this.level];
  }

  isFeatAvailable( feat: ITwoDARowData | undefined ){
    if(typeof feat != 'undefined'){
      const status = parseInt(String(feat[this.featstable.toLowerCase()+'_list'] ?? ''), 10);
      if(isNaN(status)){
        return false;
      }

      if(status != 4){ //UNAVAILABLE
        return true;
      }
    }
    return false;
  }

  getFeatStatus( feat: ITwoDARowData | undefined ){
    if(typeof feat != 'undefined'){
      const status = parseInt(String(feat[this.featstable.toLowerCase()+'_list'] ?? ''), 10);
      if(isNaN(status)){
        return false;
      }

      return status;
    }
    return -1;
  }

  getFeatGrantedLevel( feat: ITwoDARowData | undefined ){
    if(typeof feat != 'undefined'){
      const granted = parseInt(String(feat[this.featstable.toLowerCase()+'_granted'] ?? ''), 10);
      if(isNaN(granted)){
        return -1;
      }

      return granted;
    }
    return -1;
  }

  static FromCreatureClassStruct(cls_struct: GFFStruct): CreatureClass | undefined {
    if (typeof cls_struct !== 'undefined') {
      const classField = cls_struct.getFieldByLabel('Class');
      const levelField = cls_struct.getFieldByLabel('ClassLevel');
      const cls = new CreatureClass(classField ? classField.getNumber() : 0);
      if (levelField) cls.setLevel(levelField.getNumber());
      const known_struct = cls_struct.getFieldByLabel('KnownList0');
      if (known_struct) {
        const known_spell_structs = known_struct.getChildStructs();
        for (let i = 0; i < known_spell_structs.length; i++) {
          const known_spell_struct = known_spell_structs[i];
          let spell: TalentSpell | undefined;

          if (known_spell_struct.hasField('Spell')) {
            const spellId = known_spell_struct.getFieldByLabel('Spell').getNumber();
            spell = new GameState.TalentSpell(spellId);
          }

          if (typeof spell !== 'undefined') {
            if (known_spell_struct.hasField('SpellFlags'))
              spell.setFlags(known_spell_struct.getFieldByLabel('SpellFlags').getNumber());
            if (known_spell_struct.hasField('SpellMetaMagic'))
              spell.setMetaMagic(known_spell_struct.getFieldByLabel('SpellMetaMagic').getNumber());
            cls.addSpell(spell);
          }
        }
      }
      return cls;
    }
    return undefined;
  }

  apply2DA(row: ITwoDARowData): void {
    this.id = row.__index;

    if (Object.prototype.hasOwnProperty.call(row, 'label'))
      this.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'name'))
      this.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'description'))
      this.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'icon'))
      this.icon = TwoDAObject.normalizeValue(row.icon, 'string', '') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'hitdie'))
      this.hitdie = TwoDAObject.normalizeValue(row.hitdie, 'number', 8) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'attackbonustable'))
      this.attackbonustable = TwoDAObject.normalizeValue(row.attackbonustable, 'string', 'CLS_ATK_1') as 'CLS_ATK_1' | 'CLS_ATK_2' | 'CLS_ATK_3';

    if (Object.prototype.hasOwnProperty.call(row, 'featstable'))
      this.featstable = TwoDAObject.normalizeValue(row.featstable, 'string', 'SOL') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'savingthrowtable'))
      this.savingthrowtable = TwoDAObject.normalizeValue(row.savingthrowtable, 'string', 'CLS_ST_SOL') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'skillstable'))
      this.skillstable = TwoDAObject.normalizeValue(row.skillstable, 'string', 'CLS_SK_SOL') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'skillpointbase'))
      this.skillpointbase = TwoDAObject.normalizeValue(row.skillpointbase, 'number', 1) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'spellgaintable'))
      this.spellgaintable = TwoDAObject.normalizeValue(row.spellgaintable, 'string', '') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'spellknowntable'))
      this.spellknowntable = TwoDAObject.normalizeValue(row.spellknowntable, 'string', '') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'playerclass'))
      this.playerclass = TwoDAObject.normalizeValue(row.playerclass, 'boolean', false) as boolean;

    if (Object.prototype.hasOwnProperty.call(row, 'spellcaster'))
      this.spellcaster = TwoDAObject.normalizeValue(row.spellcaster, 'boolean', false) as boolean;

    if (Object.prototype.hasOwnProperty.call(row, 'str'))
      this.str = TwoDAObject.normalizeValue(row.str, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'dex'))
      this.dex = TwoDAObject.normalizeValue(row.dex, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'con'))
      this.con = TwoDAObject.normalizeValue(row.con, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'wis'))
      this.wis = TwoDAObject.normalizeValue(row.wis, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'int'))
      this.int = TwoDAObject.normalizeValue(row.int, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'cha'))
      this.cha = TwoDAObject.normalizeValue(row.cha, 'number', 10) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'primaryabil'))
      this.primaryabil = TwoDAObject.normalizeValue(row.primaryabil, 'string', 'STR') as 'STR' | 'DEX' | 'WIS' | 'CON' | 'INT' | 'CHA';

    if (Object.prototype.hasOwnProperty.call(row, 'alignrestrict'))
      this.alignrestrict = TwoDAObject.normalizeValue(row.alignrestrict, 'number', 0) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'alignrstrcttype'))
      this.alignrstrcttype = TwoDAObject.normalizeValue(row.alignrstrcttype, 'number', 0) as number;

    if (Object.prototype.hasOwnProperty.call(row, 'constant'))
      this.constant = TwoDAObject.normalizeValue(row.constant, 'string', 'CCLASS_SOLDIER') as string;

    if (Object.prototype.hasOwnProperty.call(row, 'forcedie'))
      this.forcedie = TwoDAObject.normalizeValue(row.forcedie, 'number', 0) as number;

    if(Object.prototype.hasOwnProperty.call(row, 'armorclasscolumn'))
      this.armorclasscolumn = TwoDAObject.normalizeValue(row.armorclasscolumn, 'string', 'SOL') as string;

    if(Object.prototype.hasOwnProperty.call(row, 'featgain'))
      this.featgain = TwoDAObject.normalizeValue(row.featgain, 'string', 'SOL') as string;

    if(this.savingthrowtable){
      const savingThrows = GameState.TwoDAManager.datatables.get(this.savingthrowtable.toLowerCase());
      if(savingThrows){
        this.savingThrows = Object.values(savingThrows.rows).map((row: ITwoDARowData) => SWSavingThrow.From2DA(row));
      }
    }

    if(this.attackbonustable){
      const attackBonuses = GameState.TwoDAManager.datatables.get(this.attackbonustable.toLowerCase());
      if(attackBonuses){
        this.attackBonuses = Object.values(attackBonuses.rows).map((row: ITwoDARowData) => SWAttackBonus.From2DA(row));
      }
    }

    const featGain = GameState.SWRuleSet.featGains;
    if(featGain){
      this.featGainPoints = featGain.getRegular(this.featgain);
    }

    const spellGain = GameState.SWRuleSet.spellGains;
    if(spellGain){
      this.spellGainPoints = spellGain.getSpellGain(this.spellgaintable);
    }

    const acbonuses = GameState.TwoDAManager.datatables.get('acbonus');
    if (acbonuses) {
      this.acbonuses = Object.values(acbonuses.rows).map((row: ITwoDARowData) => {
        const col = row[this.armorclasscolumn.toLowerCase()];
        return (col ? TwoDAObject.normalizeValue(col, 'number', 0) : 0) as number;
      });
    }

  }

  static From2DA(row: ITwoDARowData): CreatureClass {
    const cls = new CreatureClass();
    cls.apply2DA(row);
    return cls;
  }

  save(){
    const _class = new GFFStruct(2);
    _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(this.id);
    _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(this.level);

    //Spell Caster specific data
    if(this.spellcaster){
      //Not sure what this is or if it is used in KOTOR
      const spellsPerDay = _class.addField( new GFFField(GFFDataType.LIST, 'SpellsPerDayList') );
      const spellsPerDayStruct = new GFFStruct(17767);
      spellsPerDayStruct.addField( new GFFField(GFFDataType.BYTE, "NumSpellsLeft").setValue(0));
      spellsPerDay.addChildStruct(spellsPerDayStruct);

      //List of known spells
      const knownList0 = _class.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      for(let i = 0; i < this.spells.length; i++){
        knownList0.addChildStruct(this.spells[i].save());
      }
    }

    return _class;
  }

}
