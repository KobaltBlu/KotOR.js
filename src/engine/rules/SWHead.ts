import { TwoDAObject } from "../../resource/TwoDAObject";

/**
 * Head texture for NPCs
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWHead.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWHead {
  id: number;
  head: string;
  headtexvvve: string;
  headtexe: string;
  headtexvve: string;
  headtexve: string;
  headtexg: string;
  headtexvg: string;

  getTextureGoodEvil(nGoodEvil: number){
    nGoodEvil = nGoodEvil > 50 ? 50 : nGoodEvil;
    const evilIndex = Math.floor(nGoodEvil/10);
    switch(evilIndex){
      case 0:
        return !!this.headtexvvve?.length ? this.headtexvvve : this.head;
      case 1:
        return !!this.headtexvve?.length ? this.headtexvve : this.head;
      case 2:
        return !!this.headtexve?.length ? this.headtexve : this.head;
      case 3:
        return !!this.headtexe?.length ? this.headtexe : this.head;
      case 4:
        return this.head;
      default:
        return this.head; 
    }
  }

  static From2DA(row:any){
    const head = new SWHead();
    head.id = TwoDAObject.normalizeValue(row.__index, "number", -1);
    head.head = TwoDAObject.normalizeValue(row.head, "string", "") as string;
    head.headtexvvve = TwoDAObject.normalizeValue(row.headtexvvve, "string", "") as string;
    head.headtexvve = TwoDAObject.normalizeValue(row.headtexvve, "string", "") as string;
    head.headtexve = TwoDAObject.normalizeValue(row.headtexve, "string", "") as string;
    head.headtexe = TwoDAObject.normalizeValue(row.headtexe, "string", "") as string;
    head.headtexg = TwoDAObject.normalizeValue(row.headtexg, "string", "") as string;
    head.headtexvg = TwoDAObject.normalizeValue(row.headtexvg, "string", "") as string;
    return head;
  }

}
