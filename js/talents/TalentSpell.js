class TalentSpell extends TalentObject {

  constructor(options = {}){
    super(options);
    this.type = 0;

    //Merge the spell properties from the spells.2da row with this spell
    if(Global.kotor2DA.spells.rows[options.id]){
      Object.assign(this, Global.kotor2DA.spells.rows[options.id]);
    }

    

  }

  getConjureTime(){
    return this.conjtime != '****' ? parseInt(this.conjtime) : 0;
  }

  getCastTime(){
    return this.casttime != '****' ? parseInt(this.casttime) : 0;
  }

  getCatchTime(){
    return this.catchtime != '****' ? parseInt(this.catchtime) : 0;
  }

  useTalentOnObject(oTarget, oCaster){
    super.useTalentOnObject(oTarget, oCaster);
    
    //I'm assuming that usertype: 1 means force powers
    //if(this.usertype == 1){

      if(this.hostilesetting == 1){
        oCaster.combatState = true;
      }
      CombatEngine.AddCombatant(oCaster);

      oCaster.combatQueue.push({
        target: oTarget,
        type: ModuleCreature.ACTION.CASTSPELL,
        icon: this.iconresref,
        spell: this,
        ready: false,
        animation: 'castout1',
        conjureTime: this.getConjureTime(),
        castTime: this.getCastTime(),
        catchTime: this.getCatchTime(),
        completed: false
      });

    //}

    //Medpacks, Armbands, etc...
    /*if(this.usertype == 4){
      oCaster.lastSpellTarget = oTarget;
      oCaster.lastAttemptedSpellTarget = oTarget;
      oCaster.casting.push({
        target: oTarget,
        type: ModuleCreature.ACTION.CASTSPELL,
        icon: this.iconresref,
        spell: this,
        conjureTime: this.getConjureTime(),
        castTime: this.getCastTime(),
        catchTime: this.getCatchTime(),
        completed: false
      });
    }*/

  }
  
  update(oTarget, oCaster, combatAction, delta){
    
    if(combatAction.conjureTime > 0){
      combatAction.conjuring = true;
      combatAction.conjureTime -= (1000 * delta);
    }else if(combatAction.castTime > 0){

      if(!combatAction.impact){
        combatAction.conjuring = false;
        this.impact(oTarget, oCaster);
        //We only want to run the impact script once
        combatAction.impact = true;
      }

      combatAction.castTime -= (1000 * delta);
    }else{
      combatAction.conjuring = false;
      combatAction.impact = false;

      //I guess the spell is over now
      combatAction.completed = true;
    }

    if(this.casthandmodel){
      this.casthandmodel.update(delta);
    }

  }

  impact(oTarget, oCaster){
    if(this.impactscript != '****'){
      console.log('Casting spell', this.impactscript, this);
      NWScript.Load(this.impactscript).then((instance) => {
        //pass the talent to the script instance and run it
        instance.talent = this;
        //instance.spellTarget = oTarget;
        instance.run(oCaster, 0, () => { });
      });
    }

    if(this.casthandvisual != '****'){
      Game.ModelLoader.load({
        file: this.casthandvisual,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            context: this.object.context,
            onComplete: (model) => {
              this.casthandmodel = model;

              if(this.object.model){
                if(this.object.model.lhand){
                  this.object.model.lhand.add(this.casthandmodel);
                  TextureLoader.LoadQueue();
                  this.casthandmodel.playAnimation('cast01', {}, () => {
                    //Clean up the impact effect
                    this.casthandmodel.dispose();
                  });
                }else{
                  this.casthandmodel.dispose();
                }
              }else{
                this.casthandmodel.dispose();
              }

            }
          });
        }
      });
    }
  }

  inRange(oTarget, oCaster){
    if(oTarget == oCaster){
      return true;
    }
    let distance = oCaster.position.distanceTo(oTarget.position);
    //Spell ranges are defined in the ranges.2da file
    switch(this.range){
      case 'L': //Large
        return distance < 28;
      case 'M': //Medium
        return distance < 15;
      case 'P': //Personal
        return true;
      case 'S': //Small
        return distance < 10;
      case 'T': //Touch
        return true;//distance < 2.25;
      case 'W': //Throw
        return distance < 15;
    }
    return true;
  }

}

TalentSpell.MODE = {
  INIT: 0,
  CONJURING: 1,
  CASTING: 2,
  CATCHING: 3
};

module.exports = TalentSpell;