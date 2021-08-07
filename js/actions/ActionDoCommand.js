class ActionDoCommand extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta){
    let script = this.getParameter(0);
    if(script instanceof NWScriptInstance){
      script.setCaller(this.owner);
      script.beginLoop({
        _instr: null, 
        index: -1, 
        seek: script.offset
      });
      return Action.STATUS.COMPLETE;
    }else{
      console.error('ActionDoCommand: Not an instanceof NWScriptInstance');
      return Action.STATUS.FAILED;
    }
    
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionDoCommand;