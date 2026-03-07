import { EngineMode } from "../../../enums/engine/EngineMode";
import { ModuleObjectType } from "../../../enums/module/ModuleObjectType";
import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";
import type { ModuleObject } from "../../../module";
import { BitWise } from "../../../utility/BitWise";

/**
 * InGameAreaTransition class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameAreaTransition.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameAreaTransition extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_ICON: GUILabel;
  LBL_TEXTBG: GUILabel;
  LBL_DESCRIPTION: GUILabel;

  transitionObject: ModuleObject;

  constructor(){
    super();
    this.gui_resref = 'areatransition';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  SetDescription(text = '') {
    this.LBL_DESCRIPTION.setText(text);
  }

  setTransitionObject(object: ModuleObject){
    if(!object) return;

    if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(object, ModuleObjectType.ModuleTrigger)){
      this.transitionObject = object;
      this.SetDescription(object.getTransitionDestin());
    }
  }

  unsetTransitionObject(object: ModuleObject){
    if(this.transitionObject == object){
      this.transitionObject = undefined;
    }
  }
  
}
