import { Creature, createDefaultPartyFollowInfo } from "@engine/module/Creature";
import { GameObjectType } from "@core/enums/module/GameObjectType";
// import { PartyManager } from "@engine/managers/PartyManager";
import { GFFObject } from "@core/resource/GFFObject";
import { GameState } from "@engine/runtime/GameState";

/**
* PlayerCharacter class.
*
* Class representing player objects found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file PlayerCharacter.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class PlayerCharacter extends Creature {
  isPlayer: boolean = true;
  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.PlayerCharacter;
    this.isPM = true;
    this.isPlayer = true;
    this.isPC = 1;
    if(!this.partyFollowInfo){
      this.partyFollowInfo = createDefaultPartyFollowInfo();
    }
  }

  update(delta: number = 0){
    super.update(delta);
  }

  save(){
    let gff = super.save();
    GameState.PartyManager.PlayerTemplate = gff;
    this.template = gff;
    return gff;
  }

}
