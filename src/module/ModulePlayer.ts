/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleCreature } from ".";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { PartyManager } from "../managers";
import { GFFObject } from "../resource/GFFObject";

/* @file
 * The ModulePlayer class.
 */

export class ModulePlayer extends ModuleCreature {
  isPlayer: boolean = true;
  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType = ModuleObjectType.ModulePlayer;
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
