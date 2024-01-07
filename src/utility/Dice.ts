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
