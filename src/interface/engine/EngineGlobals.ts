import EngineLocation from "../../engine/EngineLocation";

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

export interface EngineGlobals {
  Boolean   : Map<string, EngineGlobalBoolean>; 
  Number    : Map<string, EngineGlobalNumber>; 
  String    : Map<string, EngineGlobalString>; 
  Location  : Map<string, EngineGlobalLocation>;
}