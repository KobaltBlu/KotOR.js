import { CreatureAppearance } from "../engine/CreatureAppearance";
import { DoorAppearance } from "../engine/DoorAppearance";
import { PlaceableAppearance } from "../engine/PlaceableAppearance";
import { TwoDAManager } from "./TwoDAManager"

export class AppearanceManager {

  static appearances: Map<number, CreatureAppearance> = new Map();
  static doorAppearances: Map<number, DoorAppearance> = new Map();
  static placeableAppearances: Map<number, PlaceableAppearance> = new Map();

  static GetCreatureAppearanceById(id: number): CreatureAppearance {
    return AppearanceManager.appearances.get(id);
  }

  static GetDoorAppearanceById(id: number): DoorAppearance {
    return AppearanceManager.doorAppearances.get(id);
  }

  static GetPlaceableAppearanceById(id: number): PlaceableAppearance {
    return AppearanceManager.placeableAppearances.get(id);
  }

  static Init(){
    const appearances = TwoDAManager.datatables.get('appearance');
    if(appearances){
      for(let i = 0; i < appearances.RowCount; i++){
        const row = appearances.rows[i];
        const id = parseInt(row.__index);
        const appearance = CreatureAppearance.From2DA(row);
        AppearanceManager.appearances.set(id, appearance);
      }
    }

    const genericdoors = TwoDAManager.datatables.get('genericdoors');
    if(genericdoors){
      for(let i = 0; i < genericdoors.RowCount; i++){
        const row = genericdoors.rows[i];
        const id = parseInt(row.__index);
        const appearance = DoorAppearance.From2DA(row);
        AppearanceManager.doorAppearances.set(id, appearance);
      }
    }

    const placeables = TwoDAManager.datatables.get('placeables');
    if(placeables){
      for(let i = 0; i < placeables.RowCount; i++){
        const row = placeables.rows[i];
        const id = parseInt(row.__index);
        const appearance = PlaceableAppearance.From2DA(row);
        AppearanceManager.placeableAppearances.set(id, appearance);
      }
    }
  }

}