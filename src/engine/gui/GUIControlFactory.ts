import type { GFFStruct } from "@core/resource/GFFStruct";
import { GUIButton } from "@engine/gui/GUIButton";
import { GUICheckBox } from "@engine/gui/GUICheckBox";
import { GUIControl } from "@engine/gui/GUIControl";
import { GUIEditBox } from "@engine/gui/GUIEditBox";
import { GUILabel } from "@engine/gui/GUILabel";
import { GUIListBox } from "@engine/gui/GUIListBox";
import { GUIProgressBar } from "@engine/gui/GUIProgressBar";
import { GUIProtoItem } from "@engine/gui/GUIProtoItem";
import { GUIScrollBar } from "@engine/gui/GUIScrollBar";
import { GUISlider } from "@engine/gui/GUISlider";
import type { GameMenu } from "@engine/gui/GameMenu";

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
  static GUIEditBox: typeof GUIEditBox = GUIEditBox;
  static GUIButton: typeof GUIButton = GUIButton;
  static GUICheckBox: typeof GUICheckBox = GUICheckBox;
  static GUISlider: typeof GUISlider = GUISlider;
  static GUIProgressBar: typeof GUIProgressBar = GUIProgressBar;
  static GUIListBox: typeof GUIListBox = GUIListBox;
  static GUIProtoItem: typeof GUIProtoItem = GUIProtoItem;
  static GUIScrollBar: typeof GUIScrollBar = GUIScrollBar;

  /**
   * InitControl constructs edit box by TAG (NAME_BOX_EDIT / EDITBOX),
   * not GFF CONTROLTYPE — chargen / save-name.
   */
  static FromStruct(struct: GFFStruct, menu: GameMenu, parent: GUIControl, scale: boolean): GUIControl {
    const tag = struct.hasField('TAG') ? String(struct.getFieldByLabel('TAG')?.getValue() ?? '') : '';
    if(tag === 'NAME_BOX_EDIT' || tag === 'EDITBOX'){
      return new GUIEditBox(menu, struct, parent, scale);
    }

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
