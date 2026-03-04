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

interface FeatRowLike {
  __index: string;
  prereqfeat1?: string;
  prereqfeat2?: string;
  constant?: string;
  icon?: string;
}

interface PlayerFeatLike {
  getHasFeat: (featId: string) => boolean;
}

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
      const arrowHeight = iconHeight/2; //32

      const featList: FeatRowLike[] = Array.isArray(this.node) ? this.node as FeatRowLike[] : [];
      const player = GameState.getCurrentPlayer() as PlayerFeatLike;
      for(let i = 0; i < featList.length; i++){
        const feat = featList[i];

        const hasPrereqfeat1 = (feat.prereqfeat1 == '****' || player.getHasFeat(feat.prereqfeat1 ?? ''));
        const hasPrereqfeat2 = (feat.prereqfeat2 == '****' || player.getHasFeat(feat.prereqfeat2 ?? ''));
        const hasFeat = player.getHasFeat(feat.__index);

        log.debug('feat', feat.constant, hasPrereqfeat1, hasPrereqfeat2);

        const locked = !hasFeat || (!hasPrereqfeat1 || !hasPrereqfeat2);
        if(locked){ continue; }

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
        TextureLoader.enQueue(feat.icon ?? '', iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          const image = texture.image as { width?: number; height?: number };
          iconSprite.scale.x = image.width ?? iconSprite.scale.x;
          iconSprite.scale.y = image.height ?? iconSprite.scale.y;
          if(locked){
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
            if(locked){
              arrowBorderMaterial.uniforms.opacity.value = 0.25;
              arrowHighlightMaterial.uniforms.opacity.value = 0.25;
            }
          });
        }

      }
      return this.widget;
    }catch(e){
      log.error('GUIFeatItem createControl', e);
    }
    return this.widget;

  }

}
