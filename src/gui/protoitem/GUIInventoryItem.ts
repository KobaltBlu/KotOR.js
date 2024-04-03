import { GameMenu, GUIButton, GUIControl, GUIListBox, GUIProtoItem } from "..";
import { GameEngineType } from "../../enums/engine";
import { GameState } from "../../GameState";
import { TextureLoader } from "../../loaders";
import { GFFStruct } from "../../resource/GFFStruct";
import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";
import * as THREE from "three";

/**
 * GUIInventoryItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIInventoryItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIInventoryItem extends GUIProtoItem {

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

      const spacing = 5;
      const protoWidth = this.extent.width;
      const protoHeight = this.extent.height;
      const iconWidth = this.extent.height;
      const iconHeight = this.extent.height;

      const labelWidth = protoWidth - iconWidth - this.parent.border.inneroffset;

      //Label
      const buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      buttonLabel.extent.left = 0;
      buttonLabel.extent.width = labelWidth;
      buttonLabel.setText(this.node.getName());
      buttonLabel.autoCalculatePosition = false;
      this.children.push(buttonLabel);

      const _buttonWidget = buttonLabel.createControl();
      _buttonWidget.position.x = (protoWidth - buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      //Icon
      const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.setText(this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '');
      buttonIcon.disableTextAlignment();
      buttonIcon.extent.width = iconWidth;
      buttonIcon.extent.height = iconHeight;
      buttonIcon.extent.top = 0;
      buttonIcon.extent.left = 0;
      buttonIcon.disableBorder();
      buttonIcon.disableHighlight();
      buttonIcon.hasText = true;
      buttonIcon.autoCalculatePosition = false;
      this.children.push(buttonIcon);

      const _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(protoWidth/2 - buttonIcon.extent.width/2);
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
      this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );
      //console.log(this.node.getIcon());
      TextureLoader.Load(this.node.getIcon()).then((texture: OdysseyTexture) => {
        if(texture){
          this.widget.userData.iconMaterial.map = texture;
          this.widget.userData.iconMaterial.needsUpdate = true;
        }
      });
      
      this.widget.userData.spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(protoWidth/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      this.widget.userData.iconSprite.scale.x = iconWidth * 0.95;
      this.widget.userData.iconSprite.scale.y = iconHeight * 0.95;
      this.widget.userData.iconSprite.position.z = 2;

      this.widget.userData.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.userData.hexMaterial.transparent = true;
      this.widget.userData.hexSprite = new THREE.Sprite( this.widget.userData.hexMaterial );
      this.widget.userData.hexSprite.scale.x = 
        this.widget.userData.hexSprite.scale.y = iconWidth;
      this.widget.userData.hexSprite.position.z = 1;

      this.widget.userData.spriteGroup.add(this.widget.userData.hexSprite);  
      this.widget.userData.spriteGroup.add(this.widget.userData.iconSprite);

      if(this.node.getStackSize() >= 100){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get(GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_7' : 'uibit_eqp_itm3');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else if(this.node.getStackSize() > 1){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get(GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_6' : 'uibit_eqp_itm2');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else{
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get(GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_3' : 'uibit_eqp_itm1');
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
  
          buttonLabel.showHighlight();
          buttonLabel.hideBorder();
          this.widget.userData.hexMaterial.color.setRGB(1, 1, 0);
          buttonLabel.setHighlightColor(1, 1, 0);
          buttonLabel.pulsing = true;
          buttonIcon.pulsing = true;

          buttonLabel.text.color.setRGB(1, 1, 0);
          buttonLabel.text.material.uniforms.diffuse.value = buttonLabel.text.color;
          buttonLabel.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.setRGB(0, 0.658824, 0.980392);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;
  
          buttonLabel.hideHighlight();
          buttonLabel.showBorder();
          this.widget.userData.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
          buttonLabel.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
          buttonLabel.pulsing = false;
          buttonIcon.pulsing = false;

          buttonLabel.text.color.setRGB(0, 0.658824, 0.980392);
          buttonLabel.text.material.uniforms.diffuse.value = buttonLabel.text.color;
          buttonLabel.text.material.needsUpdate = true;
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
