import { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";
import { SWDoorAppearance } from "@/engine/rules/SWDoorAppearance";
import { SWPlaceableAppearance } from "@/engine/rules/SWPlaceableAppearance";
import { GameState } from "@/GameState";
import { TwoDAManager } from "@/managers/TwoDAManager"

/**
 * AppearanceManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AppearanceManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AppearanceManager {

  static appearances: Map<number, SWCreatureAppearance> = new Map();
  static doorAppearances: Map<number, SWDoorAppearance> = new Map();
  static placeableAppearances: Map<number, SWPlaceableAppearance> = new Map();

  static GetCreatureAppearanceById(id: number): SWCreatureAppearance {
    return AppearanceManager.appearances.get(id);
  }

  static GetDoorAppearanceById(id: number): SWDoorAppearance {
    return AppearanceManager.doorAppearances.get(id);
  }

  static GetPlaceableAppearanceById(id: number): SWPlaceableAppearance {
    return AppearanceManager.placeableAppearances.get(id);
  }

  static Init(){
    const creatureAppearances = GameState.SWRuleSet.creatureAppearances;
    if(creatureAppearances){
      for(let i = 0; i < creatureAppearances.length; i++){
        const appearance = creatureAppearances[i];
        AppearanceManager.appearances.set(appearance.id, appearance);
      }
    }

    const doorAppearances = GameState.SWRuleSet.doorAppearances;
    if(doorAppearances){
      for(let i = 0; i < doorAppearances.length; i++){
        const appearance = doorAppearances[i];
        AppearanceManager.doorAppearances.set(appearance.id, appearance);
      }
    }

    const placeableAppearances = GameState.SWRuleSet.placeableAppearances;
    if(placeableAppearances){
      for(let i = 0; i < placeableAppearances.length; i++){
        const appearance = placeableAppearances[i];
        AppearanceManager.placeableAppearances.set(appearance.id, appearance);
      }
    }
  }

}