import { GameMenu, GUIButton, GUIControl, GUIProtoItem } from "@/gui";
import { GameState } from "@/GameState";
import type { GFFStruct } from "@/resource/GFFStruct";
import type { Keymap } from "@/controls";

/** Retail colorYellow (active filter / capture border). */
const COLOR_YELLOW = { r: 0.980392, g: 1, b: 0 };
/** Retail colorStandardBlue (idle binding border). */
const COLOR_BLUE = { r: 0, g: 0.658824, b: 0.980392 };
/** Retail colorPurple (dirty / pending remap border). */
const COLOR_PURPLE = { r: 0.95, g: 0, b: 0.85 };
/** TLK 0xBC10 — unassigned key display. */
const TLK_UNASSIGNED = 0xbc10;

/**
 * GUIKeyMapItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiKeyMapButton: action label + mapped key, capture/dirty colors.
 *
 * @file GUIKeyMapItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIKeyMapItem extends GUIProtoItem {

  declare node: Keymap;
  buttonLabel: GUIButton;
  buttonKey: GUIButton;
  capturing = false;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 71;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();

      const spacing = 2;
      const protoWidth = this.extent.width;
      const protoHeight = this.extent.height - spacing;
      const iconWidth = (protoWidth * .30) - spacing;
      const labelWidth = protoWidth - iconWidth - this.parent.border.inneroffset;

      this.buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonLabel.extent.left = 0;
      this.buttonLabel.extent.width = labelWidth;
      this.buttonLabel.extent.height = protoHeight;
      this.buttonLabel.setText(GameState.TLKManager.GetStringById(this.node.actionstrref)?.Value || '');
      this.buttonLabel.autoCalculatePosition = false;
      if(this.node.descstrref >= 0){
        this.buttonLabel.setTooltipText(GameState.TLKManager.GetStringById(this.node.descstrref)?.Value || '');
      }
      this.children.push(this.buttonLabel);

      const _buttonWidget = this.buttonLabel.createControl();
      _buttonWidget.position.x = -(protoWidth - this.buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      this.buttonKey = new GUIButton(this.menu, this.control, this, this.scale);
      this.buttonKey.extent.left = 0;
      this.buttonKey.extent.width = iconWidth;
      this.buttonKey.extent.height = protoHeight;
      this.buttonKey.setText(this.getDisplayKeyText());
      this.buttonKey.autoCalculatePosition = false;
      if(this.node.descstrref >= 0){
        this.buttonKey.setTooltipText(GameState.TLKManager.GetStringById(this.node.descstrref)?.Value || '');
      }
      this.children.push(this.buttonKey);

      const _buttonKeyWidget = this.buttonKey.createControl();
      _buttonKeyWidget.position.x = (protoWidth - iconWidth) / 2;
      _buttonKeyWidget.position.y = 0;
      _buttonKeyWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonKeyWidget);

      const onClick = (e: any) => {
        e?.stopPropagation?.();
        if(!this.node.remappable) return;
        (this.menu as any).setCaptureItem?.(this);
      };
      this.buttonLabel.addEventListener('click', onClick);
      this.buttonKey.addEventListener('click', onClick);

      this.applyBindingColors();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

  getDisplayKeyText(): string {
    const lang = this.node.editLanguage0;
    if(!lang){
      return GameState.TLKManager.GetStringById(TLK_UNASSIGNED)?.Value || '';
    }
    return (this.node.editCharacter || '').toLocaleUpperCase();
  }

  setKeyText(key: string){
    this.buttonKey?.setText(key ? key.toLocaleUpperCase() : (GameState.TLKManager.GetStringById(TLK_UNASSIGNED)?.Value || ''));
  }

  refreshKeyDisplay(){
    this.setKeyText(this.node.editLanguage0 ? this.node.editCharacter : '');
    this.applyBindingColors();
  }

  setCapturing(capturing: boolean){
    this.capturing = capturing;
    if(!this.buttonKey) return;
    if(capturing){
      this.buttonKey.setBorderColor(COLOR_YELLOW.r, COLOR_YELLOW.g, COLOR_YELLOW.b);
      this.buttonKey.pulsing = true;
    }else{
      this.buttonKey.pulsing = false;
      this.applyBindingColors();
    }
  }

  applyBindingColors(){
    if(!this.buttonLabel || !this.buttonKey) return;
    const c = this.node.editDirty ? COLOR_PURPLE : COLOR_BLUE;
    this.buttonLabel.setBorderColor(c.r, c.g, c.b);
    this.buttonKey.setBorderColor(c.r, c.g, c.b);
    if(!this.node.remappable){
      const locked = this.defaultLockedColor;
      this.buttonLabel.setBorderColor(locked.r, locked.g, locked.b);
      this.buttonLabel.setTextColor(0.5, 0.5, 0.5);
    }
  }

  onSelectStateChanged(){
    super.onSelectStateChanged();
    if(this.selected){
      this.buttonLabel.selected = true;
      this.buttonKey.selected = true;
    }else{
      this.buttonLabel.selected = false;
      this.buttonKey.selected = false;
    }
  }

}
