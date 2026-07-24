import type { GFFStruct } from "@/resource/GFFStruct";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import { GUIControlEvent } from "@/gui/GUIControlEvent";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { asExtentInt } from "@/gui/GUICoord";
import { GameState } from "@/GameState";

/**
 * GUIEditBox — retail CSWGuiEditbox (@ 0041c6b0).
 *
 * Navigable control with border + editable text (CSWGuiEditText @ 004173d0).
 * Load: TEXT → BORDER → base (0041c7d0). SetExtent: border full → text inner (00418450).
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

      switch(e.which){
        case 8: // Backspace
          this.setText(this.editValue.slice(0, -1));
          e.preventDefault?.();
        break;
        case 32: // Spacebar
          this.setText(this.editValue + ' ');
          e.preventDefault?.();
        break;
        default:
          if(e.which >= 48 && e.which <= 90){
            const ch = e.shiftKey
              ? String.fromCharCode(e.which).toLocaleUpperCase()
              : String.fromCharCode(e.which).toLocaleLowerCase();
            this.setText(this.editValue + ch);
            e.preventDefault?.();
          }
        break;
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
   * Retail SetExtent @ 00418450 — border full extent; text uses GetInnerExtent.
   * Border rebuild is handled by super; text geometry already uses getInnerSize().
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

  /** Display value + optional caret; geometry uses inner extent (GetInnerExtent). */
  private refreshDisplay(): void {
    const display = (this.isFocused() && this.caretVisible)
      ? this.editValue + '_'
      : this.editValue;

    const oldText = this.text.text;
    this.text.text = display;

    if(typeof this.text.geometry !== 'object'){
      this.buildText();
    }

    if(oldText != this.text.text && typeof this.text.geometry === 'object'){
      this.updateTextGeometry(this.text.text);
    }

    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
  }

  static _focusClickHandler: (e: GUIControlEvent) => void = (e: GUIControlEvent) => {
    e.stopPropagation();
  };

}
