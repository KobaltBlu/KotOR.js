import { OdysseyTexture } from "../../resource/OdysseyTexture";

export interface EffectIconListItem {
  id: number;
  resref: string;
  texture?: OdysseyTexture;
  priority: number;
  good: boolean;
}