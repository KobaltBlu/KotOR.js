import { GUIProtoItem, GUIButton } from "@/gui";
import type { GUIControl, GameMenu } from "@/gui";
import * as THREE from "three";
import type { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";
import {
  ABILITY_LOCKED_ICON_ALPHA,
  applyAbilityButtonTexture,
  enqueueProtoTexture,
  getAbilityArrowTextureName,
  getAbilityBackTextureName,
} from "@/gui/protoitem/protoItemHelpers";

/**
 * GUIFeatItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiSkillFlow row: three feat slots + arrows; locked uses alpha 0.25.
 *
 * @file GUIFeatItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIFeatItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
    this.setExtentHeight(48);
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();

      const iconHeight = asExtentInt(this.extent.height);
      const arrowHeight = 32;
      const featList = this.node;
      const backTex = getAbilityBackTextureName();
      const arrowTex = getAbilityArrowTextureName();
      const protoWidth = asExtentInt(this.extent.width);

      for(let i = 0; i < featList.length; i++){
        const feat = featList[i];
        if(!feat) continue;

        const prereq1 = feat.prereqFeat1 ?? feat.prereqfeat1;
        const prereq2 = feat.prereqFeat2 ?? feat.prereqfeat2;
        const creature = (this.menu as any)?.creature
          || GameState.CharGenManager?.selectedCreature
          || GameState.getCurrentPlayer();
        const hasPrereqfeat1 = !creature || (prereq1 == '****' || prereq1 == -1 || prereq1 == null || creature.getHasFeat(prereq1));
        const hasPrereqfeat2 = !creature || (prereq2 == '****' || prereq2 == -1 || prereq2 == null || creature.getHasFeat(prereq2));
        const locked = !hasPrereqfeat1 || !hasPrereqfeat2;

        const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.setText('');
        buttonIcon.disableTextAlignment();
        buttonIcon.setExtentWidth(iconHeight);
        buttonIcon.setExtentHeight(iconHeight);
        buttonIcon.setExtentTop(0);
        buttonIcon.setExtentLeft(0);
        buttonIcon.hasBorder = false;
        buttonIcon.hasHighlight = false;
        buttonIcon.hasText = false;
        buttonIcon.autoCalculatePosition = false;
        this.children.push(buttonIcon);

        const _buttonIconWidget = buttonIcon.createControl();
        switch(i){
          case 2:
            _buttonIconWidget.position.x = truncDiv(protoWidth - asExtentInt(buttonIcon.extent.width), 2);
            break;
          case 1:
            _buttonIconWidget.position.x = 0;
            break;
          default:
            _buttonIconWidget.position.x = -truncDiv(protoWidth - asExtentInt(buttonIcon.extent.width), 2);
            break;
        }
        _buttonIconWidget.position.y = 0;
        _buttonIconWidget.position.z = this.zIndex + 1;
        this.widget.add(_buttonIconWidget);

        enqueueProtoTexture(this as any, backTex, this.border.fill.material, (texture) => {
          applyAbilityButtonTexture(buttonIcon, texture, locked);
        });

        buttonIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          const menu = this.menu as any;
          if(typeof menu.selectFeat === 'function'){
            menu.selectFeat(feat);
          }
        });

        const iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
        iconMaterial.transparent = true;
        const iconSprite = new THREE.Sprite(iconMaterial);
        iconSprite.scale.x = 32;
        iconSprite.scale.y = 32;
        iconSprite.position.z = 5;
        iconSprite.renderOrder = 5;
        this.widget.userData.iconMaterial = iconMaterial;
        this.widget.userData.iconSprite = iconSprite;

        enqueueProtoTexture(this as any, feat.icon, iconMaterial, (texture) => {
          if(!texture) return;
          if(texture.image?.width) iconSprite.scale.x = texture.image.width;
          if(texture.image?.height) iconSprite.scale.y = texture.image.height;
          if(locked){
            iconMaterial.opacity = ABILITY_LOCKED_ICON_ALPHA;
          }
          iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(iconSprite);

        const arrowOffset = truncDiv(truncDiv(protoWidth - asExtentInt(buttonIcon.extent.width), 2), 2);
        if(i > 0){
          const arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.setText('');
          arrowIcon.disableTextAlignment();
          arrowIcon.setExtentWidth(arrowHeight);
          arrowIcon.setExtentHeight(arrowHeight);
          arrowIcon.setExtentTop(0);
          arrowIcon.setExtentLeft(0);
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

          enqueueProtoTexture(this as any, arrowTex, this.border.fill.material, (texture) => {
            applyAbilityButtonTexture(arrowIcon, texture, locked);
          });
        }
      }

      TextureLoader.LoadQueue();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
