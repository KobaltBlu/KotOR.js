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

    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

  update(gamePad: Gamepad, delta = 0){
    this.pressed = false;
    this.repeating = false;
    if( gamePad instanceof Gamepad ){
      if( this.axes && gamePad.axes[this.axesIndex] ){
        this.value = gamePad.axes[this.axesIndex] * ( Math.max(0, Math.abs( gamePad.axes[this.axesIndex] ) - this.deadZone ) / ( 1 - this.deadZone ) );
      }else if( !this.axes && gamePad.buttons[this.buttonIndex] ){
        this.value = gamePad.buttons[this.buttonIndex].value * ( Math.max(0, Math.abs( gamePad.buttons[this.buttonIndex].value ) - this.deadZone ) / ( 1 - this.deadZone ) );
      }

      if( !this.pressed && Math.abs(this.value) >= this.pressThreshold ){
        if( !this.pressThresholdActive ){
          this.pressed = true;
          this.pressThresholdActive = true;
        }
      }

      if( Math.abs(this.value) < this.pressThreshold ){
        this.pressThresholdActive = false;
      }

      if( this.pressThresholdActive ){
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
  }

}