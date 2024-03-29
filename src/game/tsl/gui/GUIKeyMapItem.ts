import { GameMenu, GUIButton, GUIControl, GUIListBox, GUIProtoItem } from "../../../gui";
import { GameEngineType } from "../../../enums/engine";
import { GameState } from "../../../GameState";
import { TextureLoader } from "../../../loaders";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import * as THREE from "three";
import type { TalentSkill } from "../../../talents/TalentSkill";
import { Keymap } from "../../../controls";

/**
 * GUIKeyMapItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIKeyMapItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIKeyMapItem extends GUIProtoItem {

  declare node: Keymap;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 71;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      const spacing = 2;
      const protoWidth = this.extent.width;
      const protoHeight = this.extent.height - spacing;
      const iconWidth = (protoWidth * .30) - spacing;
      const iconHeight = this.extent.height - spacing;

      const labelWidth = protoWidth - iconWidth - this.parent.border.inneroffset;

      //Label
      const buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      buttonLabel.extent.left = 0;
      buttonLabel.extent.width = labelWidth;
      buttonLabel.extent.height = protoHeight;
      buttonLabel.text.text = GameState.TLKManager.GetStringById(this.node.actionstrref)?.Value || '';
      buttonLabel.autoCalculatePosition = false;
      this.children.push(buttonLabel);

      const _buttonWidget = buttonLabel.createControl();
      _buttonWidget.position.x = -(protoWidth - buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      //Key
      const buttonKey = new GUIButton(this.menu, this.control, this, this.scale);
      buttonKey.extent.left = 0;
      buttonKey.extent.width = iconWidth;
      buttonKey.extent.height = protoHeight;
      buttonKey.text.text = this.node.character.toLocaleUpperCase();
      buttonKey.autoCalculatePosition = false;
      this.children.push(buttonKey);

      const _buttonKeyWidget = buttonKey.createControl();
      _buttonKeyWidget.position.x = (protoWidth - iconWidth) / 2;
      _buttonKeyWidget.position.y = 0;
      _buttonKeyWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonKeyWidget);
      
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}
