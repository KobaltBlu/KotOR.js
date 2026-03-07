import type { GFFStruct } from "../resource/GFFStruct";
import { GUIButton } from "./GUIButton";
import { GUICheckBox } from "./GUICheckBox";
import { GUIControl } from "./GUIControl";
import { GUILabel } from "./GUILabel";
import { GUIListBox } from "./GUIListBox";
import { GUIProgressBar } from "./GUIProgressBar";
import { GUIProtoItem } from "./GUIProtoItem";
import { GUIScrollBar } from "./GUIScrollBar";
import { GUISlider } from "./GUISlider";
import type { GameMenu } from "./GameMenu";

/**
 * GUIControlFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControlFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIControlFactory {

  static GUIControl: typeof GUIControl = GUIControl;
  static GUILabel: typeof GUILabel = GUILabel;
  static GUIButton: typeof GUIButton = GUIButton;
  static GUICheckBox: typeof GUICheckBox = GUICheckBox;
  static GUISlider: typeof GUISlider = GUISlider;
  static GUIProgressBar: typeof GUIProgressBar = GUIProgressBar;
  static GUIListBox: typeof GUIListBox = GUIListBox;
  static GUIProtoItem: typeof GUIProtoItem = GUIProtoItem;
  static GUIScrollBar: typeof GUIScrollBar = GUIScrollBar;

  static FromStruct(struct: GFFStruct, menu: GameMenu, parent: GUIControl, scale: boolean): GUIControl {
    const type = ( struct.hasField('CONTROLTYPE') ? struct.getFieldByLabel('CONTROLTYPE')?.getValue() : -1 );
    switch(type){
      case 4:
        return new GUILabel(menu, struct, parent, scale);
      case 6:
        return new GUIButton(menu, struct, parent, scale);
      case 7:
        return new GUICheckBox(menu, struct, parent, scale);
      case 8:
        return new GUISlider(menu, struct, parent, scale);
      case 10:
        return new GUIProgressBar(menu, struct, parent, scale);
      case 11:
        return new GUIListBox(menu, struct, parent, scale);
      default: 
        return new GUIControl(menu, struct, parent, scale);
    }
  }

}