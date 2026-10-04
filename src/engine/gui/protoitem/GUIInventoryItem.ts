import { GameMenu, GUIButton, GUIControl, GUIProtoItem } from "@engine/gui";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import type { ProtoRowExtent } from "@engine/gui/GUIProtoItem";
import { GameState } from "@engine/runtime/GameState";
import { GameEngineType } from "@core/enums/engine";
import { asExtentInt, truncDiv } from "@engine/gui/GUICoord";
import { commitGuiTransform } from "@engine/gui/guiMatrix";
import { GFFStruct } from "@core/resource/GFFStruct";
import * as THREE from "three";
import { GUIControlAlignment } from "@core/enums/gui/GUIControlAlignment";
import {
  applyProtoItemHexMap,
  applyProtoSelectVisuals,
  enqueueProtoIconLoad,
} from "@engine/gui/protoitem/protoItemHelpers";

/**
 * GUIInventoryItem — shared K1/TSL inventory / equip / container list row.
 *
 * @file GUIInventoryItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIInventoryItem extends GUIProtoItem {

  buttonLabel: GUIButton;
  buttonIcon: GUIButton;

  spriteGroup: THREE.Group;
  hexMaterial: THREE.SpriteMaterial;
  hexSprite: THREE.Sprite;
  iconMaterial: THREE.SpriteMaterial;
  iconSprite: THREE.Sprite;

  private _iconLoadStarted = false;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * base row extent — CreateItemEntry passes
   * width = viewport_width - 2*padding into Initialize, which calls
   * SetExtent with a fixed height:
   * K1: height 0x38 (56).
   * TSL: ftol(GetResolutionTextScalar * 36.0) = 36 at base resolution.
   * The PROTOITEM GFF height is never used for the row.
   */
  getProtoBaseExtent(list: GUIListBox): ProtoRowExtent {
    const vw = typeof list.getViewportWidth === 'function'
      ? list.getViewportWidth()
      : list.extent.width - (list.scrollbar ? list.scrollbar.extent.width : 0);
    const width = Math.max(1, asExtentInt(vw - list.padding * 2));
    const height = GameState.GameKey == GameEngineType.TSL ? 36 : 56;
    return { left: 0, top: 0, width, height };
  }

  buildChrome(){}
  buildText(){}

  createControl(){
    try{
      // Row height from getProtoBaseExtent (K1 56 / TSL 36); no resref hardcodes.
      super.createControl();

      const isContainer = this.menu.gui_resref == 'container' || this.menu.gui_resref == 'container_p';
      const protoWidth = asExtentInt(this.extent.width);
      // Icon must fit the row height (56/36); hardcoded 60 spilled into the next pitch.
      const iconWidth = Math.max(1, asExtentInt(this.extent.height));
      const iconHeight = iconWidth;
      const labelWidth = asExtentInt((protoWidth - iconWidth));

      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.setExtentLeft(5);
      this.buttonLabel.setExtentWidth(labelWidth);
      if(!isContainer){
        this.buttonLabel.setTextAlignment(GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter);
      }else{
        this.buttonLabel.setTextAlignment(GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalCenter);
      }
      this.buttonLabel.setText(this.node.getName());
      this.buttonLabel.autoCalculatePosition = false;
      this.buttonLabel.disableHover = true;
      this.children.push(this.buttonLabel);

      const _buttonWidget = this.buttonLabel.createControl();
      _buttonWidget.position.x = truncDiv(protoWidth - asExtentInt(this.buttonLabel.extent.width), 2);
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      commitGuiTransform(_buttonWidget);
      this.widget.add(_buttonWidget);

      this.buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonIcon.setExtentWidth(iconWidth);
      this.buttonIcon.setExtentHeight(iconHeight);
      this.buttonIcon.setExtentTop(0);
      this.buttonIcon.setExtentLeft(0);
      this.buttonIcon.setTextAlignment(GUIControlAlignment.HorizontalRight | GUIControlAlignment.VerticalBottom);
      this.buttonIcon.setText((this.node?.getStackSize?.() ?? 1) > 1 ? this.node.getStackSize().toString() : '');
      this.buttonIcon.disableBorder();
      this.buttonIcon.disableHighlight();
      this.buttonIcon.hasText = true;
      this.buttonIcon.autoCalculatePosition = false;
      this.buttonIcon.resizeControl();
      this.buttonIcon.disableHover = true;
      this.children.push(this.buttonIcon);

      const _buttonIconWidget = this.buttonIcon.createControl();
      _buttonIconWidget.position.x = -truncDiv(protoWidth - asExtentInt(this.buttonIcon.extent.width), 2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;
      commitGuiTransform(_buttonIconWidget);
      this.widget.add(_buttonIconWidget);

      this.iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.iconMaterial.transparent = true;
      this.iconMaterial.visible = false;
      this.iconSprite = new THREE.Sprite(this.iconMaterial);

      this.spriteGroup = new THREE.Group();
      this.iconSprite.scale.x = asExtentInt(iconWidth * 0.9);
      this.iconSprite.scale.y = asExtentInt(iconHeight * 0.9);
      this.iconSprite.position.z = 2;
      commitGuiTransform(this.iconSprite);

      this.hexMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.hexMaterial.transparent = true;
      this.hexSprite = new THREE.Sprite(this.hexMaterial);
      this.hexSprite.scale.x = iconWidth;
      this.hexSprite.scale.y = iconWidth;
      this.hexSprite.position.z = 1;
      commitGuiTransform(this.hexSprite);

      this.spriteGroup.add(this.hexSprite);
      this.spriteGroup.add(this.iconSprite);

      applyProtoItemHexMap(this.hexMaterial, this.node?.getStackSize?.() ?? 1);

      this.onSelect = () => {
        applyProtoSelectVisuals(this, !!this.selected, {
          buttonLabel: this.buttonLabel,
          buttonIcon: this.buttonIcon,
          hexMaterial: this.hexMaterial,
        });
      };
      this.onSelect.call(this);

      _buttonIconWidget.add(this.spriteGroup);
      this._loadIcon();

      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

  update(delta: number){
    const isDirty = this.needsUpdate;
    super.update(delta);
    if(!this.hexMaterial){
      this.needsUpdate = false;
      return;
    }
    const opacity = this.disableSelection ? 0.5 : 1;
    this.hexMaterial.opacity = this.pulsing
      ? GameState.MenuManager.pulseOpacity * opacity
      : opacity;

    if(isDirty){
      const stackSize = this.node?.getStackSize?.() ?? 1;
      this.buttonIcon?.setText(stackSize > 1 ? stackSize.toString() : '');
      applyProtoItemHexMap(this.hexMaterial, stackSize);
    }
    this.needsUpdate = false;
  }

  protected onTexturesReady(): void {
    this._loadIcon();
  }

  private _loadIcon(): void {
    if(!this.node || !this.iconMaterial){
      return;
    }
    const flag = { value: this._iconLoadStarted };
    enqueueProtoIconLoad(
      this as any,
      this.node.getIcon?.(),
      this.iconMaterial,
      flag,
    );
    this._iconLoadStarted = flag.value;
  }

}
