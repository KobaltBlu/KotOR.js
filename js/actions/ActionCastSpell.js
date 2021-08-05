class ActionCastSpell extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionCastSpell;

    //PARAMS
    // 0 - int: nSpellId
    // 1 - int: Unknown: -1 if cheat enabled
    // 2 - int: nDomainLevel
    // 3 - int: Unknown: Always 0?
    // 4 - int: Unknown: Always 0?
    // 5 - dword: target object id
    // 6 - float: target x
    // 7 - float: target y
    // 8 - float: target z
    // 9 - int: nProjectilePath
    // 10 - int: Unknown: Always -1?
    // 11 - int: Unknown: -1 if cheat enabled

  }

  update(delta){
    //console.log('ACTION.CASTSPELL', this);
    this.target = ModuleObject.GetObjectById(this.getParameter(5) || ModuleObject.OBJECT_INVALID);
    this.spell = new TalentSpell( this.getParameter(0) );

    if(this.spell instanceof TalentSpell){
      if(!this.spell.inRange(this.target, this.owner)){
        this.actionPathfinder(this.spell.getCastRange(), undefined, delta);
        return Action.STATUS.IN_PROGRESS;
      }else{
        this.spell.useTalentOnObject(this.target, this.owner);
        return Action.STATUS.COMPLETE;
      }
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionCastSpell;