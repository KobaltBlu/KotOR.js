/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CreatureClass class.
 */

class CreatureClass {

  constructor(id = 0){
    this.id = id;
    this.level = 0;
    this.spells = [];
    Object.assign(this, Global.kotor2DA.classes.rows[this.id]);
  }

  getName(){
    return Global.kotorTLK.GetStringById(this.name);
  }

  getDescription(){
    return Global.kotorTLK.GetStringById(this.description);
  }

  setLevel(nLevel = 0){
    this.level = nLevel;
  }

  addSpell(tSpell = undefined){
    if(tSpell instanceof TalentSpell){
      this.spells.push(tSpell);
    }
  }

  getSpells(){
    return this.spells;
  }

  getBaseAttackBonus(){
    return parseInt(Global.kotor2DA[this.attackbonustable.toLowerCase()].rows[this.level].bab);
  }

  getACBonus(){
    return parseInt(Global.kotor2DA.acbonus.rows[this.level][this.armorclasscolumn.toLowerCase()]);
  }

  isFeatAvailable( feat = undefined ){
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

  getFeatStatus( feat = undefined ){
    if(typeof feat != 'undefined'){
      let status = parseInt(feat[this.featstable.toLowerCase()+'_list']);
      if(isNaN(status)){
        return false;
      }

      return status;
    }
    return -1;
  }

  getFeatGrantedLevel( feat = undefined ){
    if(typeof feat != 'undefined'){
      let granted = parseInt(feat[this.featstable.toLowerCase()+'_granted']);
      if(isNaN(granted)){
        return -1;
      }

      return granted;
    }
    return -1;
  }

  static FromCreatureClassStruct(cls_struct = undefined){
    if(typeof cls_struct != 'undefined'){
      let cls = new CreatureClass(cls_struct.GetFieldByLabel('Class').GetValue());
      cls.setLevel(cls_struct.GetFieldByLabel('ClassLevel').GetValue());
      let known_struct = cls_struct.GetFieldByLabel('KnownList0');
      if(known_struct){
        let known_spell_structs = known_struct.GetChildStructs();
        for(let i = 0; i < known_spell_structs.length; i++){

          let known_spell_struct = known_spell_structs[i];
          let spell = undefined;

          if(known_spell_struct.HasField('Spell')){
            spell = new TalentSpell(
              known_spell_struct.GetFieldByLabel('Spell').GetValue()
            );
          }

          if(typeof spell != 'undefined'){
            if(known_spell_struct.HasField('SpellFlags'))
              spell.setFlags(known_spell_struct.GetFieldByLabel('SpellFlags').GetValue());
        
            if(known_spell_struct.HasField('SpellMetaMagic'))
              spell.setMetaMagic(known_spell_struct.GetFieldByLabel('SpellMetaMagic').GetValue());

            cls.addSpell(spell);
          }

        }
      }
      return cls;
    }
    return undefined;
  }

  save(){
    let _class = new Struct(2);
    _class.AddField( new Field(GFFDataTypes.INT, 'Class') ).SetValue(this.id);
    _class.AddField( new Field(GFFDataTypes.SHORT, 'ClassLevel') ).SetValue(this.level);

    //Spell Caster specific data
    if(this.spellcaster == 1){
      //Not sure what this is or if it is used in KOTOR
      let spellsPerDay = _class.AddField( new Field(GFFDataTypes.LIST, 'SpellsPerDayList') );
      let spellsPerDayStruct = new Struct(17767);
      spellsPerDayStruct.AddField( new Field(GFFDataTypes.BYTE, "NumSpellsLeft").SetValue(0));
      spellsPerDay.AddChildStruct(spellsPerDayStruct);

      //List of known spells
      let knownList0 = _class.AddField( new Field(GFFDataTypes.LIST, 'KnownList0') );
      for(let i = 0; i < this.spells.length; i++){
        knownList0.AddChildStruct(this.spells[i].save());
      }
    }

    return _class;
  }

}

module.exports = CreatureClass;