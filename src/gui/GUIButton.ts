import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import type { GFFStruct } from "../resource/GFFStruct";

/**
 * GUIButton class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIButton.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIButton extends GUIControl {
  
  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIButton;
    //this.widget.position.z = -2; 
  }

  onHoverIn(){
    super.onHoverIn();
    this.hideBorder();

    // this.pulsing = true;
    this.text.color.set(this.defaultHighlightColor);
    (this.text.material as any).color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

  onHoverOut(){
    super.onHoverOut();
    this.showBorder();

    // this.pulsing = false;
    this.text.color.set(this.defaultColor);
    (this.text.material as any).color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

}
