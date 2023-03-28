import { GameState } from "../GameState";
import { EventTimedEvent } from "../events";

export class NWScriptSubroutine {

  returnAddress = -1;
  delayCommands: EventTimedEvent[] = [];

  constructor( returnAddress = -1 ){
    this.returnAddress = returnAddress;
  }

  addDelayCommand( command?: any ){
    if(typeof command == 'object'){
      this.delayCommands.push(command);
    }
  }

  onEnd(){
    for(let i = 0, len = this.delayCommands.length; i < len; i++){
      GameState.module.eventQueue.push(this.delayCommands[i]);
    }
  }


}
