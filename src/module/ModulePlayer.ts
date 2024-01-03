import { ModuleCreature } from ".";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { PartyManager } from "../managers";
import { GFFObject } from "../resource/GFFObject";

/**
* ModulePlayer class.
* 
* Class representing player objects found in modules areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModulePlayer.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModulePlayer extends ModuleCreature {
  isPlayer: boolean = true;
  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModulePlayer;
  }

  update(delta: number = 0){
    super.update(delta);
  }

  save(){
    let gff = super.save();
    PartyManager.PlayerTemplate = gff;
    this.template = gff;
    return gff;
  }

}
