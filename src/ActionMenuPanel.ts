import { ActionMenuItem } from "./ActionMenuItem";

export class ActionMenuPanel {
  selectedIndex = 0;
  actions: ActionMenuItem[] = [];

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
    if(action instanceof ActionMenuItem){
      this.actions.push(action);
    }
  }

  getSelectedAction(): ActionMenuItem {
    return this.actions[this.selectedIndex];
  }

  clearActions(){
    this.actions = [];
  }

  reset(){
    this.selectedIndex = 0;
  }
}