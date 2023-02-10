import type { ModuleObject, OdysseyModel3D } from "../../KotOR";

export interface DLGStuntActor{
  participant: string;
  resref: string;
  model?: OdysseyModel3D;
  moduleObject?: ModuleObject;
}