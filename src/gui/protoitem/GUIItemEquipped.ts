import { TLKManager } from "../../managers";
import { ModuleItem } from "../../module";

const STR_EQUIPPED = 32346;

export class GUIItemEquipped {
  node: ModuleItem;
  equipped: boolean = true;
  constructor(node: ModuleItem){
    this.node = node;
  }

  getIcon(){
    return this.node.getIcon();
  }

  getStackSize(){
    return 1;
  }

  getName(){
    return `${this.node.getName()} (${TLKManager.GetStringById(STR_EQUIPPED).Value})`;
  }

}