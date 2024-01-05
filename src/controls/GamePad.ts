import { AnalogInput } from "./AnalogInput";
import { KeyInput } from "./KeyInput";

/**
 * GamePad class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GamePad.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GamePad {

  button_a = new KeyInput('A');
  button_b = new KeyInput('B');
  button_x = new KeyInput('X');
  button_y = new KeyInput('Y');

  button_back = new KeyInput('BACK');
  button_start = new KeyInput('START');

  button_d_up = new KeyInput('D_UP');
  button_d_down = new KeyInput('D_DOWN');
  button_d_left = new KeyInput('D_LEFT');
  button_d_right = new KeyInput('D_RIGHT');

  button_bumper_l = new KeyInput('BUMPER_LEFT');
  button_bumper_r = new KeyInput('BUMPER_RIGHT');

  trigger_l = new AnalogInput('TRIGGER_LEFT', 0.0);
  trigger_r = new AnalogInput('TRIGGER_RIGHT', 0.0);

  stick_l_x = new AnalogInput('L_STICK_X', 0.1, true);
  stick_l_y = new AnalogInput('L_STICK_Y', 0.1, true);
  stick_l = new KeyInput('L_STICK');

  stick_r_x = new AnalogInput('R_STICK_X', 0.1, true);
  stick_r_y = new AnalogInput('R_STICK_Y', 0.1, true);
  stick_r = new KeyInput('R_STICK');
  gamePad: Gamepad;
  controlsMapped: boolean;

  constructor(){
    this.gamePad = undefined;
    this.controlsMapped = false;
    this.mapKeys();
  }

  setGamePad( gamePad: Gamepad ){
    this.gamePad = gamePad;
  }

  updateState(delta = 0){
    if(this.gamePad instanceof Gamepad){
      this.button_a.update(this.gamePad, delta);
      this.button_b.update(this.gamePad, delta);
      this.button_x.update(this.gamePad, delta);
      this.button_y.update(this.gamePad, delta);

      this.button_bumper_l.update(this.gamePad, delta);
      this.button_bumper_r.update(this.gamePad, delta);

      this.trigger_l.update(this.gamePad, delta);
      this.trigger_r.update(this.gamePad, delta);

      this.button_back.update(this.gamePad, delta);
      this.button_start.update(this.gamePad, delta);

      this.button_d_up.update(this.gamePad, delta);
      this.button_d_down.update(this.gamePad, delta);
      this.button_d_left.update(this.gamePad, delta);
      this.button_d_right.update(this.gamePad, delta);

      this.stick_l.update(this.gamePad, delta);
      this.stick_l_x.update(this.gamePad, delta);
      this.stick_l_y.update(this.gamePad, delta);
      
      this.stick_r.update(this.gamePad, delta);
      this.stick_r_x.update(this.gamePad, delta);
      this.stick_r_y.update(this.gamePad, delta);
    }
  }

  mapKeys(){
    //A B X Y | X O ◻ △
    this.button_a.buttonIndex = 0; //A | X == 0
    this.button_b.buttonIndex = 1; //B | O == 1
    this.button_x.buttonIndex = 2; //X | ◻ == 2
    this.button_y.buttonIndex = 3; //Y | △ == 3

    //Bumpers
    this.button_bumper_l.buttonIndex = 4; //bumper_l == 4
    this.button_bumper_r.buttonIndex = 5; //bumper_r == 5

    //Triggers
    this.trigger_l.buttonIndex = 6; //trigger_l == 6
    this.trigger_r.buttonIndex = 7; //trigger_r == 7

    //Start / Select
    this.button_back.buttonIndex = 8; //back == 8
    this.button_start.buttonIndex = 9; //start == 9

    //Left Stick
    this.stick_l.buttonIndex = 10; //stick_l == 10
    this.stick_l_x.axesIndex = 0;
    this.stick_l_y.axesIndex = 1;

    //Right Stick
    this.stick_r.buttonIndex = 11; //stick_r == 11
    this.stick_r_x.axesIndex = 2;
    this.stick_r_y.axesIndex = 3;

    //D Pad
    this.button_d_up.buttonIndex = 12; //d_up == 12
    this.button_d_down.buttonIndex = 13; //d_down == 13
    this.button_d_left.buttonIndex = 14; //d_left == 14
    this.button_d_right.buttonIndex = 15; //d_right == 15


    //16 //home_button
    //17 //dualshock4 trackpad button

    this.controlsMapped = true;
  }

  onDisconnected(){

  }

  onConnected(){

  }

  static Init(){
    GamePad.GamePads = {};

    function gamepadHandler(e: any, connecting: boolean = false) {
      let gamepad = e.gamepad;
      // Note:
      // gamepad === navigator.getGamepads()[gamepad.index]
      console.log('gamepadHandler', e, connecting);
      if (connecting) {
        GamePad.GamePads[gamepad.index] = gamepad;
        if(GamePad.CurrentGamePadIndex == -1){
          GamePad.CurrentGamePad = gamepad;
        }
      } else {
        if(GamePad.CurrentGamePadIndex == gamepad.index){
          GamePad.CurrentGamePadIndex = -1;
          GamePad.CurrentGamePad = undefined;
        }
        
        delete GamePad.GamePads[gamepad.index];
      }
    }

    global.addEventListener("gamepadconnected", function(e) { gamepadHandler(e, true); }, false);
    global.addEventListener("gamepaddisconnected", function(e) { gamepadHandler(e, false); }, false);
  }


  static CurrentGamePad: GamePad;
  static CurrentGamePadIndex: number = -1;
  static GamePads: any = {};

}