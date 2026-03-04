import * as THREE from "three";

import { TextureType } from "@/enums/loaders/TextureType";
import { GameState } from "@/GameState";
import { GUIProtoItem, GUIButton } from "@/gui";
import type { GUIControl, GameMenu } from "@/gui";
import { TextureLoader } from "@/loaders";
import type { GFFStruct } from "@/resource/GFFStruct";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

interface SpellRowLike {
  __index: number;
  constant?: string;
  iconresref?: string;
}

interface PlayerSpellLike {
  getHasSpell: (spellId: number) => boolean;
}

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

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl | null | undefined = undefined, scale = false){
    super(menu, control, parent ?? undefined, scale);
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

      const iconHeight = this.extent.height;
      const arrowHeight = iconHeight; //32

      const spellList: SpellRowLike[] = Array.isArray(this.node) ? this.node as SpellRowLike[] : [];
      const player = GameState.PartyManager.party[0] as PlayerSpellLike;
      for(let i = 0; i < spellList.length; i++){
        const spell = spellList[i];

        const hasPrereq = true;
        /*if(spell.prerequisites != '****'){
          const requiredSpellIds = spell.prerequisites.split('_').map((id:string) => parseInt(id));
          for(let j = 0; j < requiredSpellIds.length; j++){
            if(!GameState.PartyManager.party[0].getHasSpell(requiredSpellIds[j])){
              hasPrereq = false;
              break;
            }
          }
        }*/

        const hasSpell = player.getHasSpell(spell.__index);

        log.debug('spell', spell.constant, hasPrereq);

        const unknownSpells: number[] = [176, 177, 178, 179, 180, 181, 182];
        const isUnknown = unknownSpells.indexOf(spell.__index) >= 0;

        const locked = !hasSpell;//!hasSpell || !hasPrereq;
        // if(locked){ continue; }

        const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
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

        const _buttonIconWidget = buttonIcon.createControl();
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

        TextureLoader.enQueue('uibit_abi_back', this.border.fill.material as THREE.Material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          const buttonBorderMaterial = buttonIcon.border.fill.material as THREE.ShaderMaterial;
          const buttonHighlightMaterial = buttonIcon.highlight.fill.material as THREE.ShaderMaterial;
          buttonIcon.setMaterialTexture(buttonBorderMaterial, texture);
          buttonBorderMaterial.transparent = true;
          buttonIcon.setMaterialTexture(buttonHighlightMaterial, texture);
          buttonHighlightMaterial.transparent = true;
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
        const iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
        const iconSprite = new THREE.Sprite(iconMaterial);

        iconSprite.scale.x = 32;
        iconSprite.scale.y = 32;
        iconSprite.position.z = 5;
        iconSprite.renderOrder = 5;
        TextureLoader.enQueue((isUnknown && !hasSpell) ? 'ip_secret' : (spell.iconresref ?? ''), iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          const image = texture.image as { width?: number; height?: number };
          iconSprite.scale.x = image.width ?? iconSprite.scale.x;
          iconSprite.scale.y = image.height ?? iconSprite.scale.y;
          if(locked && !isUnknown){
            iconMaterial.opacity = 0.25;
          }
          iconMaterial.transparent = true;
          iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(iconSprite);

        /**
         * BLUE ARROW
         */
        const arrowOffset = (this.extent.width/2 - buttonIcon.extent.width/2)/2;
        if(i > 0){
          const arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
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

          const _arrowIconWidget = arrowIcon.createControl();
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

          TextureLoader.enQueue('uibit_abi_arrow', this.border.fill.material as THREE.Material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
            const arrowBorderMaterial = arrowIcon.border.fill.material as THREE.ShaderMaterial;
            const arrowHighlightMaterial = arrowIcon.highlight.fill.material as THREE.ShaderMaterial;
            arrowIcon.setMaterialTexture(arrowBorderMaterial, texture);
            arrowBorderMaterial.transparent = true;
            arrowIcon.setMaterialTexture(arrowHighlightMaterial, texture);
            arrowHighlightMaterial.transparent = true;
            if(locked && !isUnknown){
              arrowBorderMaterial.uniforms.opacity.value = 0.25;
              arrowHighlightMaterial.uniforms.opacity.value = 0.25;
            }
          });
        }

      }
      return this.widget;
    }catch(e){
      log.error('GUISpellItem createControl', e);
    }
    return this.widget;

  }

}
