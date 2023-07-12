import { GUIProtoItem } from "../../../gui";
import type { GameMenu, GUIControl } from "../../../gui";
import { GFFStruct } from "../../../resource/GFFStruct";


export class GUISaveGameItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  createControl(){
    try{
      super.createControl();
      this.setText(this.node.getFullName());
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
