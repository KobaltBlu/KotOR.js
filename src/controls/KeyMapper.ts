
import { EngineMode } from "../enums/engine/EngineMode";
import { AnalogInput } from "./AnalogInput";
import { GamePad } from "./GamePad";
import { KeyInput } from "./KeyInput";
import { Keyboard } from "./Keyboard";
import { KeyMapAction } from "../enums/controls/KeyMapAction";
import { TwoDAManager } from "../managers/TwoDAManager";
import type { INIConfig } from "../INIConfig";

type KeymapProcessorCallback = (map: Keymap, delta: number) => void;

/**
 * Keymap class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Keymap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Keymap {

  disabled:     boolean = false;
  actionstrref: number  = -1;
  descstrref:   number  = -1;
  language0:    number  =  0; //keycode?
  character:    string  = '';
  page:         number  =  0;
  sortpos:      number  = -1;
  name:         string  = '';
  remappable:   boolean = false;
  forcedisplay: boolean = false;

  icpc:       boolean = false;
  icminigame: boolean = false;
  icpcgui:    boolean = false;
  icdialog:   boolean = false;
  icfreelook: boolean = false;
  icmovie:    boolean = false;

  repeatwait: number = -1;
  repeatrate: number = -1;
  scale:      number =  0;
  scalemag:   number =  0;
  scaleexp:   number =  0;

  keyboardInput: KeyInput;
  gamepadInput: KeyInput|AnalogInput;
  label: string;

  tokenRegEx: RegExp;

  processCallback?: KeymapProcessorCallback;

  setProcessor(callback: KeymapProcessorCallback){
    this.processCallback = callback;
  }

  static From2DA(row: any = {}){
    const keymap = new Keymap();

    if(typeof row.disabled !== 'undefined')     keymap.disabled     = row.disabled      == '****' ? false : parseInt(row.disabled) ? true : false;
    if(typeof row.actionstrref !== 'undefined') keymap.actionstrref = row.actionstrref  == '****' ? -1    : parseInt(row.actionstrref);
    if(typeof row.descstrref !== 'undefined')   keymap.descstrref   = row.descstrref    == '****' ? -1    : parseInt(row.descstrref);
    if(typeof row.language0 !== 'undefined')    keymap.language0    = row.language0     == '****' ? -1    : parseInt(row.language0);
    if(typeof row.character !== 'undefined')    keymap.character    = row.label         == '****' ? ''    : row.character;
    if(typeof row.page !== 'undefined')         keymap.page         = row.label         == '****' ? 0     : parseInt(row.page);
    if(typeof row.sortpos !== 'undefined')      keymap.sortpos      = row.label         == '****' ? -1    : parseInt(row.sortpos);
    if(typeof row.name !== 'undefined')         keymap.name         = row.label         == '****' ? ''    : row.name;
    if(typeof row.remappable !== 'undefined')   keymap.remappable   = row.remappable    == '****' ? false : parseInt(row.remappable) ? true : false;
    if(typeof row.forcedisplay !== 'undefined') keymap.forcedisplay = row.forcedisplay  == '****' ? false : parseInt(row.forcedisplay) ? true : false;

    if(typeof row.icpc !== 'undefined')         keymap.icpc         = row.icpc          == '****' ? false : parseInt(row.icpc) ? true : false;
    if(typeof row.icminigame !== 'undefined')   keymap.icminigame   = row.icminigame    == '****' ? false : parseInt(row.icminigame) ? true : false;
    if(typeof row.icpcgui !== 'undefined')      keymap.icpcgui      = row.icpcgui       == '****' ? false : parseInt(row.icpcgui) ? true : false;
    if(typeof row.icdialog !== 'undefined')     keymap.icdialog     = row.icdialog      == '****' ? false : parseInt(row.icdialog) ? true : false;
    if(typeof row.icfreelook !== 'undefined')   keymap.icfreelook   = row.icfreelook    == '****' ? false : parseInt(row.icfreelook) ? true : false;
    if(typeof row.icmovie !== 'undefined')      keymap.icmovie      = row.icmovie       == '****' ? false : parseInt(row.icmovie) ? true : false;

    if(typeof row.repeatwait !== 'undefined')   keymap.repeatwait   = row.repeatwait    == '****' ? -1    : parseInt(row.repeatwait);
    if(typeof row.repeatrate !== 'undefined')   keymap.repeatrate   = row.repeatrate    == '****' ? -1    : parseInt(row.repeatrate);
    if(typeof row.scale !== 'undefined')        keymap.scale        = row.scale         == '****' ?  0    : parseInt(row.scale);
    if(typeof row.scalemag !== 'undefined')     keymap.scalemag     = row.scalemag      == '****' ? -1    : parseInt(row.scalemag);
    if(typeof row.scaleexp !== 'undefined')     keymap.scaleexp     = row.scaleexp      == '****' ? -1    : parseInt(row.scaleexp);
    if(typeof row.__rowlabel !== 'undefined')   keymap.label        = row.__rowlabel;

    keymap.tokenRegEx = new RegExp(`<${keymap.name}>`, 'gm');

    return keymap;
  }
}

interface KeyMapperActions {
  action200: Keymap;
  action201: Keymap;
  action202: Keymap;
  action203: Keymap;
  action204: Keymap;
  action205: Keymap;
  action206: Keymap;
  action207: Keymap;
  action208: Keymap;
  action209: Keymap;
  action210: Keymap;
  action211: Keymap;
  action212: Keymap;
  action213: Keymap;
  action214: Keymap;
  action215: Keymap;
  action216: Keymap;
  action217: Keymap;
  action218: Keymap;
  action219: Keymap;
  action220: Keymap;
  action221: Keymap;
  action222: Keymap;
  action223: Keymap;
  action224: Keymap;
  action225: Keymap;
  action226: Keymap;
  action227: Keymap;
  action228: Keymap;
  action229: Keymap;
  action230: Keymap;
  action231: Keymap;
  action232: Keymap;
  action233: Keymap;
  action234: Keymap;
  action235: Keymap;
  action236: Keymap;
  action237: Keymap;
  action238: Keymap;
  action239: Keymap;
  action240: Keymap;
  action241: Keymap;
  action242: Keymap;
  action243: Keymap;
  action244: Keymap;
  action245: Keymap;
  action246: Keymap;
  action247: Keymap;
  action248: Keymap;
  action249: Keymap;
  action250: Keymap;
  action251: Keymap;
  action252: Keymap;
  action253: Keymap;
  action254: Keymap;
  action255: Keymap;
  action256: Keymap;
  action257: Keymap;
  action258: Keymap;
  action259: Keymap;
  action260: Keymap;
  action261: Keymap;
  action262: Keymap;
  action263: Keymap;
  action264: Keymap;
  action265: Keymap;
  action268: Keymap;

  action280a: Keymap;
  action280b: Keymap;
  action281a: Keymap;
  action281b: Keymap;
  action282a: Keymap;
  action282b: Keymap;
  action283a: Keymap;
  action283b: Keymap;
  action284a: Keymap;
  action284b: Keymap;
  action285a: Keymap;
  action285b: Keymap;
  action286a: Keymap;
  action286b: Keymap;

  action900: Keymap;
  action901: Keymap;

  action1001: Keymap;
  action1002: Keymap;
  action1003: Keymap;
  action1004: Keymap;
  action1005: Keymap;
}

export class KeyMapper {

  static Actions: KeyMapperActions = {
    action200: undefined,
    action201: undefined,
    action202: undefined,
    action203: undefined,
    action204: undefined,
    action205: undefined,
    action206: undefined,
    action207: undefined,
    action208: undefined,
    action209: undefined,
    action210: undefined,
    action211: undefined,
    action212: undefined,
    action213: undefined,
    action214: undefined,
    action215: undefined,
    action216: undefined,
    action217: undefined,
    action218: undefined,
    action219: undefined,
    action220: undefined,
    action221: undefined,
    action222: undefined,
    action223: undefined,
    action224: undefined,
    action225: undefined,
    action226: undefined,
    action227: undefined,
    action228: undefined,
    action229: undefined,
    action230: undefined,
    action231: undefined,
    action232: undefined,
    action233: undefined,
    action234: undefined,
    action235: undefined,
    action236: undefined,
    action237: undefined,
    action238: undefined,
    action239: undefined,
    action240: undefined,
    action241: undefined,
    action242: undefined,
    action243: undefined,
    action244: undefined,
    action245: undefined,
    action246: undefined,
    action247: undefined,
    action248: undefined,
    action249: undefined,
    action250: undefined,
    action251: undefined,
    action252: undefined,
    action253: undefined,
    action254: undefined,
    action255: undefined,
    action256: undefined,
    action257: undefined,
    action258: undefined,
    action259: undefined,
    action260: undefined,
    action261: undefined,
    action262: undefined,
    action263: undefined,
    action264: undefined,
    action265: undefined,
    action268: undefined,

    action280a: undefined,
    action280b: undefined,
    action281a: undefined,
    action281b: undefined,
    action282a: undefined,
    action282b: undefined,
    action283a: undefined,
    action283b: undefined,
    action284a: undefined,
    action284b: undefined,
    action285a: undefined,
    action285b: undefined,
    action286a: undefined,
    action286b: undefined,

    action900: undefined,
    action901: undefined,

    action1001: undefined,
    action1002: undefined,
    action1003: undefined,
    action1004: undefined,
    action1005: undefined,
  };

  static ACTIONS_ALL: Keymap[] = [];
  static ACTIONS_INGAME: Keymap[] = [];
  static ACTIONS_MINIGAME: Keymap[] = [];
  static ACTIONS_GUI: Keymap[] = [];
  static ACTIONS_DIALOG: Keymap[] = [];
  static ACTIONS_FREELOOK: Keymap[] = [];
  static ACTIONS_MOVIE: Keymap[] = [];

  static Init(){
    const keymap_table = TwoDAManager.datatables.get('keymap');
    if(keymap_table){
      KeyMapper.ACTIONS_INGAME = [];
      KeyMapper.ACTIONS_MINIGAME = [];
      KeyMapper.ACTIONS_GUI = [];
      KeyMapper.ACTIONS_DIALOG = [];
      KeyMapper.ACTIONS_FREELOOK = [];
      KeyMapper.ACTIONS_MOVIE = [];
      const rows = Object.values(keymap_table.rows);
      for(let i = 0; i < rows.length; i++){
        const row: any = rows[i];
        const map = Keymap.From2DA(row);
        (KeyMapper.Actions as any)[row.__rowlabel.toLowerCase()] = map;
                            KeyMapper.ACTIONS_ALL.push(map);
        if(map.icpc)        KeyMapper.ACTIONS_INGAME.push(map);
        if(map.icminigame)  KeyMapper.ACTIONS_MINIGAME.push(map);
        if(map.icpcgui)     KeyMapper.ACTIONS_GUI.push(map);
        if(map.icdialog)    KeyMapper.ACTIONS_DIALOG.push(map);
        if(map.icfreelook)  KeyMapper.ACTIONS_FREELOOK.push(map);
        if(map.icmovie)     KeyMapper.ACTIONS_MOVIE.push(map);
      }

      if(typeof KeyMapper.Actions[KeyMapAction.WALKMODIFY] === 'undefined'){
        this.CreateCustomAction(KeyMapAction.WALKMODIFY, {
          name: 'WALKMODIFY',
          remappable: 0,
          icpc: 1,
        });
      }

      //Custom KeyMappings
      this.CreateCustomAction(KeyMapAction.DialogAbort, {
        name: 'DialogAbort',
        remappable: 0,
        icdialog: 1,
      });

      this.CreateCustomAction(KeyMapAction.DialogSkip, {
        name: 'DialogSkip',
        remappable: 0,
        icdialog: 1,
      });

      this.CreateCustomAction(KeyMapAction.FlyUp, {
        name: 'FlyUp',
        remappable: 0,
        icpc: 1,
      });

      this.CreateCustomAction(KeyMapAction.FlyDown, {
        name: 'FlyDown',
        remappable: 0,
        icpc: 1,
      });

      this.CreateCustomAction(KeyMapAction.ResolutionScaleUp, {
        name: 'ResolutionScaleUp',
        remappable: 0,
        icpc: 1,
      });

      this.CreateCustomAction(KeyMapAction.ResolutionScaleDown, {
        name: 'ResolutionScaleDown',
        remappable: 0,
        icpc: 1,
      });

      this.CreateCustomAction(KeyMapAction.ResolutionScaleReset, {
        name: 'ResolutionScaleReset',
        remappable: 0,
        icpc: 1,
      });
    }
  }

  static CreateCustomAction(action: KeyMapAction, props: any = {}){
    KeyMapper.Actions[action] = Keymap.From2DA(props);
    if(KeyMapper.Actions[action].icpc)        KeyMapper.ACTIONS_INGAME.push(KeyMapper.Actions[action]);
    if(KeyMapper.Actions[action].icminigame)  KeyMapper.ACTIONS_MINIGAME.push(KeyMapper.Actions[action]);
    if(KeyMapper.Actions[action].icpcgui)     KeyMapper.ACTIONS_GUI.push(KeyMapper.Actions[action]);
    if(KeyMapper.Actions[action].icdialog)    KeyMapper.ACTIONS_DIALOG.push(KeyMapper.Actions[action]);
    if(KeyMapper.Actions[action].icfreelook)  KeyMapper.ACTIONS_FREELOOK.push(KeyMapper.Actions[action]);
    if(KeyMapper.Actions[action].icmovie)     KeyMapper.ACTIONS_MOVIE.push(KeyMapper.Actions[action]);
  }

  static ProcessMappings(mode: EngineMode, delta: number = 0){
    switch(mode){
      case EngineMode.INGAME:
        KeyMapper.ACTIONS_INGAME.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
      case EngineMode.MINIGAME:
        KeyMapper.ACTIONS_MINIGAME.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
      case EngineMode.GUI:
        KeyMapper.ACTIONS_GUI.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
      case EngineMode.DIALOG:
        KeyMapper.ACTIONS_DIALOG.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
      case EngineMode.FREELOOK:
        KeyMapper.ACTIONS_FREELOOK.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
      case EngineMode.MOVIE:
        KeyMapper.ACTIONS_MOVIE.map( keymap => {
          if(typeof keymap.processCallback === 'function'){
            keymap.processCallback(keymap, delta);
          }
        });
      break;
    }
  }

  static BindKeyboard(keyboard: Keyboard, iniConfig: INIConfig){
    const remappedKeys = Object.fromEntries(
      Object.entries( (iniConfig.getProperty('Keymapping') || {})).map(([k, v]) => [k.toLowerCase(), v])
    );
    for(let i = 0; i < KeyMapper.ACTIONS_ALL.length; i++){
      const keyMap = KeyMapper.ACTIONS_ALL[i];

      if(typeof remappedKeys[keyMap.label] === 'number'){
        keyMap.language0 = remappedKeys[keyMap.label] as number;
      }

      const action: KeyInput = (keyboard.action as any)[language0ToKeyCode(keyMap.language0)];
      if(action){
        keyMap.keyboardInput = action;
      }
    }

    //Movement
    /*KeyMapper.Actions[KeyMapAction.ActionUp].keyboardInput = keyboard.action.KeyW;
    KeyMapper.Actions[KeyMapAction.ActionDown].keyboardInput = keyboard.action.KeyS;
    KeyMapper.Actions[KeyMapAction.ActionLeft].keyboardInput = keyboard.action.KeyZ;
    KeyMapper.Actions[KeyMapAction.ActionRight].keyboardInput = keyboard.action.KeyC;
    KeyMapper.Actions[KeyMapAction.CameraRotateLeft].keyboardInput = keyboard.action.KeyA;
    KeyMapper.Actions[KeyMapAction.CameraRotateRight].keyboardInput = keyboard.action.KeyD;
    KeyMapper.Actions[KeyMapAction.Freelook].keyboardInput = keyboard.action.CapsLock;
    KeyMapper.Actions[KeyMapAction.LeftLookabout].keyboardInput = keyboard.action.ControlLeft;
    KeyMapper.Actions[KeyMapAction.GUI].keyboardInput = keyboard.action.Escape;
    KeyMapper.Actions[KeyMapAction.SelectPrev].keyboardInput = keyboard.action.KeyQ;
    KeyMapper.Actions[KeyMapAction.SelectNext].keyboardInput = keyboard.action.KeyE;
    KeyMapper.Actions[KeyMapAction.WALKMODIFY].keyboardInput = keyboard.action.KeyB;*/

    //Game
    /*KeyMapper.Actions[KeyMapAction.Pause].keyboardInput = keyboard.action.Pause;
    KeyMapper.Actions[KeyMapAction.Pause1].keyboardInput = keyboard.action.Space;
    KeyMapper.Actions[KeyMapAction.DefaultAction].keyboardInput = keyboard.action.KeyR;

    KeyMapper.Actions[KeyMapAction.TargetLeftAct].keyboardInput = keyboard.action.Digit1;
    KeyMapper.Actions[KeyMapAction.TargetMiddleAct].keyboardInput = keyboard.action.Digit2;
    KeyMapper.Actions[KeyMapAction.TargetRightAct].keyboardInput = keyboard.action.Digit3;

    KeyMapper.Actions[KeyMapAction.PersonalPowerAct].keyboardInput = keyboard.action.Digit4;
    KeyMapper.Actions[KeyMapAction.PersonalMedicalAct].keyboardInput = keyboard.action.Digit5;
    KeyMapper.Actions[KeyMapAction.PersonalOtherAct].keyboardInput = keyboard.action.Digit6;
    KeyMapper.Actions[KeyMapAction.PersonalMinesAct].keyboardInput = keyboard.action.Digit7;

    KeyMapper.Actions[KeyMapAction.Messages].keyboardInput = keyboard.action.KeyJ;
    KeyMapper.Actions[KeyMapAction.Map].keyboardInput = keyboard.action.KeyM;
    KeyMapper.Actions[KeyMapAction.Quests].keyboardInput = keyboard.action.KeyL;
    KeyMapper.Actions[KeyMapAction.SkillsAndFeats].keyboardInput = keyboard.action.KeyK;
    KeyMapper.Actions[KeyMapAction.Options].keyboardInput = keyboard.action.KeyO;
    KeyMapper.Actions[KeyMapAction.Character].keyboardInput = keyboard.action.KeyP;
    KeyMapper.Actions[KeyMapAction.Inventory].keyboardInput = keyboard.action.KeyI;
    KeyMapper.Actions[KeyMapAction.Equip].keyboardInput = keyboard.action.KeyU;

    KeyMapper.Actions[KeyMapAction.CancleCombat].keyboardInput = keyboard.action.KeyF;
    KeyMapper.Actions[KeyMapAction.ChangeChar].keyboardInput = keyboard.action.Tab;
    KeyMapper.Actions[KeyMapAction.PartyActive].keyboardInput = keyboard.action.KeyV;
    KeyMapper.Actions[KeyMapAction.STEALTH].keyboardInput = keyboard.action.KeyG;
    KeyMapper.Actions[KeyMapAction.Flourish].keyboardInput = keyboard.action.KeyX;
    KeyMapper.Actions[KeyMapAction.ToolTips].keyboardInput = keyboard.action.KeyT;

    KeyMapper.Actions[KeyMapAction.Quicksave].keyboardInput = keyboard.action.F4;
    KeyMapper.Actions[KeyMapAction.QUICKLOAD].keyboardInput = keyboard.action.F5;

    KeyMapper.Actions[KeyMapAction.PrevMenu].keyboardInput = keyboard.action.KeyQ;
    KeyMapper.Actions[KeyMapAction.NextMenu].keyboardInput = keyboard.action.KeyE;
    KeyMapper.Actions[KeyMapAction.ClearOneAction].keyboardInput = keyboard.action.KeyY;*/

    //MiniGame
    /*KeyMapper.Actions[KeyMapAction.MGActionUp].keyboardInput = keyboard.action.KeyW;
    KeyMapper.Actions[KeyMapAction.MGActionDown].keyboardInput = keyboard.action.KeyS;
    KeyMapper.Actions[KeyMapAction.MGActionLeft].keyboardInput = keyboard.action.KeyA;
    KeyMapper.Actions[KeyMapAction.MGActionRight].keyboardInput = keyboard.action.KeyD;
    KeyMapper.Actions[KeyMapAction.MGshoot].keyboardInput = keyboard.action.Space;
    KeyMapper.Actions[KeyMapAction.PauseMinigame].keyboardInput = keyboard.action.Escape;*/

    //Dialog
    /*KeyMapper.Actions[KeyMapAction.Dialog1].keyboardInput = keyboard.action.Digit1;
    KeyMapper.Actions[KeyMapAction.Dialog2].keyboardInput = keyboard.action.Digit2;
    KeyMapper.Actions[KeyMapAction.Dialog3].keyboardInput = keyboard.action.Digit3;
    KeyMapper.Actions[KeyMapAction.Dialog4].keyboardInput = keyboard.action.Digit4;
    KeyMapper.Actions[KeyMapAction.Dialog5].keyboardInput = keyboard.action.Digit5;
    KeyMapper.Actions[KeyMapAction.Dialog6].keyboardInput = keyboard.action.Digit6;
    KeyMapper.Actions[KeyMapAction.Dialog7].keyboardInput = keyboard.action.Digit7;
    KeyMapper.Actions[KeyMapAction.Dialog8].keyboardInput = keyboard.action.Digit8;
    KeyMapper.Actions[KeyMapAction.Dialog9].keyboardInput = keyboard.action.Digit9;
    KeyMapper.Actions[KeyMapAction.DialogSkip].keyboardInput = keyboard.action.Space;*/

    //Custom Mappings
    KeyMapper.Actions[KeyMapAction.FlyUp].keyboardInput = keyboard.action.NumpadAdd;
    KeyMapper.Actions[KeyMapAction.FlyDown].keyboardInput = keyboard.action.NumpadSubtract;
    KeyMapper.Actions[KeyMapAction.ResolutionScaleUp].keyboardInput = keyboard.action.NumpadAdd;
    KeyMapper.Actions[KeyMapAction.ResolutionScaleDown].keyboardInput = keyboard.action.NumpadSubtract;
    KeyMapper.Actions[KeyMapAction.ResolutionScaleReset].keyboardInput = keyboard.action.Numpad0;

  }

  static BindGamepad(gamepad: GamePad){

    //Movement
    this.Actions[KeyMapAction.ActionUp].gamepadInput = gamepad.stick_l_y;
    this.Actions[KeyMapAction.ActionDown].gamepadInput = gamepad.stick_l_y;
    this.Actions[KeyMapAction.CameraRotateLeft].gamepadInput = gamepad.stick_l_x;
    this.Actions[KeyMapAction.CameraRotateRight].gamepadInput = gamepad.stick_l_x;
    this.Actions[KeyMapAction.Freelook].gamepadInput = gamepad.stick_l;
    this.Actions[KeyMapAction.SelectPrev].gamepadInput = gamepad.trigger_l;
    this.Actions[KeyMapAction.SelectNext].gamepadInput = gamepad.trigger_r;

    //Game
    this.Actions[KeyMapAction.Options].gamepadInput = gamepad.button_start;
    this.Actions[KeyMapAction.Pause].gamepadInput = gamepad.button_bumper_l;
    this.Actions[KeyMapAction.ChangeChar].gamepadInput = gamepad.button_bumper_r;
    this.Actions[KeyMapAction.STEALTH].gamepadInput = gamepad.button_back;
    this.Actions[KeyMapAction.Flourish].gamepadInput = gamepad.button_y;
    this.Actions[KeyMapAction.ClearOneAction].gamepadInput = gamepad.button_y;
    this.Actions[KeyMapAction.ActionUp].gamepadInput = gamepad.button_d_up;
    this.Actions[KeyMapAction.ActionDown].gamepadInput = gamepad.button_d_down;
    this.Actions[KeyMapAction.ActionLeft].gamepadInput = gamepad.button_d_left;
    this.Actions[KeyMapAction.ActionRight].gamepadInput = gamepad.button_d_right;
    this.Actions[KeyMapAction.CancleCombat].gamepadInput = gamepad.button_b;
    this.Actions[KeyMapAction.AlternateActions].gamepadInput = gamepad.button_x;
    
    //GUI
    this.Actions[KeyMapAction.PrevMenu].gamepadInput = gamepad.button_bumper_l;
    this.Actions[KeyMapAction.NextMenu].gamepadInput = gamepad.button_bumper_r;
    this.Actions[KeyMapAction.MoveForward].gamepadInput = gamepad.button_d_up;
    this.Actions[KeyMapAction.MoveBack].gamepadInput = gamepad.button_d_down;
    this.Actions[KeyMapAction.StrafeLeft].gamepadInput = gamepad.button_d_left;
    this.Actions[KeyMapAction.StrafeRight].gamepadInput = gamepad.button_d_right;
    this.Actions[KeyMapAction.PrevMenu].gamepadInput = gamepad.button_bumper_l;
    this.Actions[KeyMapAction.PrevMenu].gamepadInput = gamepad.button_bumper_l;
    this.Actions[KeyMapAction.PrevMenu].gamepadInput = gamepad.button_bumper_l;
    
  }

}

