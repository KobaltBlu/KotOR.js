/**
 * AnalogInput class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AnalogInput.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AnalogInput {

  static RepeatThreshold = 0.5;
  label: string;
  deadZone: number;
  axes: boolean;
  axesIndex: number;
  buttonIndex: number;
  value: number;
  pressed: boolean;
  pressThreshold: number;
  pressThresholdActive: boolean;
  /** When false, holding past the press threshold fires `pressed` once only. */
  repeatEnabled: boolean;
  repeating: boolean;
  repeatTimer: number;
  repeatPulseTimer: number;
  reapeatSpeed: number;

  constructor( label = 'N/A', deadZone = 0.0, axes = false ){
    //Input label
    this.label = label;
    //Analog deadzone
    this.deadZone = Math.abs(deadZone);
    //Gamepad Axes or Button
    this.axes = axes ? true : false;
    //Gamepad Axes Index
    this.axesIndex = -1;
    //Gamepad Button Index
    this.buttonIndex = -1;
    //Input value
    this.value = 0.0;
    //This should only trigger once at the after the value crosses the pressThreshold
    this.pressed = false;

    this.pressThreshold = 0.50;
    this.pressThresholdActive = false;

    this.repeatEnabled = true;
    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

  /** Remap raw axis/button into [-1,1] / [0,1] after deadzone (no squaring). */
  private applyDeadZone(raw: number): number {
    const dz = this.deadZone;
    if(dz <= 0){
      return raw;
    }
    if(dz >= 1){
      return 0;
    }
    const mag = Math.abs(raw);
    if(mag <= dz){
      return 0;
    }
    const scaled = (mag - dz) / (1 - dz);
    return raw < 0 ? -scaled : scaled;
  }

  /** Read the raw axis or button value from the pad (no dead zone applied). */
  readRaw(gamePad: Gamepad): number {
    if( this.axes ){
      const v = gamePad.axes[this.axesIndex];
      return typeof v === 'number' ? v : 0;
    }
    const btn = gamePad.buttons[this.buttonIndex];
    if( !btn ){
      return 0;
    }
    // Prefer analog value; some pads only flip .pressed (0/1).
    let raw = typeof btn.value === 'number' ? btn.value : 0;
    if(raw === 0 && btn.pressed){
      raw = 1;
    }
    return raw;
  }

  update(gamePad: Gamepad, delta = 0){
    if( !(gamePad instanceof Gamepad) ){
      this.pressed = false;
      this.repeating = false;
      return;
    }
    this.updateWithValue(this.applyDeadZone(this.readRaw(gamePad)), delta);
  }

  /**
   * Set an already-filtered value (for example a radial stick dead zone worked
   * out by the pad) and run press / repeat detection on it.
   */
  updateWithValue(value: number, delta = 0){
    this.pressed = false;
    this.repeating = false;
    this.value = Number.isFinite(value) ? value : 0;

    if( Math.abs(this.value) >= this.pressThreshold ){
      if( !this.pressThresholdActive ){
        this.pressed = true;
        this.pressThresholdActive = true;
      }
    }else{
      this.pressThresholdActive = false;
    }

    if( this.pressThresholdActive && this.repeatEnabled ){
      this.repeatTimer += delta;
      this.reapeatSpeed = Math.floor(this.repeatTimer / AnalogInput.RepeatThreshold) < 5 ? 1 : 2;
      if( this.repeatTimer >= AnalogInput.RepeatThreshold ){
        if( !this.repeatPulseTimer ){
          this.pressed = true;
          this.repeating = true;
          this.repeatPulseTimer += delta;
        }else{
          this.repeatPulseTimer += delta;
          if( this.repeatPulseTimer >= (0.1 / this.reapeatSpeed) ){
            this.repeatPulseTimer = 0;
          }
        }
      }
    }else{
      this.repeatTimer = 0;
      this.repeatPulseTimer = 0;
    }
  }

  /** Release the input (pad disconnected or missing for a frame). */
  reset(){
    this.value = 0;
    this.pressed = false;
    this.pressThresholdActive = false;
    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

}
