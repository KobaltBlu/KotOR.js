import { ModuleCreature } from "./ModuleCreature";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
// import { PartyManager } from "../managers/PartyManager";
import { GFFObject } from "../resource/GFFObject";
import { GameState } from "../GameState";
import { ModuleObjectScript } from "../enums/module/ModuleObjectScript";

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
    this.isPM = true;
    this.isPlayer = true;
  }

  update(delta: number = 0){
    super.update(delta);
  }

  onDeath(){
    super.onDeath();
    if(!GameState.module){ return true; }
    // Track the last player that died for GetLastPlayerDied NWScript
    GameState.module.lastPlayerDied = this;
    // Fire the module-level OnPlayerDeath script
    const deathScript = GameState.module.scripts[ModuleObjectScript.ModuleOnPlayerDeath];
    if(deathScript){
      const instance = deathScript.newInstance();
      instance.run(GameState.module);
    }
    return true;
  }

  onDying(){
    if(!GameState.module){ return; }
    // Track the last player that is dying for GetLastPlayerDying NWScript
    GameState.module.lastPlayerDying = this;
    // Fire the module-level OnPlayerDying script
    const dyingScript = GameState.module.scripts[ModuleObjectScript.ModuleOnPlayerDying];
    if(dyingScript){
      const instance = dyingScript.newInstance();
      instance.run(GameState.module);
    }
  }

  save(){
    let gff = super.save();
    GameState.PartyManager.PlayerTemplate = gff;
    this.template = gff;
    return gff;
  }

}
