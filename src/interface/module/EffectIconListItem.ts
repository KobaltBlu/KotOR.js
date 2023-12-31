import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";

export interface EffectIconListItem {
  id: number;
  resref: string;
  texture?: OdysseyTexture;
  priority: number;
  good: boolean;
}