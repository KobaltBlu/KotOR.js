import { GUIProtoItem, GUIButton, commitGuiTransform } from "@engine/gui";
import type { GUIControl, GameMenu } from "@engine/gui";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import type { ProtoRowExtent } from "@engine/gui/GUIProtoItem";
import * as THREE from "three";
import type { GFFStruct } from "@core/resource/GFFStruct";
import { GameState } from "@engine/runtime/GameState";
import { GameEngineType } from "@core/enums/engine";
import { TextureLoader } from "@engine/loaders";
import { asExtentInt, truncDiv, skillFlowArrowExtentLeft, skillFlowCenteredXFromExtentLeft, skillFlowSlotExtentLeft } from "@engine/gui/GUICoord";
import {
  ABILITY_LOCKED_ICON_ALPHA,
  applyAbilityButtonTexture,
  enqueueProtoTexture,
  getAbilityArrowTextureName,
  getAbilityBackTextureName,
} from "@engine/gui/protoitem/protoItemHelpers";

const UNKNOWN_SPELLS: number[] = [176, 177, 178, 179, 180, 181, 182];

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
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * AddPowerSet SetExtent (same as AddFeatSet):
   * K1: {0,0,0xf2 (242), 0x28 (40)}
   * TSL: width 0x106 (262), height ftol(scalar * 40.0)
   */
  getProtoBaseExtent(_list: GUIListBox): ProtoRowExtent {
    const isTsl = GameState.GameKey == GameEngineType.TSL;
    return {
      left: 0,
      top: 0,
      width: isTsl ? 262 : 242,
      height: 40,
    };
  }

  buildChrome(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();

      const iconHeight = Math.max(1, asExtentInt(this.extent.height));
      const arrowHeight = 32;
      const spellList = Array.isArray(this.node) ? this.node : [];
      const creature = GameState.PartyManager.party[0] || GameState.PartyManager.getCurrentPlayer();
      const backTex = getAbilityBackTextureName();
      const arrowTex = getAbilityArrowTextureName();
      const protoWidth = asExtentInt(this.extent.width);

      for(let i = 0; i < spellList.length; i++){
        const spell = spellList[i];
        if(!spell) continue;

        const spellId = typeof spell.__index === 'number' ? spell.__index : (spell.id | 0);
        const hasSpell = !!creature?.getHasSpell?.(spellId);
        const isUnknown = UNKNOWN_SPELLS.indexOf(spellId) >= 0;
        const locked = !hasSpell;

        const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.name = 'BUTTON';
        buttonIcon.setText('');
        buttonIcon.disableTextAlignment();
        buttonIcon.setExtentWidth(iconHeight);
        buttonIcon.setExtentHeight(iconHeight);
        const iconW = asExtentInt(buttonIcon.extent.width);
        const iconH = asExtentInt(buttonIcon.extent.height);
        const slotLeft = skillFlowSlotExtentLeft(i, protoWidth, iconW);
        buttonIcon.setExtentLeft(slotLeft);
        buttonIcon.setExtentTop(truncDiv(iconHeight - iconH, 2));
        buttonIcon.hasBorder = false;
        buttonIcon.hasHighlight = false;
        buttonIcon.hasText = false;
        buttonIcon.autoCalculatePosition = false;
        this.children.push(buttonIcon);

        const _buttonIconWidget = buttonIcon.createControl();
        _buttonIconWidget.position.x = skillFlowCenteredXFromExtentLeft(slotLeft, iconW, protoWidth);
        _buttonIconWidget.position.y = 0;
        _buttonIconWidget.position.z = this.zIndex + 1;
        commitGuiTransform(_buttonIconWidget);
        this.widget.add(_buttonIconWidget);

        enqueueProtoTexture(this as any, backTex, this.chrome.material, (texture) => {
          applyAbilityButtonTexture(buttonIcon, texture, locked);
        }, 'fillMap');

        buttonIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          const menu = this.menu as any;
          if(typeof menu.selectPower === 'function'){
            menu.selectPower(spell);
          }
        });

        const iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
        iconMaterial.transparent = true;
        const iconSprite = new THREE.Sprite(iconMaterial);
        iconSprite.scale.x = 32;
        iconSprite.scale.y = 32;
        iconSprite.position.z = 5;
        commitGuiTransform(iconSprite);
        iconSprite.renderOrder = this.getRenderOrder(5);

        const iconName = (isUnknown && !hasSpell)
          ? 'ip_secret'
          : String(spell.iconresref || '').toLowerCase();
        if(iconName && iconName !== '****'){
          enqueueProtoTexture(this as any, iconName, iconMaterial, (texture) => {
            if(!texture) return;
            if(texture.image?.width) iconSprite.scale.x = texture.image.width;
            if(texture.image?.height) iconSprite.scale.y = texture.image.height;
            commitGuiTransform(iconSprite);
            if(locked && !isUnknown){
              iconMaterial.opacity = ABILITY_LOCKED_ICON_ALPHA;
            }
            iconMaterial.needsUpdate = true;
          });
        }

        _buttonIconWidget.add(iconSprite);

        if(i > 0){
          const arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.name = 'ARROW';
          arrowIcon.setText('');
          arrowIcon.disableTextAlignment();
          arrowIcon.setExtentWidth(arrowHeight);
          arrowIcon.setExtentHeight(arrowHeight);
          const arrowLeft = skillFlowArrowExtentLeft(i, protoWidth, iconW, arrowHeight);
          arrowIcon.setExtentLeft(arrowLeft);
          arrowIcon.setExtentTop(truncDiv(iconHeight - arrowHeight, 2));
          arrowIcon.hasBorder = false;
          arrowIcon.hasHighlight = false;
          arrowIcon.disableBorder();
          arrowIcon.disableHighlight();
          arrowIcon.hasText = false;
          arrowIcon.autoCalculatePosition = false;
          this.children.push(arrowIcon);

          const _arrowIconWidget = arrowIcon.createControl();
          _arrowIconWidget.position.x = skillFlowCenteredXFromExtentLeft(arrowLeft, arrowHeight, protoWidth);
          _arrowIconWidget.position.y = 0;
          _arrowIconWidget.position.z = this.zIndex + 1;
          commitGuiTransform(_arrowIconWidget);
          this.widget.add(_arrowIconWidget);

          enqueueProtoTexture(this as any, arrowTex, this.chrome.material, (texture) => {
            applyAbilityButtonTexture(arrowIcon, texture, locked && !isUnknown);
          }, 'fillMap');
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
