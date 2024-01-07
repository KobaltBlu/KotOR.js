import { GameState } from "../GameState";
import { EventTimedEvent } from "../events";

/**
 * NWScriptSubroutine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptSubroutine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
