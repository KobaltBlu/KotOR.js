import { GameState } from "../GameState";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { TwoDAManager, TLKManager } from "../managers";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TwoDAObject } from "../resource/TwoDAObject";
import type { TalentSpell } from "../talents/TalentSpell";

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
  attackbonustable: 'CLS_ATK_1'|'CLS_ATK_2' = 'CLS_ATK_1';
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

  constructor(id = -1){
    this.id = id;
    this.level = 0;
    this.spells = [];
    if(id >= 0) Object.assign(this, GameState.TwoDAManager.datatables.get('classes').rows[this.id]);
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
    return parseInt(GameState.TwoDAManager.datatables.get(this.attackbonustable.toLowerCase()).rows[this.level].bab)
  }

  getACBonus(){
    return parseInt(GameState.TwoDAManager.datatables.get('acbonus').rows[this.level][this.armorclasscolumn.toLowerCase()]);
  }

  isFeatAvailable( feat: any ){
    if(typeof feat != 'undefined'){
      let status = parseInt(feat[this.featstable.toLowerCase()+'_list']);
      if(isNaN(status)){
        return false;
      }

      if(status != 4){ //UNAVAILABLE
        return true;
      }
    }
    return false;
  }

  getFeatStatus( feat: any ){
    if(typeof feat != 'undefined'){
      let status = parseInt(feat[this.featstable.toLowerCase()+'_list']);
      if(isNaN(status)){
        return false;
      }

      return status;
    }
    return -1;
  }

  getFeatGrantedLevel( feat: any ){
    if(typeof feat != 'undefined'){
      let granted = parseInt(feat[this.featstable.toLowerCase()+'_granted']);
      if(isNaN(granted)){
        return -1;
      }

      return granted;
    }
    return -1;
  }

  static FromCreatureClassStruct(cls_struct: GFFStruct){
    if(typeof cls_struct != 'undefined'){
      let cls = new CreatureClass(cls_struct.getFieldByLabel('Class').getValue());
      cls.setLevel(cls_struct.getFieldByLabel('ClassLevel').getValue());
      let known_struct = cls_struct.getFieldByLabel('KnownList0');
      if(known_struct){
        let known_spell_structs = known_struct.getChildStructs();
        for(let i = 0; i < known_spell_structs.length; i++){

          let known_spell_struct = known_spell_structs[i];
          let spell = undefined;

          if(known_spell_struct.hasField('Spell')){
            spell = new GameState.TalentSpell(
              known_spell_struct.getFieldByLabel('Spell').getValue()
            );
          }

          if(typeof spell != 'undefined'){
            if(known_spell_struct.hasField('SpellFlags'))
              spell.setFlags(known_spell_struct.getFieldByLabel('SpellFlags').getValue());
        
            if(known_spell_struct.hasField('SpellMetaMagic'))
              spell.setMetaMagic(known_spell_struct.getFieldByLabel('SpellMetaMagic').getValue());

            cls.addSpell(spell);
          }

        }
      }
      return cls;
    }
    return undefined;
  }

  static From2DA(row: any){
    const cls = new CreatureClass();

    cls.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      cls.label = TwoDAObject.normalizeValue(row.label, 'string', '');

    return cls;
  }

  save(){
    let _class = new GFFStruct(2);
    _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(this.id);
    _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(this.level);

    //Spell Caster specific data
    if(this.spellcaster){
      //Not sure what this is or if it is used in KOTOR
      let spellsPerDay = _class.addField( new GFFField(GFFDataType.LIST, 'SpellsPerDayList') );
      let spellsPerDayStruct = new GFFStruct(17767);
      spellsPerDayStruct.addField( new GFFField(GFFDataType.BYTE, "NumSpellsLeft").setValue(0));
      spellsPerDay.addChildStruct(spellsPerDayStruct);

      //List of known spells
      let knownList0 = _class.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      for(let i = 0; i < this.spells.length; i++){
        knownList0.addChildStruct(this.spells[i].save());
      }
    }

    return _class;
  }

}