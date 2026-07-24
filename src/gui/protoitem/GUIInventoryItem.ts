import { GameMenu, GUIButton, GUIControl, GUIProtoItem } from "@/gui";
import { GameEngineType } from "@/enums/engine";
import { GameState } from "@/GameState";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";
import { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import {
  applyProtoItemHexMap,
  applyProtoSelectVisuals,
  enqueueProtoIconLoad,
} from "@/gui/protoitem/protoItemHelpers";

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

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  /** Per-menu row height overrides (PROTOITEM template used when unset). */
  private applyRowHeight(): void {
    const resref = this.menu.gui_resref;
    const isContainer = resref == 'container' || resref == 'container_p';
    const isTslInvEquip =
      GameState.GameKey == GameEngineType.TSL &&
      (resref == 'inventory' || resref == 'inventory_p' || resref == 'equip' || resref == 'equip_p');

    if(isContainer){
      this.setExtentHeight(60);
    }else if(isTslInvEquip){
      this.setExtentHeight(48);
    }else if(resref == 'inventory' || resref == 'equip'){
      this.setExtentHeight(52);
    }
  }

  createControl(){
    try{
      this.applyRowHeight();
      super.createControl();

      const isContainer = this.menu.gui_resref == 'container' || this.menu.gui_resref == 'container_p';
      const protoWidth = asExtentInt(this.extent.width);
      const iconWidth = 60;
      const iconHeight = 60;
      const labelWidth = asExtentInt((protoWidth - iconWidth) + 5);

      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.setExtentLeft(0);
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
      this.widget.add(_buttonIconWidget);

      this.iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.iconMaterial.transparent = true;
      this.iconMaterial.visible = false;
      this.iconSprite = new THREE.Sprite(this.iconMaterial);

      this.spriteGroup = new THREE.Group();
      this.iconSprite.scale.x = asExtentInt(iconWidth * 0.9);
      this.iconSprite.scale.y = asExtentInt(iconHeight * 0.9);
      this.iconSprite.position.z = 2;

      this.hexMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.hexMaterial.transparent = true;
      this.hexSprite = new THREE.Sprite(this.hexMaterial);
      this.hexSprite.scale.x = iconWidth;
      this.hexSprite.scale.y = iconWidth;
      this.hexSprite.position.z = 1;

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
