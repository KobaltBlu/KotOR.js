/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager, TLKManager } from "../managers";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentFeat, TalentSpell } from "../talents";

/* @file
 * The CreatureClass class.
 */

export class CreatureClass {

  id: number;
  level: number;
  spells: any[] = [];
  name: number;
  description: number;

  spellcaster: number;
  attackbonustable: any;
  armorclasscolumn: any;
  featstable: any;

  constructor(id = 0){
    this.id = id;
    this.level = 0;
    this.spells = [];
    Object.assign(this, TwoDAManager.datatables.get('classes').rows[this.id]);
  }

  getName(){
    return TLKManager.GetStringById(this.name).Value;
  }

  getDescription(){
    return TLKManager.GetStringById(this.description).Value;
  }

  setLevel(nLevel = 0){
    this.level = nLevel;
  }

  addSpell(tSpell: TalentSpell){
    if(tSpell instanceof TalentSpell){
      this.spells.push(tSpell);
    }
  }

  getSpells(){
    return this.spells;
  }

  getBaseAttackBonus(){
    return parseInt(TwoDAManager.datatables.get(this.attackbonustable.toLowerCase()).rows[this.level].bab)
  }

  getACBonus(){
    return parseInt(TwoDAManager.datatables.get('acbonus').rows[this.level][this.armorclasscolumn.toLowerCase()]);
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
            spell = new TalentSpell(
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

  save(){
    let _class = new GFFStruct(2);
    _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(this.id);
    _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(this.level);

    //Spell Caster specific data
    if(this.spellcaster == 1){
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
