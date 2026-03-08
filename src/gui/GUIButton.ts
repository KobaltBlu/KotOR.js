import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { GFFStruct } from "@/resource/GFFStruct";

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
    if(!this.disableSelection){
      if(this.swapBorderAndHighliteOnHover){
        this.hideBorder();
        this.showHighlight();
      }else{
        this.showBorder();
        this.showHighlight();
      }
      // this.pulsing = true;
      this.setTextColor(this.defaultHighlightColor.r, this.defaultHighlightColor.g, this.defaultHighlightColor.b);
      this.text.material.needsUpdate = true;
    }else{
      this.hover = false;
      this.setTextColor(this.defaultColor.r, this.defaultColor.g, this.defaultColor.b);
      this.text.material.needsUpdate = true;
    }
  }

  onHoverOut(){
    super.onHoverOut();
    if(!this.disableSelection){
      if(this.swapBorderAndHighliteOnHover){
        this.showBorder();
        this.hideHighlight();
      }else{
        this.showBorder();
        this.hideHighlight();
      }

      // this.pulsing = false;
      this.setTextColor(this.defaultColor.r, this.defaultColor.g, this.defaultColor.b);
      this.text.material.needsUpdate = true;
    }else{
      this.hover = false;
      this.setTextColor(this.defaultColor.r, this.defaultColor.g, this.defaultColor.b);
      this.text.material.needsUpdate = true;
    }
  }

}
