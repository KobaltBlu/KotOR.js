import * as THREE from "three";

import { GUIButton, GUIListBox, GUIProtoItem } from "..";

import { GameEngineType } from "@/enums/engine";
import { TextureType } from "@/enums/loaders/TextureType";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import { TextureLoader } from "@/loaders";
import { GFFStruct } from "@/resource/GFFStruct";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

interface IEquipmentNode {
  getName(): string;
  getStackSize(): number;
  getIcon(): string;
}

interface IEquipmentWidgetUserData {
  iconMaterial?: THREE.SpriteMaterial;
  iconSprite?: THREE.Sprite;
  spriteGroup?: THREE.Group;
  hexMaterial?: THREE.SpriteMaterial;
  hexSprite?: THREE.Sprite;
}

/**
 * GUIEquipmentItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIEquipmentItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIEquipmentItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  private getEquipmentNode(): IEquipmentNode | undefined {
    const node = this.node as unknown;
    if (
      node != null
      && typeof (node as IEquipmentNode).getName === 'function'
      && typeof (node as IEquipmentNode).getStackSize === 'function'
      && typeof (node as IEquipmentNode).getIcon === 'function'
    ) {
      return node as IEquipmentNode;
    }
    return undefined;
  }

  createControl(){
    try{
      super.createControl();
      const node = this.getEquipmentNode();
      if(!node){
        return this.widget;
      }

      const widgetUserData = this.widget.userData as IEquipmentWidgetUserData;
      //Create the actual control elements below
      const button = new GUIButton(this.menu, this.control, this, this.scale);
      button.extent.width = 190;
      button.setText(node.getName());
      button.autoCalculatePosition = false;
      this.children.push(button);

      const _buttonWidget = button.createControl();
      _buttonWidget.position.x = (this.extent.width - button.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.setText(node.getStackSize() > 1 ? node.getStackSize().toString() : '');
      buttonIcon.disableTextAlignment();
      buttonIcon.extent.width = 55;
      buttonIcon.extent.height = 55;
      buttonIcon.extent.top = 0;
      buttonIcon.extent.left = 0;
      buttonIcon.disableBorder();
      buttonIcon.disableHighlight();
      buttonIcon.hasText = true;
      buttonIcon.autoCalculatePosition = false;
      this.children.push(buttonIcon);

      const _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      //Stack Count Text Position
      const buttonIconTextGroup = (buttonIcon.widget.userData as { text?: THREE.Group }).text;
      if(node.getStackSize() >= 100){
        buttonIconTextGroup?.position.set(6, -10, 5);
      }else if(node.getStackSize() >= 10){
        buttonIconTextGroup?.position.set(10, -10, 5);
      }else{
        buttonIconTextGroup?.position.set(14, -10, 5);
      }

      this.widget.add(_buttonIconWidget);

      widgetUserData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      widgetUserData.iconMaterial.transparent = true;
      widgetUserData.iconMaterial.visible = false;
      widgetUserData.iconSprite = new THREE.Sprite( widgetUserData.iconMaterial );
      //log.info(this.node.getIcon());
      TextureLoader.enQueue(node.getIcon(), widgetUserData.iconMaterial, TextureType.TEXTURE, (_texture: OdysseyTexture) => {
        if (widgetUserData.iconMaterial) {
          widgetUserData.iconMaterial.visible = true;
        }
      });

      widgetUserData.spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(this.extent.width/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      widgetUserData.iconSprite.scale.x = 52;
      widgetUserData.iconSprite.scale.y = 52;
      widgetUserData.iconSprite.position.z = 1;

      widgetUserData.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      widgetUserData.hexMaterial.transparent = true;
      widgetUserData.hexSprite = new THREE.Sprite( widgetUserData.hexMaterial );
      widgetUserData.hexSprite.scale.x = widgetUserData.hexSprite.scale.y = 64;
      widgetUserData.hexSprite.position.z = 1;

      if(GameState.GameKey != GameEngineType.TSL)
        widgetUserData.spriteGroup.add(widgetUserData.hexSprite);

      widgetUserData.spriteGroup.add(widgetUserData.iconSprite);

      if(node.getStackSize() >= 100){
        widgetUserData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_7');
        widgetUserData.hexMaterial.needsUpdate = true;
      }else if(node.getStackSize() > 1){
        widgetUserData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_6');
        widgetUserData.hexMaterial.needsUpdate = true;
      }else{
        widgetUserData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_3');
        widgetUserData.hexMaterial.needsUpdate = true;
      }

      this.onSelect = () => {
        if(this.selected){
          this.showHighlight();
          this.hideBorder();
          this.pulsing = true;
          this.text.color.setRGB(1, 1, 0);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          button.showHighlight();
          button.hideBorder();
          widgetUserData.hexMaterial.color.setRGB(1, 1, 0);
          button.setHighlightColor(1, 1, 0);
          button.pulsing = true;
          buttonIcon.pulsing = true;

          button.text.color.setRGB(1, 1, 0);
          button.text.material.uniforms.diffuse.value = button.text.color;
          button.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.setRGB(0, 0.658824, 0.980392);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          button.hideHighlight();
          button.showBorder();
          widgetUserData.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
          button.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
          button.pulsing = false;
          buttonIcon.pulsing = false;

          button.text.color.setRGB(0, 0.658824, 0.980392);
          button.text.material.uniforms.diffuse.value = button.text.color;
          button.text.material.needsUpdate = true;
        }
      };
      this.onSelect.call(this);

      //StackCount Text
      _buttonIconWidget.add(widgetUserData.spriteGroup);
      return this.widget;
    }catch(e){
      log.error(e);
    }
    return this.widget;

  }

}
