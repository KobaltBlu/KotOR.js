
import { EngineMode } from "../enums/engine/EngineMode";
import { TwoDAManager } from "../managers/TwoDAManager";
import { AnalogInput } from "./AnalogInput";
import { GamePad } from "./GamePad";
import { KeyInput } from "./KeyInput";
import { Keyboard } from "./Keyboard";
import { KeyMapAction } from "../enums/controls/KeyMapAction";

type KeymapProcessorCallback = (map: Keymap, delta: number) => void;

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

  static BindKeyboard(keyboard: Keyboard){

    //Movement
    KeyMapper.Actions[KeyMapAction.ActionUp].keyboardInput = keyboard.action.KeyW;
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
    KeyMapper.Actions[KeyMapAction.WALKMODIFY].keyboardInput = keyboard.action.KeyB;

    //Game
    KeyMapper.Actions[KeyMapAction.Pause].keyboardInput = keyboard.action.Pause;
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
    KeyMapper.Actions[KeyMapAction.ClearOneAction].keyboardInput = keyboard.action.KeyY;

    //MiniGame
    KeyMapper.Actions[KeyMapAction.MGActionUp].keyboardInput = keyboard.action.KeyW;
    KeyMapper.Actions[KeyMapAction.MGActionDown].keyboardInput = keyboard.action.KeyS;
    KeyMapper.Actions[KeyMapAction.MGActionLeft].keyboardInput = keyboard.action.KeyA;
    KeyMapper.Actions[KeyMapAction.MGActionRight].keyboardInput = keyboard.action.KeyD;
    KeyMapper.Actions[KeyMapAction.MGshoot].keyboardInput = keyboard.action.Space;
    KeyMapper.Actions[KeyMapAction.PauseMinigame].keyboardInput = keyboard.action.Escape;

    //Dialog
    KeyMapper.Actions[KeyMapAction.Dialog1].keyboardInput = keyboard.action.Digit1;
    KeyMapper.Actions[KeyMapAction.Dialog2].keyboardInput = keyboard.action.Digit2;
    KeyMapper.Actions[KeyMapAction.Dialog3].keyboardInput = keyboard.action.Digit3;
    KeyMapper.Actions[KeyMapAction.Dialog4].keyboardInput = keyboard.action.Digit4;
    KeyMapper.Actions[KeyMapAction.Dialog5].keyboardInput = keyboard.action.Digit5;
    KeyMapper.Actions[KeyMapAction.Dialog6].keyboardInput = keyboard.action.Digit6;
    KeyMapper.Actions[KeyMapAction.Dialog7].keyboardInput = keyboard.action.Digit7;
    KeyMapper.Actions[KeyMapAction.Dialog8].keyboardInput = keyboard.action.Digit8;
    KeyMapper.Actions[KeyMapAction.Dialog9].keyboardInput = keyboard.action.Digit9;
    KeyMapper.Actions[KeyMapAction.DialogSkip].keyboardInput = keyboard.action.Space;

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