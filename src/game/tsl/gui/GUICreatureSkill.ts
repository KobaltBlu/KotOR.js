import { GameMenu, GUIButton, GUIControl, GUIProtoItem } from "@/gui";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { RetailRowExtent } from "@/gui/GUIProtoItem";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";
import { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import type { TalentSkill } from "@/talents/TalentSkill";
import type { TalentFeat } from "@/talents/TalentFeat";
import {
  applyProtoItemHexMap,
  applyProtoSelectVisuals,
  enqueueProtoIconLoad,
} from "@/gui/protoitem/protoItemHelpers";

/** Duck type for InGameSkillEntry::SetSkill payloads (skill / feat / power). */
export type SkillEntryNode = {
  getName: () => string;
  getIcon: () => string;
};

/**
 * GUICreatureSkill class.
 *
 * Retail CSWGuiInGameSkillEntry — icon + name row used by abilities skills list
 * and CSWGuiSkillInfoBox (granted feats popup).
 *
 * @file GUICreatureSkill.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUICreatureSkill extends GUIProtoItem {

  declare node: TalentSkill | TalentFeat | SkillEntryNode;

  buttonLabel: GUIButton;
  buttonIcon: GUIButton;
  hexMaterial: THREE.SpriteMaterial;
  iconMaterial: THREE.SpriteMaterial;

  private _iconLoadStarted = false;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * Retail CSWGuiInGameSkillEntry::Initialize — SetExtent width = viewport - 2*padding,
   * height 0x2a (42). K1 @ 006ac930; TSL @ 005958f0 ftol(scalar * 42.0).
   */
  getRetailBaseExtent(list: GUIListBox): RetailRowExtent {
    const vw = typeof list.getViewportWidth === 'function'
      ? list.getViewportWidth()
      : list.extent.width - (list.scrollbar ? list.scrollbar.extent.width : 0);
    const width = Math.max(1, asExtentInt(vw - list.padding * 2));
    return { left: 0, top: 0, width, height: 42 };
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  private resolveName(): string {
    const node = this.node as SkillEntryNode;
    if(typeof node?.getName === 'function'){
      return node.getName() || '';
    }
    return '';
  }

  private resolveIcon(): string {
    const node = this.node as SkillEntryNode;
    if(typeof node?.getIcon === 'function'){
      return node.getIcon() || 'inone';
    }
    return 'inone';
  }

  createControl(){
    try{
      super.createControl();

      const spacing = 2;
      const protoWidth = asExtentInt(this.extent.width);
      const protoHeight = asExtentInt(this.extent.height) - spacing;
      const iconWidth = protoHeight;
      const iconHeight = protoHeight;
      const labelWidth = asExtentInt(protoWidth - iconWidth - asExtentInt(this.parent.border.inneroffset));

      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.setExtentLeft(0);
      this.buttonLabel.setExtentWidth(labelWidth);
      this.buttonLabel.setExtentHeight(protoHeight);
      this.buttonLabel.setText(this.resolveName());
      this.buttonLabel.autoCalculatePosition = false;
      this.children.push(this.buttonLabel);

      const _buttonWidget = this.buttonLabel.createControl();
      _buttonWidget.position.x = truncDiv(protoWidth - asExtentInt(this.buttonLabel.extent.width), 2);
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      this.buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonIcon.setText('');
      this.buttonIcon.disableTextAlignment();
      this.buttonIcon.setExtentWidth(iconWidth);
      this.buttonIcon.setExtentHeight(iconHeight);
      this.buttonIcon.setExtentTop(0);
      this.buttonIcon.setExtentLeft(0);
      this.buttonIcon.disableBorder();
      this.buttonIcon.disableHighlight();
      this.buttonIcon.hasText = true;
      this.buttonIcon.autoCalculatePosition = false;
      this.children.push(this.buttonIcon);

      const _buttonIconWidget = this.buttonIcon.createControl();
      _buttonIconWidget.position.x = -truncDiv(protoWidth - asExtentInt(this.buttonIcon.extent.width), 2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonIconWidget);

      this.iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.iconMaterial.transparent = true;
      const iconSprite = new THREE.Sprite(this.iconMaterial);
      iconSprite.scale.x = asExtentInt(iconWidth * 0.5);
      iconSprite.scale.y = asExtentInt(iconHeight * 0.5);
      iconSprite.position.z = 2;

      this.hexMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      this.hexMaterial.transparent = true;
      const hexSprite = new THREE.Sprite(this.hexMaterial);
      hexSprite.scale.x = iconWidth;
      hexSprite.scale.y = iconWidth;
      hexSprite.position.z = 1;

      applyProtoItemHexMap(this.hexMaterial, 1);

      const spriteGroup = new THREE.Group();
      spriteGroup.add(hexSprite);
      spriteGroup.add(iconSprite);
      _buttonIconWidget.add(spriteGroup);

      this.onSelect = () => {
        applyProtoSelectVisuals(this, !!this.selected, {
          buttonLabel: this.buttonLabel,
          buttonIcon: this.buttonIcon,
          hexMaterial: this.hexMaterial,
        });
      };
      this.onSelect.call(this);

      this._loadIcon();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
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
      this.resolveIcon(),
      this.iconMaterial,
      flag,
    );
    this._iconLoadStarted = flag.value;
  }

}
