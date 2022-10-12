import { AnalogInput } from "./AnalogInput";
import { GamePad } from "./GamePad";


export class KeyInput {

  static RepeatThreshold = 0.5;
  label: string;
  down: boolean;
  pDown: boolean;
  pressed: boolean;
  buttonIndex: number;
  repeating: boolean;
  repeatTimer: number;
  repeatPulseTimer: number;
  reapeatSpeed: number;

  constructor( label = 'N/A' ){
    //Input label
    this.label = label;
    //Stores the current down value
    this.down = false;
    //Stores the previous down value
    this.pDown = false;

    //This should only trigger once at the beginning of a button press event
    this.pressed = false;
    //the index of the button object on the gamepad's buttons array
    this.buttonIndex = -1;

    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

  update(gamePad: Gamepad, delta = 0){
    this.pressed = false;
    this.repeating = false;
    this.pDown = this.down;
    if( gamePad instanceof Gamepad ){
      if( gamePad.buttons[this.buttonIndex] ){
        this.down = gamePad.buttons[this.buttonIndex].pressed;

        //If the key is pressed, but was previously not pressed then set the pressed value to true
        if( !this.pDown && this.down ){
          this.pressed = true;
        }

        if( this.down ){
          this.repeatTimer += delta;
          this.reapeatSpeed = Math.floor(this.repeatTimer / AnalogInput.RepeatThreshold) < 5 ? 1 : 2;
          if( this.repeatTimer >= KeyInput.RepeatThreshold ){
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

}