export function language0ToKeyCode(language0: number): string {
  switch(language0){
    case 9:
      return 'UpArrow'; 
    case 7:
      return 'LeftArrow'; 
    case 8:
      return 'RightArrow'; 
    case 10:
      return 'DownArrow'; 
    case 11:
      return 'Numpad1'; 
    case 12:
      return 'Numpad2'; 
    case 13:
      return 'Numpad3'; 
    case 14:
      return 'Numpad4'; 
    case 15:
      return 'Numpad5'; 
    case 16:
      return 'Numpad6'; 
    case 17:
      return 'Numpad7'; 
    case 18:
      return 'Numpad8'; 
    case 19:
      return 'Numpad9'; 
    case 20:
      return 'Numpad0'; 
    case 21:
      return 'NumpadDecimal'; 
    case 22:
      return 'NumpadSubtract'; 
    case 23:
      return 'NumpadAdd'; 
    case 24:
      return 'ShiftLeft'; 
    case 25:
      return 'ShiftRight'; 
    case 28:
      return 'ControlLeft'; 
    case 29:
      return 'ControlRight'; 
    case 30:
      return 'Tab'; 
    case 31:
      return 'Escape'; 
    case 32:
      return 'Home'; 
    case 33:
      return 'End';  
    case 34:
      return 'PageUp'; 
    case 35:
      return 'PageDown'; 
    case 36:
      return 'Insert'; 
    case 37:
      return 'Delete'; 
    case 39:
      return 'F1'; 
    case 40:
      return 'F2'; 
    case 41:
      return 'F3'; 
    case 42:
      return 'F4'; 
    case 43:
      return 'F5'; 
    case 44:
      return 'F6'; 
    case 45:
      return 'F7'; 
    case 46:
      return 'F8'; 
    case 47:
      return 'F9'; 
    case 48:
      return 'F10'; 
    case 49:
      return 'F11'; 
    case 50:
      return 'F12'; 
    case 51:
      return 'KeyA'; 
    case 52:
      return 'KeyB'; 
    case 53:
      return 'KeyC'; 
    case 54:
      return 'KeyD'; 
    case 55:
      return 'KeyE'; 
    case 56:
      return 'KeyF'; 
    case 57:
      return 'KeyG'; 
    case 58:
      return 'KeyH'; 
    case 59:
      return 'KeyI'; 
    case 60:
      return 'KeyJ'; 
    case 61:
      return 'KeyK'; 
    case 62:
      return 'KeyL'; 
    case 63:
      return 'KeyM'; 
    case 64:
      return 'KeyN'; 
    case 65:
      return 'KeyO'; 
    case 66:
      return 'KeyP'; 
    case 67:
      return 'KeyQ'; 
    case 68:
      return 'KeyR'; 
    case 69:
      return 'KeyS'; 
    case 70:
      return 'KeyT'; 
    case 71:
      return 'KeyU'; 
    case 72:
      return 'KeyV'; 
    case 73:
      return 'KeyW'; 
    case 74:
      return 'KeyX'; 
    case 75:
      return 'KeyY'; 
    case 76:
      return 'KeyZ'; 
    case 77:
      return 'Digit1'; 
    case 78:
      return 'Digit2'; 
    case 79:
      return 'Digit3'; 
    case 80:
      return 'Digit4'; 
    case 81:
      return 'Digit5'; 
    case 82:
      return 'Digit6'; 
    case 83:
      return 'Digit7'; 
    case 84:
      return 'Digit8'; 
    case 85:
      return 'Digit9'; 
    case 86:
      return 'Digit0'; 
    case 87:
      return 'Space'; 
    case 88:
      return 'NumpadEnter';
    case 89:
      return 'CapsLock'; 
    case 90:
      return 'Pause';
    case 94:
      return 'Minus'; 
    case 96:
      return 'Backspace'; 
    case 97:
      return 'BracketRight'; 
    case 98:
      return 'Backslash';
    case 99:
      return 'Semicolon'; 
    case 103:
      return 'Comma'; 
    case 104:
      return 'Period'; 
    case 105:
      return 'Slash';
    case 106:
      return 'NumpadMultiply';
    case 108:
      return 'NumpadDivide';
  }
  return undefined;
}

