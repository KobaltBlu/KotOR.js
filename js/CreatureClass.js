class CreatureClass {

  constructor(id = 0){
    this.id = id;
    this.level = 0;
    this.spells = [];
    Object.assign(this, Global.kotor2DA.classes.rows[this.id]);
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

  static FromCreatureClassStruct(cls_struct = undefined){
    if(typeof cls_struct != 'undefined'){
      let cls = new CreatureClass(cls_struct.GetFieldByLabel('Class').GetValue());
      cls.setLevel(cls_struct.GetFieldByLabel('ClassLevel').GetValue());
      let known_struct = cls_struct.GetFieldByLabel('KnownList0');
      if(known_struct){
        let known_spell_structs = known_struct.GetChildStructs();
        for(let i = 0; i < known_spell_structs.length; i++){

          let known_spell_struct = known_spell_structs[i];
          let spell = {
            type: 0,
            id: 0,
            flags: 0,
            metaMagic: 0
          };

          if(known_spell_struct.HasField('Spell'))
            spell.id = known_spell_struct.GetFieldByLabel('Spell').GetValue();
      
          if(known_spell_struct.HasField('SpellFlags'))
            spell.flags = known_spell_struct.GetFieldByLabel('SpellFlags').GetValue();
      
          if(known_spell_struct.HasField('SpellMetaMagic'))
            spell.metaMagic = known_spell_struct.GetFieldByLabel('SpellMetaMagic').GetValue();

          cls.addSpell(new TalentSpell(spell));

        }
      }
      return cls;
    }
    return undefined;
  }

}

module.exports = CreatureClass;