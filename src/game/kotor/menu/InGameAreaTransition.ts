/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel } from "../../../gui";
import * as THREE from "three";
import { ModuleDoor, ModuleObject, ModuleTrigger } from "../../../module";

/* @file
* The InGameAreaTransition menu class.
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
    if((object instanceof ModuleDoor) || (object instanceof ModuleTrigger)){
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
