import { GameState } from "../GameState";
import { InventoryManager } from "./InventoryManager";
import { ModuleItem } from "../module";
import { GFFObject } from "../resource/GFFObject";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { KEYManager } from "./KEYManager";
import { ExperienceType } from "../enums/engine/ExperienceType";

/**
 * CheatConsoleManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CheatConsoleManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CheatConsoleManager {

  //Gives your character the amount of Dark Side points you want
  static addDarkSide(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.goodEvil -= points;
      if(player.goodEvil < 0) player.goodEvil = 0;
    }
  }

  //Gives your character the amount of experience points you want
  static addEXP(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.addXP(points, ExperienceType.PLOT);
    }
  }

  //Increases your character's level to the number you want
  static addLevel(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      
    }
  }

  //Gives your character the amount of Light Side points you want
  static addLightSide(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.goodEvil += points;
      if(player.goodEvil > 100) player.goodEvil = 100;
    }
  }

  //Increases the brightness in the game
  static bright(){

  }

  //Receive (n) computer spikes
  static giveComputerSpikes (amount: number = 100){
    amount = Math.abs(amount);

  }

  //Receive the amount of credits you want
  static giveCredits (amount: number = 0){
    amount = Math.abs(amount);

  }

  static giveItem(resref: string = '', amount: number = 1){
    amount = Math.abs(amount);
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resref);
    if(buffer){
      const item = new ModuleItem(new GFFObject(buffer));
      item.initProperties();
      item.setStackSize(amount);
      InventoryManager.addItem(item);
      return item;
    }
    return undefined;
  }

  //Receive (n) medkits
  static giveMedPacks (amount: number = 100){
    amount = Math.abs(amount);

  }

  //Refills your character's health and Force points
  static heal (){
    const player = GameState.getCurrentPlayer();
    if(player){
      
    }
  }

  //Reveals the entire map for the area you're in
  static revealmap() {
    if(GameState?.module?.area){
      //todo
    }
  }

  //Teleports your characters to a specific location
  static warp (name: string = ''){
    if(name){
      GameState.LoadModule(name)
    }
  }

  //Will display your character's current coordinates
  static whereami (){
    //todo
  }

  static giveRandomLoot(amount: number = 1) {
    const items = KEYManager.Key.keys.filter( (k) => k.resType == ResourceTypes.uti );
    for(let i = 0; i < amount; i++){
      const item = items[Math.floor(Math.random()*items.length)];
      if(item){
        CheatConsoleManager.giveItem(item.resRef, 1);
      }
    }
  }

  static processCommand(command: string){
    const args = command.trim().toLowerCase().split(' ');
    const cmd = args.shift();
    const params = args;
    switch(cmd){  
      case 'adddark':
        CheatConsoleManager.addDarkSide(parseInt(params[0]));
        break;
      case 'addlight':
        CheatConsoleManager.addLightSide(parseInt(params[0]));
        break;
      case 'addlevel':
        CheatConsoleManager.addLevel(parseInt(params[0]));
        break;
      case 'addxp':
        CheatConsoleManager.addEXP(parseInt(params[0]));
        break;  
      case 'giveitem':
        CheatConsoleManager.giveItem(params[0], parseInt(params[1]));
        break;
      case 'givecredits':
        CheatConsoleManager.giveCredits(parseInt(params[0]));
        break;  
      case 'heal':
        CheatConsoleManager.heal();
        break;
      case 'revealmap':
        CheatConsoleManager.revealmap();
        break;  
      case 'warp':
        CheatConsoleManager.warp(params[0]);
        break;
      case 'whereami':
        CheatConsoleManager.whereami();
        break;  
      case 'giverandomloot':
        CheatConsoleManager.giveRandomLoot(parseInt(params[0]));
        break;
    }
  }

}