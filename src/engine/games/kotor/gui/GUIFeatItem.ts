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
  SkillFlowStatus,
  applyAbilityButtonTexture,
  applySkillFlowStatus,
  enqueueProtoTexture,
  getAbilityArrowTextureName,
  getAbilityBackTextureName,
  getFeatId,
  isUnsetFeatPrereq,
} from "@engine/gui/protoitem/protoItemHelpers";

type FeatSlot = {
  feat: any;
  button: GUIButton;
  iconMaterial: THREE.SpriteMaterial;
  arrowButton?: GUIButton;
  slotIndex: number;
};

/**
 * GUIFeatItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * row: three feat slots + arrows.
 * Status/selection via SetSkillStatus (K1).
 *
 * @file GUIFeatItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIFeatItem extends GUIProtoItem {

  private featSlots: FeatSlot[] = [];

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * AddFeatSet SetExtent:
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
      this.featSlots = [];

      const iconHeight = Math.max(1, asExtentInt(this.extent.height));
      const arrowHeight = 32;
      const featList = this.node;
      const backTex = getAbilityBackTextureName();
      const arrowTex = getAbilityArrowTextureName();
      const protoWidth = asExtentInt(this.extent.width);

      for(let i = 0; i < featList.length; i++){
        const feat = featList[i];
        if(!feat) continue;

        const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.setText('');
        buttonIcon.disableTextAlignment();
        buttonIcon.setExtentWidth(iconHeight);
        buttonIcon.setExtentHeight(iconHeight);
        buttonIcon.hasHighlight = false;
        buttonIcon.disableHighlight();
        const iconW = asExtentInt(buttonIcon.extent.width);
        const iconH = asExtentInt(buttonIcon.extent.height);
        const slotLeft = skillFlowSlotExtentLeft(i, protoWidth, iconW);
        const slotTop = truncDiv(iconHeight - iconH, 2);
        buttonIcon.setExtentLeft(slotLeft);
        buttonIcon.setExtentTop(slotTop);
        // Must remain selectable for MenuGetActiveUIElements / click-to-focus.
        buttonIcon.disableHover = false;
        buttonIcon.hasText = false;
        buttonIcon.autoCalculatePosition = false;
        // Keep geometric border for SetSkillStatus selection chrome (border1d/border2d).
        if(!buttonIcon.border.edge){
          buttonIcon.border.edge = 'border1d';
          buttonIcon.border.corner = 'border2d';
          buttonIcon.initTextures();
        }
        if(!(buttonIcon.border.dimension > 0)){
          buttonIcon.border.dimension = 3;
        }
        buttonIcon.hasBorder = true;
        this.children.push(buttonIcon);

        const _buttonIconWidget = buttonIcon.createControl();
        _buttonIconWidget.position.x = skillFlowCenteredXFromExtentLeft(slotLeft, iconW, protoWidth);
        _buttonIconWidget.position.y = 0;
        _buttonIconWidget.position.z = this.zIndex + 1;
        commitGuiTransform(_buttonIconWidget);
        this.widget.add(_buttonIconWidget);

        const status = this.resolveSlotStatus(feat);
        const locked = status === SkillFlowStatus.Locked || status === SkillFlowStatus.Available;

        enqueueProtoTexture(this as any, backTex, this.chrome.material, (texture) => {
          applyAbilityButtonTexture(buttonIcon, texture, locked);
          this.refreshSlotVisuals();
        }, 'fillMap');

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
        commitGuiTransform(iconSprite);
        iconSprite.renderOrder = this.getRenderOrder(5);

        enqueueProtoTexture(this as any, feat.icon, iconMaterial, (texture) => {
          if(!texture) return;
          if(texture.image?.width) iconSprite.scale.x = texture.image.width;
          if(texture.image?.height) iconSprite.scale.y = texture.image.height;
          commitGuiTransform(iconSprite);
          iconMaterial.needsUpdate = true;
          this.refreshSlotVisuals();
        });

        _buttonIconWidget.add(iconSprite);

        let arrowIcon: GUIButton | undefined;
        if(i > 0){
          arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.setText('');
          arrowIcon.disableTextAlignment();
          arrowIcon.setExtentWidth(arrowHeight);
          arrowIcon.setExtentHeight(arrowHeight);
          const arrowLeft = skillFlowArrowExtentLeft(i, protoWidth, iconW, arrowHeight);
          const arrowTop = truncDiv(iconHeight - arrowHeight, 2);
          arrowIcon.setExtentLeft(arrowLeft);
          arrowIcon.setExtentTop(arrowTop);
          arrowIcon.hasBorder = false;
          arrowIcon.hasHighlight = false;
          arrowIcon.disableBorder();
          arrowIcon.disableHighlight();
          arrowIcon.disableHover = true;
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
            applyAbilityButtonTexture(arrowIcon!, texture, locked);
            this.refreshSlotVisuals();
          }, 'fillMap');
        }

        this.featSlots.push({
          feat,
          button: buttonIcon,
          iconMaterial,
          arrowButton: arrowIcon,
          slotIndex: i,
        });
      }

      this.refreshSlotVisuals();
      TextureLoader.LoadQueue();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

  update(delta: number){
    super.update(delta);
    // Re-assert locked icon/fill alphas after GUIControl.resetPulse — not border chrome
    // (that would kill SetPulsingAlpha on the selected slot).
    this.refreshSlotVisuals(true);
  }

  wantsPulseAnimation(): boolean {
    if(super.wantsPulseAnimation()) return true;
    for(let i = 0; i < this.featSlots.length; i++){
      if(this.featSlots[i].button?.pulsing) return true;
    }
    return false;
  }

  /** Refresh chrome when menu.selectedFeat changes. */
  refreshSlotVisuals(alphasOnly = false){
    const menu = this.menu as any;
    const selectedFeat = menu?.selectedFeat;
    const selectedId = getFeatId(selectedFeat);

    for(let i = 0; i < this.featSlots.length; i++){
      const slot = this.featSlots[i];
      const status = this.resolveSlotStatus(slot.feat);
      const featId = getFeatId(slot.feat);
      applySkillFlowStatus({
        button: slot.button,
        status,
        selected: selectedId >= 0 && featId === selectedId,
        iconMaterial: slot.iconMaterial,
        arrowButton: slot.arrowButton,
        hasArrow: slot.slotIndex > 0,
      }, { alphasOnly });
    }
  }

  /**
   * status for a slot:
   * - Menu may override via getFeatSlotStatus (CharGen BuildButtons mapping).
   * - Default: in-game status 6; locked when prereqs unmet.
   */
  private resolveSlotStatus(feat: any): SkillFlowStatus {
    const menu = this.menu as any;
    if(typeof menu.getFeatSlotStatus === 'function'){
      return menu.getFeatSlotStatus(feat) | 0;
    }

    const creature = GameState.PartyManager?.party?.[0]
      || GameState.CharGenManager?.selectedCreature
      || GameState.PartyManager.getCurrentPlayer();
    if(!creature) return SkillFlowStatus.InGame;

    const prereq1 = feat.prereqFeat1 ?? feat.prereqfeat1;
    const prereq2 = feat.prereqFeat2 ?? feat.prereqfeat2;
    const hasPrereq1 = isUnsetFeatPrereq(prereq1) || creature.getHasFeat(prereq1);
    const hasPrereq2 = isUnsetFeatPrereq(prereq2) || creature.getHasFeat(prereq2);
    if(!hasPrereq1 || !hasPrereq2){
      return SkillFlowStatus.Locked;
    }
    return SkillFlowStatus.InGame;
  }

}
