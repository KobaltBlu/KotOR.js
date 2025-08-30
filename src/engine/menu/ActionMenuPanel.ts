import type { ActionMenuItem } from "./ActionMenuItem";

/**
 * ActionMenuPanel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionMenuPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuPanel {
  selectedIndex = 0;
  actions: any[] = [];

  constructor(){

  }

  previousAction(){
    if(this.actions.length){
      this.selectedIndex -= 1;
      if(this.selectedIndex < 0)
      this.selectedIndex = this.actions.length - 1;
    }else{
      this.selectedIndex = 0;
    }
  }

  nextAction(){
    if(this.actions.length){
      this.selectedIndex += 1;
      if(this.selectedIndex > (this.actions.length - 1))
        this.selectedIndex = 0;
    }else{
      this.selectedIndex = 0;
    }
  }

  addAction(action: ActionMenuItem){
    if(!action){ return; }
    this.actions.push(action);
  }

  getSelectedAction(){
    return this.actions[this.selectedIndex];
  }

  clearActions(){
    this.actions = [];
  }

  reset(){
    this.selectedIndex = 0;
  }
}