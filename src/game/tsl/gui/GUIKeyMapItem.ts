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
  buttonLabel: GUIButton;
  buttonKey: GUIButton;

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
      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.extent.left = 0;
      this.buttonLabel.extent.width = labelWidth;
      this.buttonLabel.extent.height = protoHeight;
      this.buttonLabel.setText(GameState.TLKManager.GetStringById(this.node.actionstrref)?.Value || '');
      this.buttonLabel.autoCalculatePosition = false;
      this.children.push(this.buttonLabel);

      const _buttonWidget = this.buttonLabel.createControl();
      _buttonWidget.position.x = -(protoWidth - this.buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      //Key
      this.buttonKey = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonKey.extent.left = 0;
      this.buttonKey.extent.width = iconWidth;
      this.buttonKey.extent.height = protoHeight;
      this.buttonKey.setText(this.node.character.toLocaleUpperCase());
      this.buttonKey.autoCalculatePosition = false;
      this.children.push(this.buttonKey);

      const _buttonKeyWidget = this.buttonKey.createControl();
      _buttonKeyWidget.position.x = (protoWidth - iconWidth) / 2;
      _buttonKeyWidget.position.y = 0;
      _buttonKeyWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonKeyWidget);

      this.buttonLabel.addEventListener('click', (e) => {
        this.list.select(this);
      });
      
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

  setKeyText(key: string){
    this.buttonKey.setText(key);
  }

  onSelectStateChanged(){
    super.onSelectStateChanged();
    if(this.selected){
      this.buttonLabel.selected = true;
      this.buttonKey.selected = true;
    }else{
      this.buttonLabel.selected = false;
      this.buttonKey.selected = false;
    }
  }

}
