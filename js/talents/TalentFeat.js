class TalentFeat extends TalentObject {

  constructor( id = 0){
    super(id);
    this.type = 1;

    //Merge the feat properties from the feat.2da row with this feat
    if(Global.kotor2DA.feat.rows[this.id]){
      Object.assign(this, Global.kotor2DA.feat.rows[this.id]);
    }

  }

  setId( value = 0 ){
    this.id = value;
    //Merge the feat properties from the feat.2da row with this feat
    if(Global.kotor2DA.feat.rows[this.id]){
      Object.assign(this, Global.kotor2DA.feat.rows[this.id]);
    }
  }

  useTalentOnObject(oTarget, oCaster){
    super.useTalentOnObject(oTarget, oCaster);

    //MELEE
    if(this.category == 0x1104){
      oCaster.attackCreature(oTarget, this);
      return;
      oCaster.actionQueue.add({
        type: Action.TYPE.ActionPhysicalAttacks,
        object: oTarget,
        feat: this.id
      });
      oCaster.lastCombatFeatUsed = this;
    }

    //RANGED
    if(this.category == 0x1111){
      oCaster.attackCreature(oTarget, this);
      return;
      oCaster.actionQueue.add({
        type: Action.TYPE.ActionPhysicalAttacks,
        object: oTarget,
        feat: this.id
      });
      oCaster.lastCombatFeatUsed = this;
    }

  }

  inRange(oTarget, oCaster){
    if(oTarget == oCaster){
      return true;
    }
    let distance = oCaster.position.distanceTo(oTarget.position);
    let rangeTolerance = 0.25;

    //MELEE
    if(this.category == 0x1104){
      return distance <= 2.0 + rangeTolerance;
    }

    //RANGED
    if(this.category == 0x1111){
      return distance <= 15.0 + rangeTolerance;
    }

    return true;
  }

  getCastRange(){
    //MELEE
    if(this.category == 0x1104){
      return 2.0;
    }

    //RANGED
    if(this.category == 0x1111){
      return 15;
    }

    return 1;
  }

  static From2DA( object = undefined ){
    if(typeof object == 'object'){
      let feat = new TalentFeat();
      Object.assign(feat, Global.kotor2DA.feat.rows[object.__index]);
      feat.id = object.__index;
      return feat;
    }
    return false;
  }

  save(){
    let featStruct = new Struct(1);
    featStruct.AddField( new Field(GFFDataTypes.WORD, 'Feat') ).SetValue(this.getId());
    return featStruct;
  }

}

TalentFeat.STATUS = {
  UNAVAILABLE: 4,
  GRANTED: 3,
  AVAILABLE: 1
};

module.exports = TalentFeat;