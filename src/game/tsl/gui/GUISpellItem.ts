import { GUIProtoItem, GUIButton } from "@/gui";
import type { GUIControl, GameMenu } from "@/gui";
import * as THREE from "three";
import { TextureType } from "@/enums/loaders/TextureType";
import { GameEngineType } from "@/enums/engine";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import type { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";

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
    this.extent.height = 45;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  private getBackTexture(): string {
    return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_back' : 'lbl_indent';
  }

  private getArrowTexture(): string {
    return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_arrow' : 'lbl_skarr';
  }

  private applyButtonTexture(buttonIcon: GUIButton, texture: OdysseyTexture | undefined, locked: boolean) {
    if(!texture) return;
    buttonIcon.setMaterialTexture(buttonIcon.border.fill.material, texture);
    buttonIcon.border.fill.material.transparent = true;
    buttonIcon.setMaterialTexture(buttonIcon.highlight.fill.material, texture);
    buttonIcon.highlight.fill.material.transparent = true;
    if(locked){
      const fillMat = buttonIcon.getFill()?.material as THREE.ShaderMaterial | undefined;
      if(fillMat?.uniforms?.opacity){
        fillMat.uniforms.opacity.value = 0.25;
      }
    }
    this.list?.markListRttDirty?.();
  }

  createControl(){
    try{
      super.createControl();

      const iconHeight = this.extent.height;
      const arrowHeight = iconHeight;
      const spellList = Array.isArray(this.node) ? this.node : [];
      const creature = GameState.PartyManager.party[0] || GameState.getCurrentPlayer();
      const backTex = this.getBackTexture();
      const arrowTex = this.getArrowTexture();

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

        TextureLoader.enQueue(backTex, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.applyButtonTexture(buttonIcon, texture, locked);
        });

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
        iconSprite.renderOrder = 5;
        // Keep last icon refs for debugging / cleanup parity with other proto items.
        this.widget.userData.iconMaterial = iconMaterial;
        this.widget.userData.iconSprite = iconSprite;

        const iconName = (isUnknown && !hasSpell)
          ? 'ip_secret'
          : String(spell.iconresref || '').toLowerCase();
        if(iconName && iconName !== '****'){
          TextureLoader.Load(iconName).then((texture: OdysseyTexture) => {
            if(!texture) return;
            iconMaterial.map = texture;
            if(texture.image?.width) iconSprite.scale.x = texture.image.width;
            if(texture.image?.height) iconSprite.scale.y = texture.image.height;
            if(locked && !isUnknown){
              iconMaterial.opacity = 0.25;
            }
            iconMaterial.needsUpdate = true;
            this.list?.markListRttDirty?.();
          });
        }

        _buttonIconWidget.add(iconSprite);

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

          TextureLoader.enQueue(arrowTex, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
            this.applyButtonTexture(arrowIcon, texture, locked && !isUnknown);
          });
        }
      }

      // super.createControl() already flushed the queue; icons/backplates enqueued above need another pass.
      TextureLoader.LoadQueue();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}
