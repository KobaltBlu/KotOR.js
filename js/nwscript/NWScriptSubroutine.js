class NWScriptSubroutine {

  returnAddress = -1;
  delayCommands = [];

  constructor( returnAddress = -1 ){
    this.returnAddress = returnAddress;
  }

  addDelayCommand( command = undefined ){
    if(typeof command == 'object'){
      this.delayCommands.push(command);
    }
  }

  onEnd(){
    for(let i = 0, len = this.delayCommands.length; i < len; i++){
      Game.module.eventQueue.push(this.delayCommands[i]);
    }
  }


}

module.exports = NWScriptSubroutine;