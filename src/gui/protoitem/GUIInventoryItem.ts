import { GameMenu, GUIButton, GUIControl, GUIListBox, GUIProtoItem } from '@/gui';
import { GameEngineType } from '@/enums/engine';
import { GameState } from '@/GameState';
import { TextureLoader } from '@/loaders';
import { GFFStruct } from '@/resource/GFFStruct';
import { OdysseyTexture } from '@/three/odyssey/OdysseyTexture';
import * as THREE from 'three';
import { GUIControlAlignment } from '@/enums/gui/GUIControlAlignment';

import { GameEngineType } from '@/enums/engine';
import { GameState } from '@/GameState';
import { GameMenu, GUIButton, GUIControl, GUIListBox, GUIProtoItem } from '@/gui';
import { TextureLoader } from '@/loaders';
import { GFFStruct } from '@/resource/GFFStruct';
import { OdysseyTexture } from '@/three/odyssey/OdysseyTexture';

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
  buttonLabel: GUIButton;
  buttonIcon: GUIButton;

  spriteGroup: THREE.Group;

  //Hex Border Decal
  hexMaterial: THREE.SpriteMaterial;
  hexSprite: THREE.Sprite;
  //Item Icon
  iconMaterial: THREE.SpriteMaterial;
  iconSprite: THREE.Sprite;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false) {
    super(menu, control, parent, scale);
    this.listRowAlignExtentToWrappedText = false;
  }

  buildFill() {}
  buildBorder() {}
  buildHighlight() {}
  buildText() {}

  createControl() {
    try {
      const isContainer = this.menu.gui_resref == 'container';
      if (this.menu.gui_resref == 'inventory') {
        this.setExtentHeight(52.5);
      } else if (this.menu.gui_resref == 'equip') {
        this.setExtentHeight(52.5);
      } else if (isContainer) {
        this.setExtentHeight(60);
      }
      super.createControl();
      //Create the actual control elements below

      const protoWidth = this.extent.width;
      const protoHeight = this.extent.height;
      const iconWidth = isContainer ? 60 : 60;
      const iconHeight = isContainer ? 60 : 60;

      const labelWidth = protoWidth - iconWidth + 5;

      //Label
      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.extent.left = 0;
      this.buttonLabel.extent.width = labelWidth;
      if (!isContainer) {
        this.buttonLabel.setTextAlignment(GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter);
      } else {
        this.buttonLabel.setTextAlignment(GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalCenter);
      }
      this.buttonLabel.setText(this.node.getName());
      this.buttonLabel.autoCalculatePosition = false;
      this.buttonLabel.disableHover = true;
      this.children.push(this.buttonLabel);

      const _buttonWidget = this.buttonLabel.createControl();
      _buttonWidget.position.x = (protoWidth - this.buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      //Icon
      this.buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonIcon.setExtentWidth(iconWidth);
      this.buttonIcon.setExtentHeight(iconHeight);
      this.buttonIcon.setExtentTop(0);
      this.buttonIcon.setExtentLeft(0);
      this.buttonIcon.setTextAlignment(GUIControlAlignment.HorizontalRight | GUIControlAlignment.VerticalBottom);
      this.buttonIcon.setText(this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '');
      this.buttonIcon.disableBorder();
      this.buttonIcon.disableHighlight();
      this.buttonIcon.hasText = true;
      this.buttonIcon.autoCalculatePosition = false;
      this.buttonIcon.resizeControl();
      this.buttonIcon.disableHover = true;
      this.children.push(this.buttonIcon);

      const _buttonIconWidget = this.buttonIcon.createControl();
      _buttonIconWidget.position.x = -(protoWidth / 2 - this.buttonIcon.extent.width / 2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      this.widget.add(_buttonIconWidget);

      this.iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.iconMaterial.transparent = true;
      this.iconMaterial.visible = false;
      this.iconSprite = new THREE.Sprite(this.iconMaterial);
      //console.log(this.node.getIcon());
      TextureLoader.Load(this.node.getIcon()).then((texture: OdysseyTexture) => {
        if (texture) {
          this.iconMaterial.map = texture;
          this.iconMaterial.needsUpdate = true;
          this.iconMaterial.visible = true;
        }
      });

      this.spriteGroup = new THREE.Group();
      this.iconSprite.scale.x = iconWidth * 0.9;
      this.iconSprite.scale.y = iconHeight * 0.9;
      this.iconSprite.position.z = 2;

      this.hexMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.hexMaterial.transparent = true;
      this.hexSprite = new THREE.Sprite(this.hexMaterial);
      this.hexSprite.scale.x = this.hexSprite.scale.y = iconWidth;
      this.hexSprite.position.z = 1;

      this.spriteGroup.add(this.hexSprite);
      this.spriteGroup.add(this.iconSprite);

      if (this.node.getStackSize() >= 100) {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_7' : 'uibit_eqp_itm3'
        );
        this.hexMaterial.needsUpdate = true;
      } else if (this.node.getStackSize() > 1) {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_6' : 'uibit_eqp_itm2'
        );
        this.hexMaterial.needsUpdate = true;
      } else {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_3' : 'uibit_eqp_itm1'
        );
        this.hexMaterial.needsUpdate = true;
      }

      this.onSelect = () => {
        if (this.selected) {
          this.showHighlight();
          this.hideBorder();
          this.pulsing = true;
          this.text.color.setRGB(1, 1, 0);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          this.buttonLabel.showHighlight();
          this.buttonLabel.hideBorder();
          this.hexMaterial.color.setRGB(1, 1, 0);
          this.buttonLabel.setHighlightColor(1, 1, 0);
          this.buttonLabel.pulsing = true;
          this.buttonIcon.pulsing = true;

          this.buttonLabel.text.color.setRGB(1, 1, 0);
          this.buttonLabel.text.material.uniforms.diffuse.value = this.buttonLabel.text.color;
          this.buttonLabel.text.material.needsUpdate = true;
        } else {
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.setRGB(0, 0.658824, 0.980392);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          this.buttonLabel.hideHighlight();
          this.buttonLabel.showBorder();
          this.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
          this.buttonLabel.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
          this.buttonLabel.pulsing = false;
          this.buttonIcon.pulsing = false;

          this.buttonLabel.text.color.setRGB(0, 0.658824, 0.980392);
          this.buttonLabel.text.material.uniforms.diffuse.value = this.buttonLabel.text.color;
          this.buttonLabel.text.material.needsUpdate = true;
        }
      };
      this.onSelect.call(this);

      //StackCount Text
      _buttonIconWidget.add(this.spriteGroup);
      return this.widget;
    } catch (e) {
      console.error(e);
    }
    return this.widget;
  }

  update(delta: number) {
    const isDirty = this.needsUpdate;
    super.update(delta);
    const opacity = this.disableSelection ? 0.5 : 1;
    const pulseOpacity = this.selected ? 1 - 0.5 * GameState.MenuManager.pulseOpacity * opacity : opacity;
    this.hexMaterial.opacity = pulseOpacity;

    if (isDirty) {
      this.buttonIcon.setText(this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '');
      if (this.node.getStackSize() >= 100) {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_7' : 'uibit_eqp_itm3'
        );
        this.hexMaterial.needsUpdate = true;
      } else if (this.node.getStackSize() > 1) {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_6' : 'uibit_eqp_itm2'
        );
        this.hexMaterial.needsUpdate = true;
      } else {
        this.hexMaterial.map = GUIListBox.hexTextures.get(
          GameState.GameKey == GameEngineType.KOTOR ? 'lbl_hex_3' : 'uibit_eqp_itm1'
        );
        this.hexMaterial.needsUpdate = true;
      }
    }
    this.needsUpdate = false;
  }
}
