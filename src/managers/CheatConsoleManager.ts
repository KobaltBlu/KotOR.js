import { GameState } from "../GameState";
import { InventoryManager } from "./InventoryManager";
import { ModuleItem } from "../module";
import { GFFObject } from "../resource/GFFObject";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { KEYManager } from "./KEYManager";

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
      player.addXP(points);
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
      item.InitProperties();
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
    const items = KEYManager.Key.keys.filter( (k) => k.ResType == ResourceTypes.uti );
    for(let i = 0; i < amount; i++){
      const item = items[Math.floor(Math.random()*items.length)];
      if(item){
        CheatConsoleManager.giveItem(item.ResRef, 1);
      }
    }
  }

}