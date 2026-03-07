import { GUIProtoItem, GUIButton } from "../../../gui";
import type { GUIControl, GameMenu } from "../../../gui";
import * as THREE from "three";
import { TextureType } from "../../../enums/loaders/TextureType";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import type { GFFStruct } from "../../../resource/GFFStruct";
import { GameState } from "../../../GameState";
import { TextureLoader } from "../../../loaders";

/**
 * GUISpellItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUISpellItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUISpellItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
    this.extent.height = 45;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      let iconHeight = this.extent.height;
      let arrowHeight = iconHeight; //32

      let spellList = this.node;
      for(let i = 0; i < spellList.length; i++){
        let spell = spellList[i];

        let hasPrereq = true;
        /*if(spell.prerequisites != '****'){
          const requiredSpellIds = spell.prerequisites.split('_').map((id:string) => parseInt(id));
          for(let j = 0; j < requiredSpellIds.length; j++){
            if(!GameState.PartyManager.party[0].getHasSpell(requiredSpellIds[j])){
              hasPrereq = false;
              break;
            }
          }
        }*/

        let hasSpell = GameState.PartyManager.party[0].getHasSpell(spell.__index);

        console.log(spell.constant, hasPrereq);

        const unknownSpells: number[] = [176, 177, 178, 179, 180, 181, 182];
        const isUnknown = unknownSpells.indexOf(spell.__index) >= 0;

        let locked = !hasSpell;//!hasSpell || !hasPrereq;
        // if(locked){ continue; }

        let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.name = 'BUTTON';
        buttonIcon.setText('');
        buttonIcon.disableTextAlignment();
        buttonIcon.extent.width = iconHeight;
        buttonIcon.extent.height = iconHeight;
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

        TextureLoader.enQueue('uibit_abi_back', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          buttonIcon.setMaterialTexture( buttonIcon.border.fill.material, texture);
          buttonIcon.border.fill.material.transparent = true;
          buttonIcon.setMaterialTexture( buttonIcon.highlight.fill.material, texture);
          buttonIcon.highlight.fill.material.transparent = true;
          if(locked){
            (buttonIcon.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 0.25;
          }
        });

        buttonIcon.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        /**
         * FEAT ICON 
         */ 
        this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );

        this.widget.userData.iconSprite.scale.x = 32;
        this.widget.userData.iconSprite.scale.y = 32;
        this.widget.userData.iconSprite.position.z = 5;
        this.widget.userData.iconSprite.renderOrder = 5;
        TextureLoader.enQueue((isUnknown && !hasSpell) ? 'ip_secret' : spell.iconresref, this.widget.userData.iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.widget.userData.iconSprite.scale.x = texture.image.width;
          this.widget.userData.iconSprite.scale.y = texture.image.height;
          if(locked && !isUnknown){
            this.widget.userData.iconMaterial.opacity = 0.25;
          }
          this.widget.userData.iconMaterial.transparent = true;
          this.widget.userData.iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(this.widget.userData.iconSprite);

        /**
         * BLUE ARROW
         */
        let arrowOffset = (this.extent.width/2 - buttonIcon.extent.width/2)/2;
        if(i > 0){
          let arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.name = 'ARROW';
          arrowIcon.setText('');
          arrowIcon.disableTextAlignment();
          arrowIcon.extent.width = arrowHeight;
          arrowIcon.extent.height = arrowHeight;
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

          TextureLoader.enQueue('uibit_abi_arrow', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
            arrowIcon.setMaterialTexture( arrowIcon.border.fill.material, texture);
            arrowIcon.border.fill.material.transparent = true;
            arrowIcon.setMaterialTexture( arrowIcon.highlight.fill.material, texture);
            arrowIcon.highlight.fill.material.transparent = true;
            if(locked && !isUnknown){
              arrowIcon.border.fill.material.uniforms.opacity.value = 0.25;
              arrowIcon.highlight.fill.material.uniforms.opacity.value = 0.25;
            }
          });
        }

      }
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}