class TalentSkill extends TalentObject {

  constructor( id = 0, rank = 0 ){
    super( id );
    this.type = 2;
    this.rank = rank;

    //Merge the skill properties from the skills.2da row with this skill
    if(Global.kotor2DA.skills.rows[this.id]){
      Object.assign(this, Global.kotor2DA.skills.rows[this.id]);
    }
  }

  setId( value = 0 ){
    this.id = value;
    if(Global.kotor2DA.skills.rows[this.id]){
      Object.assign(this, Global.kotor2DA.skills.rows[this.id]);
    }
  }

  getRank(){
    return this.rank;
  }

  setRank( value = 0){
    this.rank = value;
  }

  save(){
    let skillStruct = new Struct();
    skillStruct.AddField( new Field(GFFDataTypes.BYTE, 'Rank') ).SetValue(this.getRank());
    return skillStruct;
  }

}

module.exports = TalentSkill;