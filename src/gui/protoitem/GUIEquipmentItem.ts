import { GUIButton, GUIListBox, GUIProtoItem } from "..";
import { GameState } from "../../GameState";
import { GameEngineType } from "../../enums/engine";
import { TextureType } from "../../enums/loaders/TextureType";
import { TextureLoader } from "../../loaders";
import { GFFStruct } from "../../resource/GFFStruct";
import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";
import { GUIControl } from "../GUIControl";
import { GameMenu } from "../GameMenu";
import * as THREE from "three";

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

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below
      let button = new GUIButton(this.menu, this.control, this, this.scale);
      button.extent.width = 190;
      button.setText(this.node.getName());
      button.autoCalculatePosition = false;
      this.children.push(button);

      let _buttonWidget = button.createControl();
      _buttonWidget.position.x = (this.extent.width - button.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.setText(this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '');
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

      let _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      //Stack Count Text Position
      if(this.node.getStackSize() >= 100){
        buttonIcon.widget.userData.text.position.set(6, -10, 5);
      }else if(this.node.getStackSize() >= 10){
        buttonIcon.widget.userData.text.position.set(10, -10, 5);
      }else{
        buttonIcon.widget.userData.text.position.set(14, -10, 5);
      }

      this.widget.add(_buttonIconWidget);

      this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.userData.iconMaterial.transparent = true;
      this.widget.userData.iconMaterial.visible = false;
      this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );
      //console.log(this.node.getIcon());
      TextureLoader.enQueue(this.node.getIcon(), this.widget.userData.iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        this.widget.userData.iconMaterial.visible = true;
      });
      
      this.widget.userData.spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(this.extent.width/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      this.widget.userData.iconSprite.scale.x = 52;
      this.widget.userData.iconSprite.scale.y = 52;
      this.widget.userData.iconSprite.position.z = 1;

      this.widget.userData.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.userData.hexMaterial.transparent = true;
      this.widget.userData.hexSprite = new THREE.Sprite( this.widget.userData.hexMaterial );
      this.widget.userData.hexSprite.scale.x = this.widget.userData.hexSprite.scale.y = 64;
      this.widget.userData.hexSprite.position.z = 1;

      if(GameState.GameKey != GameEngineType.TSL)
        this.widget.userData.spriteGroup.add(this.widget.userData.hexSprite);
        
      this.widget.userData.spriteGroup.add(this.widget.userData.iconSprite);

      if(this.node.getStackSize() >= 100){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_7');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else if(this.node.getStackSize() > 1){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_6');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else{
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_3');
        this.widget.userData.hexMaterial.needsUpdate = true;
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
          this.widget.userData.hexMaterial.color.setRGB(1, 1, 0);
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
          this.widget.userData.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
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
      _buttonIconWidget.add(this.widget.userData.spriteGroup);
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}