export enum KeyCodeToLanguage0 {
  Backquote =       undefined, //UNUSED
  AltLeft =         undefined, //UNUSED
  AltRight =        undefined, //UNUSED
  NumLock =         undefined, //UNUSED
  MetaLeft =        undefined, //UNUSED
  BracketLeft =     undefined, 
  Quote =           undefined, 
  Equal =           undefined,
  UpArrow =         9,  //Up
  LeftArrow =       7, //Left
  RightArrow =      8, //Right
  DownArrow =       10,  //Down
  Numpad1 =         11, //NUM 1
  Numpad2 =         12, //NUM 2
  Numpad3 =         13, //NUM 3
  Numpad4 =         14, //NUM 4
  Numpad5 =         15, //NUM 5
  Numpad6 =         16, //NUM 6
  Numpad7 =         17, //NUM 7
  Numpad8 =         18, //NUM 8
  Numpad9 =         19, //NUM 9 
  Numpad0 =         20, //NUM 0
  NumpadDecimal =   21, //Num Del
  NumpadSubtract =  22, //- 
  NumpadAdd =       23, //+
  ShiftLeft =       24, 
  ShiftRight =      25, 
  ControlLeft =     28, 
  ControlRight =    29, 
  Tab =             30, 
  Escape =          31, 
  Home =            32, 
  End =             33,  
  PageUp =          34, 
  PageDown =        35, 
  Insert =          36, 
  Delete =          37, 
  F1 =              39, 
  F2 =              40, 
  F3 =              41, 
  F4 =              42, 
  F5 =              43, 
  F6 =              44, 
  F7 =              45, 
  F8 =              46, 
  F9 =              47, 
  F10 =             48, 
  F11 =             49, 
  F12 =             50, 
  KeyA =            51, 
  KeyB =            52, 
  KeyC =            53, 
  KeyD =            54, 
  KeyE =            55, 
  KeyF =            56, 
  KeyG =            57, 
  KeyH =            58, 
  KeyI =            59, 
  KeyJ =            60, 
  KeyK =            61, 
  KeyL =            62, 
  KeyM =            63, 
  KeyN =            64, 
  KeyO =            65, 
  KeyP =            66, 
  KeyQ =            67, 
  KeyR =            68, 
  KeyS =            69, 
  KeyT =            70, 
  KeyU =            71, 
  KeyV =            72, 
  KeyW =            73, 
  KeyX =            74, 
  KeyY =            75, 
  KeyZ =            76, 
  Digit1 =          77, 
  Digit2 =          78, 
  Digit3 =          79, 
  Digit4 =          80, 
  Digit5 =          81, 
  Digit6 =          82, 
  Digit7 =          83, 
  Digit8 =          84, 
  Digit9 =          85, 
  Digit0 =          86, 
  Space =           87, 
  NumpadEnter =     88, //NUM Enter 
  // Enter =        88, 
  CapsLock =        89, 
  Pause =           90,
  Minus =           94, 
  Backspace =       96, 
  BracketRight =    97, 
  Backslash =       98, // \ 
  Semicolon =       99, 
  Comma =           103, 
  Period =          104, 
  Slash =           105, // /
  NumpadMultiply =  106,  //*
  NumpadDivide =    108,  //Num /
}