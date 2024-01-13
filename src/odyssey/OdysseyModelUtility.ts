import { BinaryReader } from "../BinaryReader";
import { SurfaceMaterial } from "../engine/SurfaceMaterial";
import { IOdysseyArrayDefinition } from "../interface/odyssey/IOdysseyArrayDefinition";

/**
 * OdysseyModelUtility class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelUtility.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelUtility {
  
  static SURFACEMATERIALS: SurfaceMaterial[] = [];

  static ReadArray(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = stream.readUInt32();
    }

    stream.position = posCache;
    return values;
  }

  static ReadArrayFloats(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = stream.readSingle();
    }

    stream.position = posCache;
    return values;
  }

  //Gets the Array Offset & Length
  static ReadArrayDefinition(stream: BinaryReader): IOdysseyArrayDefinition {
    return {
      offset: stream.readUInt32() & 0xFFFFFFFF, 
      count: stream.readUInt32() & 0xFFFFFFFF, 
      count2: stream.readUInt32() & 0xFFFFFFFF
    };
  }

  static ReadStrings(stream: BinaryReader, offsets: number[], offset: number) {
    let posCache = stream.position;
    let strings: string[] = [];

    for (let i = 0; i < offsets.length; i++){
      stream.position = offset + offsets[i];

      let str = "";
      let char;

      while ((char = stream.readChar()).charCodeAt(0) != 0)
        str = str + char;

      strings[i] = str;
    }

    stream.position = posCache;
    return strings;
  }
  
}