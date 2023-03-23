import { TLKManager } from "../../managers/TLKManager";

const STR_NONE = 363;

export class GUIItemNone {
  constructor(){
    // super()
  }

  getIcon(){
    return 'inone';
  }

  getStackSize(){
    return 1;
  }

  getName(){
    //None String
    return TLKManager.GetStringById(STR_NONE).Value;
  }

}