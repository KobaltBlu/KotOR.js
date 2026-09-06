import type { GFFStruct } from "@/resource/GFFStruct";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import { GUIControlEvent } from "@/gui/GUIControlEvent";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { asExtentInt } from "@/gui/GUICoord";
import { GameState } from "@/GameState";
import type { BufferAttribute } from "three";

/**
 * GUIEditBox — retail edit box.
 *
 * Navigable control with border + editable text.
 * Load: TEXT → BORDER → base. SetExtent: border full → text inner.
 *
 * @file GUIEditBox.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIEditBox extends GUIControl {

  /** Save-name default 0x10; chargen uses 0x12 via setMaxLength. */
  maxLength: number = 16;

  /** Stored value without caret. */
  private editValue: string = '';

  private caretVisible: boolean = true;
  private caretTimer: number = 0;
  private wasFocused: boolean = false;

  private static readonly CARET_PERIOD = 0.5;
  private static readonly CARET_CHAR = '_';

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIEditBox;
    this.setControlType(GUIControlType.EditBox);
    this.editable = true;

    this.editValue = typeof this.text?.text === 'string' ? this.text.text : '';

    this.addEventListener('click', GUIEditBox._focusClickHandler);

    this.onKeyDown = (e: KeyboardEvent) => {
      if(!this.isFocused()){
        return;
      }

      if(e.key === 'Backspace'){
        this.setText(this.editValue.slice(0, -1));
        e.preventDefault?.();
        return;
      }

      // Enter / Escape are handled by the owning menu (e.g. MenuSaveName).
      if(e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab'){
        return;
      }

      if(e.key === ' '){
        this.setText(this.editValue + ' ');
        e.preventDefault?.();
        return;
      }

      // Printable single code point — letters/digits (retail save-name charset).
      if(e.key.length === 1 && /^[0-9A-Za-z]$/.test(e.key)){
        this.setText(this.editValue + e.key);
        e.preventDefault?.();
      }
    };
  }

  setMaxLength(length: number): void {
    this.maxLength = Math.max(0, asExtentInt(length));
    if(this.editValue.length > this.maxLength){
      this.editValue = this.editValue.substr(0, this.maxLength);
      this.refreshDisplay();
    }
  }

  isFocused(): boolean {
    return GameState.MenuManager?.activeGUIElement === this;
  }

  /**
   * Retail SetExtent — border full extent; text uses GetInnerExtent.
   * Border rebuild is handled by super; text geometry already uses getInnerSize.
   */
  resizeControl(): void {
    super.resizeControl();
    this.refreshDisplay();
  }

  _onCreate(): void {
    this.editValue = typeof this.text?.text === 'string' ? this.text.text : '';
    this.refreshDisplay();
  }

  setText(str: any = '', _renderOrder = 5): void {
    if(typeof str != 'string'){
      str = str.toString();
    }
    // Do not trim — preserve spaces while typing (unlike GUIControl.setText).
    const parsed = this.menu ? this.menu.gameStringParse(str) : str;
    this.editValue = parsed.substr(0, this.maxLength);
    // Typing resets caret blink so the caret stays visible while editing.
    if(this.isFocused()){
      this.caretVisible = true;
      this.caretTimer = 0;
    }
    this.refreshDisplay();
  }

  getText(): string {
    return this.editValue;
  }

  getValue(): string {
    return this.editValue;
  }

  update(delta: number): void {
    super.update(delta);

    const focused = this.isFocused();
    if(focused !== this.wasFocused){
      this.wasFocused = focused;
      this.caretVisible = focused;
      this.caretTimer = 0;
      this.refreshDisplay();
      return;
    }

    if(focused){
      this.caretTimer += delta;
      if(this.caretTimer >= GUIEditBox.CARET_PERIOD){
        this.caretTimer -= GUIEditBox.CARET_PERIOD;
        this.caretVisible = !this.caretVisible;
        this.refreshDisplay();
      }
    }
  }

  /**
   * While focused, always lay out with a trailing caret so center-aligned
   * EDITBOX text (savename ALIGNMENT 18) does not shift when the caret blinks.
   * When the caret is off, collapse the trailing glyph quads in place.
   */
  private refreshDisplay(): void {
    const focused = this.isFocused();
    const display = focused
      ? this.editValue + GUIEditBox.CARET_CHAR
      : this.editValue;

    this.text.text = display;

    if(typeof this.text.geometry !== 'object'){
      this.buildText();
    }else{
      this.updateTextGeometry(display);
    }

    if(focused && !this.caretVisible){
      this.hideTrailingCaretGlyph();
    }

    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
  }

  /** Collapse the last character quad so the caret blinks without reflow. */
  private hideTrailingCaretGlyph(): void {
    const pos = this.text.geometry?.getAttribute('position') as BufferAttribute | undefined;
    if(!pos || pos.count < 4){
      return;
    }
    const base = pos.count - 4;
    const x = pos.getX(base);
    const y = pos.getY(base);
    for(let i = 0; i < 4; i++){
      pos.setXY(base + i, x, y);
    }
    pos.needsUpdate = true;
  }

  static _focusClickHandler: (e: GUIControlEvent) => void = (e: GUIControlEvent) => {
    e.stopPropagation();
  };

}
