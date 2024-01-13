import { DiceType } from "../enums/combat/DiceType";

/**
 * Dice class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Dice.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Dice {

  static roll(num: number = 0, die: DiceType, modifier: number = 0){
    if(num <= 0) return 0;

    switch(die){
      case DiceType.d2:
        return Dice.rollD2(num) + modifier;
      case DiceType.d3:
        return Dice.rollD3(num) + modifier;
      case DiceType.d4:
        return Dice.rollD4(num) + modifier;
      case DiceType.d6:
        return Dice.rollD6(num) + modifier;
      case DiceType.d8:
        return Dice.rollD8(num) + modifier;
      case DiceType.d10:
        return Dice.rollD10(num) + modifier;
      case DiceType.d12:
        return Dice.rollD12(num) + modifier;
      case DiceType.d20:
        return Dice.rollD20(num) + modifier;
      case DiceType.d100:
        return Dice.rollD100(num) + modifier;
      default:
        return 0;
    }
  }

  static intToDiceType(sides: number = 0): DiceType {
    let type: DiceType = DiceType.d8;
    switch(sides){
      case 2:
        type = DiceType.d2;
      break;
      case 3:
        type = DiceType.d3;
      break;
      case 4:
        type = DiceType.d4;
      break;
      case 6:
        type = DiceType.d6;
      break;
      case 8:
        type = DiceType.d8;
      break;
      case 10:
        type = DiceType.d10;
      break;
      case 12:
        type = DiceType.d12;
      break;
      case 20:
        type = DiceType.d20;
      break;
      case 100:
        type = DiceType.d100;
      break;
    }
    return type;
  }

  static rollD2(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 2 + 1);
    }
    return total;
  }
  
  static rollD3(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 3 + 1);
    }
    return total;
  }
  
  static rollD4(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 4 + 1);
    }
    return total;
  }
  
  static rollD6(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 6 + 1);
    }
    return total;
  }
  
  static rollD8(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 8 + 1);
    }
    return total;
  }
  
  static rollD10(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 10 + 1);
    }
    return total;
  }
  
  static rollD12(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 12 + 1);
    }
    return total;
  }
  
  static rollD20(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 20 + 1);
    }
    return total;
  }
  
  static rollD100(num: number = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      total += Math.floor(Math.random() * 100 + 1);
    }
    return total;
  }

}