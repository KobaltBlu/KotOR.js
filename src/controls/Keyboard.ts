import { KeyInput } from "./KeyInput";
import { KeyboardAction } from "../enums/controls/KeyboardAction";
import { KeyboardKeyActions } from "../interface/input/KeyboardKeyActions";

/**
 * Keyboard class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Keyboard.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Keyboard {

  action: KeyboardKeyActions = {
    Escape:          undefined, 
    Backquote:       undefined, 
    Tab:             undefined, 
    CapsLock:        undefined, 
    ShiftLeft:       undefined, 
    ControlLeft:     undefined, 
    AltLeft:         undefined, 
    ShiftRight:      undefined, 
    ControlRight:    undefined, 
    AltRight:        undefined, 
    Backspace:       undefined, 
    Backslash:       undefined, 
    Home:            undefined, 
    End:             undefined, 
    Delete:          undefined, 
    PageDown:        undefined, 
    PageUp:          undefined, 
    UpArrow:         undefined, 
    DownArrow:       undefined, 
    LeftArrow:       undefined, 
    RightArrow:      undefined, 
    MetaLeft:        undefined, 
    Insert:          undefined, 
    Pause:           undefined, 
    NumLock:         undefined, 
    Numpad0:         undefined, 
    Numpad1:         undefined, 
    Numpad2:         undefined, 
    Numpad3:         undefined, 
    Numpad4:         undefined, 
    Numpad5:         undefined, 
    Numpad6:         undefined, 
    Numpad7:         undefined, 
    Numpad8:         undefined, 
    Numpad9:         undefined, 
    NumpadDivide:    undefined, 
    NumpadMultiply:  undefined, 
    NumpadSubtract:  undefined, 
    NumpadAdd:       undefined, 
    NumpadEnter:     undefined, 
    NumpadDecimal:   undefined, 
    F1:              undefined, 
    F2:              undefined, 
    F3:              undefined, 
    F4:              undefined, 
    F5:              undefined, 
    F6:              undefined, 
    F7:              undefined, 
    F8:              undefined, 
    F9:              undefined, 
    F10:             undefined, 
    F11:             undefined, 
    F12:             undefined, 
    Digit1:          undefined, 
    Digit2:          undefined, 
    Digit3:          undefined, 
    Digit4:          undefined, 
    Digit5:          undefined, 
    Digit6:          undefined, 
    Digit7:          undefined, 
    Digit8:          undefined, 
    Digit9:          undefined, 
    Digit0:          undefined, 
    Minus:           undefined, 
    Equal:           undefined, 
    KeyA:            undefined, 
    KeyB:            undefined, 
    KeyC:            undefined, 
    KeyD:            undefined, 
    KeyE:            undefined, 
    KeyF:            undefined, 
    KeyG:            undefined, 
    KeyH:            undefined, 
    KeyI:            undefined, 
    KeyJ:            undefined, 
    KeyK:            undefined, 
    KeyL:            undefined, 
    KeyM:            undefined, 
    KeyN:            undefined, 
    KeyO:            undefined, 
    KeyP:            undefined, 
    KeyQ:            undefined, 
    KeyR:            undefined, 
    KeyS:            undefined, 
    KeyT:            undefined, 
    KeyU:            undefined, 
    KeyV:            undefined, 
    KeyW:            undefined, 
    KeyX:            undefined, 
    KeyY:            undefined, 
    KeyZ:            undefined, 
    BracketLeft:     undefined, 
    BracketRight:    undefined, 
    Semicolon:       undefined, 
    Quote:           undefined, 
    Comma:           undefined, 
    Period:          undefined, 
    Slash:           undefined, 
    Enter:           undefined, 
    Space:           undefined, 
  }

  constructor(){
    this.init();
  }

  init(){
    for (let key in this.action) {
      (this.action as any)[key] = new KeyInput(key);
    }
  }

  onKeyDown(e: KeyboardEvent) {
    const code = e.code as KeyboardAction;

    const input = this.action[code];
    if(code == KeyboardAction.Tab){
      e.preventDefault();
    }

    if(input){
      input.keyDown();
    }
  }

  onKeyUp(e: KeyboardEvent){
    const code = e.code as KeyboardAction;

    const input = this.action[code];
    if(input){
      input.keyUp();
    }
  }

  onFrameBegin(delta: number = 0){

  }

  onFrameEnd(delta: number = 0){
    //Set all pressed keys to false so they can only be triggered on this frame 
    for (let key in this.action) {
      (this.action as any)[key].pressed = false;
    }
  }

}