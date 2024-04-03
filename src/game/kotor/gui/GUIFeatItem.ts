import { GUIProtoItem, GUIButton } from "../../../gui";
import type { GUIControl, GameMenu } from "../../../gui";
import * as THREE from "three";
import { TextureType } from "../../../enums/loaders/TextureType";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import type { GFFStruct } from "../../../resource/GFFStruct";
import { GameState } from "../../../GameState";
import { TextureLoader } from "../../../loaders";

/**
 * GUIFeatItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIFeatItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIFeatItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
    this.extent.height = 48;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      let featList = this.node;
      let spacing = 5;
      for(let i = 0; i < featList.length; i++){
        let feat = featList[i];

        let hasPrereqfeat1 = (feat.prereqfeat1 == '****' || GameState.getCurrentPlayer().getHasFeat(feat.prereqfeat1));
        let hasPrereqfeat2 = (feat.prereqfeat2 == '****' || GameState.getCurrentPlayer().getHasFeat(feat.prereqfeat2));
        let hasFeat = GameState.getCurrentPlayer().getHasFeat(feat.__index);

        console.log(feat.constant, hasPrereqfeat1, hasPrereqfeat2);

        let locked = !hasFeat || (!hasPrereqfeat1 || !hasPrereqfeat2);

        let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.setText('');
        buttonIcon.disableTextAlignment();
        buttonIcon.extent.width = 56;
        buttonIcon.extent.height = 56;
        buttonIcon.extent.top = 0;
        buttonIcon.extent.left = 0;
        buttonIcon.hasBorder = false;
        buttonIcon.hasHighlight = false;
        buttonIcon.hasText = false;
        buttonIcon.autoCalculatePosition = false;
        this.children.push(buttonIcon);

        let _buttonIconWidget = buttonIcon.createControl();
        switch(i){
          case 2:
            _buttonIconWidget.position.x = (this.extent.width/2 - buttonIcon.extent.width/2);
          break;
          case 1:
            _buttonIconWidget.position.x = 0;
          break;
          default:
            _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
          break;
        }
        _buttonIconWidget.position.y = 0;
        _buttonIconWidget.position.z = this.zIndex + 1;

        this.widget.add(_buttonIconWidget);

        TextureLoader.enQueue('lbl_indent', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          buttonIcon.setMaterialTexture( buttonIcon.border.fill.material, texture);
          buttonIcon.border.fill.material.transparent = true;
          buttonIcon.setMaterialTexture( buttonIcon.highlight.fill.material, texture);
          buttonIcon.highlight.fill.material.transparent = true;
          if(locked){
            (buttonIcon.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 0.00;
          }
        });

        buttonIcon.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        /* FEAT ICON */

        this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );

        this.widget.userData.iconSprite.scale.x = 32;
        this.widget.userData.iconSprite.scale.y = 32;
        this.widget.userData.iconSprite.position.z = 5;
        this.widget.userData.iconSprite.renderOrder = 5;
        TextureLoader.enQueue(feat.icon, this.widget.userData.iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.widget.userData.iconSprite.scale.x = texture.image.width;
          this.widget.userData.iconSprite.scale.y = texture.image.height;
          if(locked){
            this.widget.userData.iconMaterial.opacity = 0.00;
          }
          this.widget.userData.iconMaterial.transparent = true;
          this.widget.userData.iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(this.widget.userData.iconSprite);

        /*
        * BLUE ARROW
        */
        
        let arrowOffset = (this.extent.width/2 - buttonIcon.extent.width/2)/2;
        if(i > 0){
          let arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.setText('');
          arrowIcon.disableTextAlignment();
          arrowIcon.extent.width = 32;
          arrowIcon.extent.height = 32;
          arrowIcon.extent.top = 0;
          arrowIcon.extent.left = 0;
          arrowIcon.hasBorder = false;
          arrowIcon.hasHighlight = false;
          arrowIcon.disableBorder();
          arrowIcon.disableHighlight();
          arrowIcon.hasText = false;
          arrowIcon.autoCalculatePosition = false;
          this.children.push(arrowIcon);

          let _arrowIconWidget = arrowIcon.createControl();
          switch(i){
            case 2:
              _arrowIconWidget.position.x = arrowOffset;
            break;
            case 1:
              _arrowIconWidget.position.x = -arrowOffset;
            break;
          }
          _arrowIconWidget.position.y = 0;
          _arrowIconWidget.position.z = this.zIndex + 1;

          this.widget.add(_arrowIconWidget);

          TextureLoader.enQueue('lbl_skarr', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
            arrowIcon.setMaterialTexture( arrowIcon.border.fill.material, texture);
            arrowIcon.border.fill.material.transparent = true;
            arrowIcon.setMaterialTexture( arrowIcon.highlight.fill.material, texture);
            arrowIcon.highlight.fill.material.transparent = true;
            if(locked){
              arrowIcon.border.fill.material.uniforms.opacity.value = 0.25;
              arrowIcon.highlight.fill.material.uniforms.opacity.value = 0.25;
            }
          });

          //lbl_skarr
        }

      }
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}