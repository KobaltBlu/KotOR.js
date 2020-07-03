class TalentSkill extends TalentObject {

  constructor(options = {}){
    super(options);
    this.type = 2;

    //Merge the skill properties from the skills.2da row with this skill
    if(Global.kotor2DA.skills.rows[options.id]){
      Object.assign(this, Global.kotor2DA.skills.rows[options.id]);
    }

    this.rank = options.rank || 0;

  }

}

module.exports = TalentSkill;