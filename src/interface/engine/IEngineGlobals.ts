import type EngineLocation from "../../engine/EngineLocation";

export interface EngineGlobalBoolean {
  name: string;
  value: boolean;
}

export interface EngineGlobalNumber {
  name: string;
  value: number;
}

export interface EngineGlobalString {
  name: string;
  value: string;
}

export interface EngineGlobalLocation {
  name: string;
  value: EngineLocation;
}

/**
 * IEngineGlobals interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IEngineGlobals.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IEngineGlobals {
  Boolean   : Map<string, EngineGlobalBoolean>; 
  Number    : Map<string, EngineGlobalNumber>; 
  String    : Map<string, EngineGlobalString>; 
  Location  : Map<string, EngineGlobalLocation>;
}