import { KeyInput } from "./KeyInput";
import { KeyboardAction } from "../enums/controls/KeyboardAction";
import { GameState } from "../GameState";
import { GUIControl } from "../gui";
import { MenuManager } from "../managers";

interface KeyboardKeyActions {
  Escape:          KeyInput; 
  Backquote:       KeyInput; 
  Tab:             KeyInput; 
  CapsLock:        KeyInput; 
  ShiftLeft:       KeyInput; 
  ControlLeft:     KeyInput; 
  AltLeft:         KeyInput; 
  ShiftRight:      KeyInput; 
  ControlRight:    KeyInput; 
  AltRight:        KeyInput; 
  Backspace:       KeyInput; 
  Backslash:       KeyInput; 
  Home:            KeyInput; 
  End:             KeyInput; 
  Delete:          KeyInput; 
  PageDown:        KeyInput; 
  PageUp:          KeyInput; 
  UpArrow:         KeyInput; 
  DownArrow:       KeyInput; 
  LeftArrow:       KeyInput; 
  RightArrow:      KeyInput; 
  MetaLeft:        KeyInput; 
  Insert:          KeyInput; 
  Pause:           KeyInput; 
  NumLock:         KeyInput; 
  Numpad0:         KeyInput; 
  Numpad1:         KeyInput; 
  Numpad2:         KeyInput; 
  Numpad3:         KeyInput; 
  Numpad4:         KeyInput; 
  Numpad5:         KeyInput; 
  Numpad6:         KeyInput; 
  Numpad7:         KeyInput; 
  Numpad8:         KeyInput; 
  Numpad9:         KeyInput; 
  NumpadDivide:    KeyInput; 
  NumpadMultiply:  KeyInput; 
  NumpadSubtract:  KeyInput; 
  NumpadAdd:       KeyInput; 
  NumpadEnter:     KeyInput; 
  NumpadDecimal:   KeyInput; 
  F1:              KeyInput; 
  F2:              KeyInput; 
  F3:              KeyInput; 
  F4:              KeyInput; 
  F5:              KeyInput; 
  F6:              KeyInput; 
  F7:              KeyInput; 
  F8:              KeyInput; 
  F9:              KeyInput; 
  F10:             KeyInput; 
  F11:             KeyInput; 
  F12:             KeyInput; 
  Digit1:          KeyInput; 
  Digit2:          KeyInput; 
  Digit3:          KeyInput; 
  Digit4:          KeyInput; 
  Digit5:          KeyInput; 
  Digit6:          KeyInput; 
  Digit7:          KeyInput; 
  Digit8:          KeyInput; 
  Digit9:          KeyInput; 
  Digit0:          KeyInput; 
  Minus:           KeyInput; 
  Equal:           KeyInput; 
  KeyA:            KeyInput; 
  KeyB:            KeyInput; 
  KeyC:            KeyInput; 
  KeyD:            KeyInput; 
  KeyE:            KeyInput; 
  KeyF:            KeyInput; 
  KeyG:            KeyInput; 
  KeyH:            KeyInput; 
  KeyI:            KeyInput; 
  KeyJ:            KeyInput; 
  KeyK:            KeyInput; 
  KeyL:            KeyInput; 
  KeyM:            KeyInput; 
  KeyN:            KeyInput; 
  KeyO:            KeyInput; 
  KeyP:            KeyInput; 
  KeyQ:            KeyInput; 
  KeyR:            KeyInput; 
  KeyS:            KeyInput; 
  KeyT:            KeyInput; 
  KeyU:            KeyInput; 
  KeyV:            KeyInput; 
  KeyW:            KeyInput; 
  KeyX:            KeyInput; 
  KeyY:            KeyInput; 
  KeyZ:            KeyInput; 
  BracketLeft:     KeyInput; 
  BracketRight:    KeyInput; 
  Semicolon:       KeyInput; 
  Quote:           KeyInput; 
  Comma:           KeyInput; 
  Period:          KeyInput; 
  Slash:           KeyInput; 
  Enter:           KeyInput; 
  Space:           KeyInput; 
}

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

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // console.log('keydown', e);
      const code = e.code as KeyboardAction;

      if(code == KeyboardAction.Tab){
        e.preventDefault();
      }

      const input = this.action[code];
      if(input){
        input.keyDown();
      }

      if(MenuManager.activeGUIElement instanceof GUIControl){
        if(typeof MenuManager.activeGUIElement.onKeyDown === 'function'){
          MenuManager.activeGUIElement.onKeyDown(e);
        }
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      // console.log('keyup', e);

      const code = e.code as KeyboardAction;
      const input = this.action[code];
      if(input){
        input.keyUp();
      }

      if(MenuManager.activeGUIElement instanceof GUIControl){
        if(typeof MenuManager.activeGUIElement.onKeyUp === 'function'){
          MenuManager.activeGUIElement.onKeyUp(e);
        }
      }
    });

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