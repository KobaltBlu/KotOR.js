import { AnalogInput } from "@engine/controls/AnalogInput";
import { KeyInput } from "@engine/controls/KeyInput";
import { detectPadFamily, type PadFamily } from "@engine/controls/gamepad-glyphs";

/** Radial dead zone for both sticks (fraction of full deflection). */
export const STICK_DEADZONE = 0.15;

/**
 * Radial stick dead zone: the stick reads 0 while inside a circle of radius
 * `deadzone`, then rescales so full deflection still reaches 1. Unlike a dead
 * zone on each axis, this does not snap diagonals toward the axes.
 */
export function radialDeadZone(x: number, y: number, deadzone: number = STICK_DEADZONE): { x: number; y: number } {
  const fx = Number.isFinite(x) ? x : 0;
  const fy = Number.isFinite(y) ? y : 0;
  const mag = Math.hypot(fx, fy);
  if(mag <= deadzone || mag < 1e-9){
    return { x: 0, y: 0 };
  }
  const clamped = Math.min(1, mag);
  const scale = ((clamped - deadzone) / (1 - deadzone)) / mag;
  return { x: fx * scale, y: fy * scale };
}

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

  // Stick dead zones are radial and applied in updateState.
  stick_l_x = new AnalogInput('L_STICK_X', 0, true);
  stick_l_y = new AnalogInput('L_STICK_Y', 0, true);
  stick_l = new KeyInput('L_STICK');

  stick_r_x = new AnalogInput('R_STICK_X', 0, true);
  stick_r_y = new AnalogInput('R_STICK_Y', 0, true);
  stick_r = new KeyInput('R_STICK');
  gamePad: Gamepad;
  controlsMapped: boolean;

  /** Button family of the current pad (drives on-screen button symbols). */
  family: PadFamily = 'xbox';

  constructor(){
    this.gamePad = undefined;
    this.controlsMapped = false;
    this.mapKeys();

    // Only navigation inputs auto-repeat while held. Confirm / cancel / menu
    // buttons fire once per press so holding them never re-clicks.
    for(const input of [
      this.button_a, this.button_b, this.button_x, this.button_y,
      this.button_back, this.button_start,
      this.button_bumper_l, this.button_bumper_r,
      this.stick_l, this.stick_r,
    ]){
      input.repeatEnabled = false;
    }
  }

  /** Every button and axis, for bulk resets. */
  allInputs(): (KeyInput | AnalogInput)[] {
    return [
      this.button_a, this.button_b, this.button_x, this.button_y,
      this.button_back, this.button_start,
      this.button_d_up, this.button_d_down, this.button_d_left, this.button_d_right,
      this.button_bumper_l, this.button_bumper_r,
      this.trigger_l, this.trigger_r,
      this.stick_l, this.stick_l_x, this.stick_l_y,
      this.stick_r, this.stick_r_x, this.stick_r_y,
    ];
  }

  setGamePad( gamePad: Gamepad | undefined ){
    this.gamePad = gamePad;
    if(gamePad){
      this.family = detectPadFamily(gamePad.id);
    }
  }

  /** Release every input, so nothing stays held after the pad goes away. */
  reset(){
    for(const input of this.allInputs()){
      input.reset();
    }
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
      const left = radialDeadZone(this.stick_l_x.readRaw(this.gamePad), this.stick_l_y.readRaw(this.gamePad));
      this.stick_l_x.updateWithValue(left.x, delta);
      this.stick_l_y.updateWithValue(left.y, delta);

      this.stick_r.update(this.gamePad, delta);
      const right = radialDeadZone(this.stick_r_x.readRaw(this.gamePad), this.stick_r_y.readRaw(this.gamePad));
      this.stick_r_x.updateWithValue(right.x, delta);
      this.stick_r_y.updateWithValue(right.y, delta);
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

  /**
   * Fresh snapshot of the active pad for this frame. Keeps the current pad
   * while it is connected, otherwise switches to the first connected pad.
   * Returns undefined when no pad is available.
   */
  static pollActive(): Gamepad | undefined {
    if(GamePad.simulatedFamily){
      const sim = GamePad.getSimulatedPad();
      GamePad.CurrentGamePadIndex = sim.index;
      GamePad.CurrentGamePad = sim;
      return sim;
    }
    const pads = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
      ? navigator.getGamepads()
      : [];
    const current = GamePad.CurrentGamePadIndex >= 0 ? pads[GamePad.CurrentGamePadIndex] : null;
    if(current && current.connected){
      GamePad.CurrentGamePad = current;
      return current;
    }
    for(let i = 0; i < pads.length; i++){
      const pad = pads[i];
      if(pad && pad.connected){
        GamePad.CurrentGamePadIndex = pad.index;
        GamePad.CurrentGamePad = pad;
        return pad;
      }
    }
    GamePad.CurrentGamePadIndex = -1;
    GamePad.CurrentGamePad = undefined;
    return undefined;
  }

  static Init(){
    GamePad.GamePads = {};

    function gamepadHandler(e: GamepadEvent, connecting: boolean = false) {
      const gamepad = e.gamepad;
      if (connecting) {
        GamePad.GamePads[gamepad.index] = gamepad;
        if(GamePad.CurrentGamePadIndex == -1){
          GamePad.CurrentGamePadIndex = gamepad.index;
          GamePad.CurrentGamePad = gamepad;
        }
      } else {
        delete GamePad.GamePads[gamepad.index];
        if(GamePad.CurrentGamePadIndex == gamepad.index){
          GamePad.CurrentGamePadIndex = -1;
          GamePad.CurrentGamePad = undefined;
          // Fall back to another pad that is still connected.
          GamePad.pollActive();
        }
      }
    }

    globalThis.addEventListener("gamepadconnected", function(e: GamepadEvent) { gamepadHandler(e, true); }, false);
    globalThis.addEventListener("gamepaddisconnected", function(e: GamepadEvent) { gamepadHandler(e, false); }, false);
  }


  /**
   * Debug: when set, the game reads an idle pad of this family instead of
   * the real ones, so pad prompts and button symbols show with no controller
   * plugged in.
   */
  static simulatedFamily: PadFamily | undefined = undefined;
  static readonly SIMULATED_PAD_INDEX = 99;
  static #simulatedPad: Gamepad | undefined;

  /** The idle stand-in pad used while `simulatedFamily` is set. */
  static getSimulatedPad(): Gamepad {
    const family = GamePad.simulatedFamily || 'xbox';
    const id = family === 'playstation'
      ? 'Simulated DualSense Wireless Controller (Vendor: 054c)'
      : 'Simulated Xbox Wireless Controller (Vendor: 045e)';
    if(GamePad.#simulatedPad?.id === id) return GamePad.#simulatedPad;
    const fields = {
      id,
      index: GamePad.SIMULATED_PAD_INDEX,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0],
      vibrationActuator: null as any,
    };
    // Built on the real prototype so `instanceof Gamepad` checks accept it.
    const proto = typeof Gamepad === 'function' ? Gamepad.prototype : Object.prototype;
    const pad = Object.create(proto) as Gamepad;
    for(const [key, value] of Object.entries(fields)){
      Object.defineProperty(pad, key, { value, enumerable: true });
    }
    GamePad.#simulatedPad = pad;
    return pad;
  }

  /** Turn the simulated pad on with a family, or off with undefined. */
  static setSimulatedFamily(family: PadFamily | undefined){
    GamePad.simulatedFamily = family;
    if(!family && GamePad.CurrentGamePadIndex === GamePad.SIMULATED_PAD_INDEX){
      GamePad.CurrentGamePadIndex = -1;
      GamePad.CurrentGamePad = undefined;
    }
  }

  static CurrentGamePad: Gamepad | undefined;
  static CurrentGamePadIndex: number = -1;
  static GamePads: Record<number, Gamepad> = {};

}
