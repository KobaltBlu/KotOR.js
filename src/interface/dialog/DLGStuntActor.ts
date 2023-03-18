import { ModuleObject} from "../../module";
import { OdysseyModelAnimation } from "../../odyssey";
import { OdysseyModel3D } from "../../three/odyssey";

export interface DLGStuntActor{
  participant: string;
  resref: string;
  model?: OdysseyModel3D;
  moduleObject?: ModuleObject;
  animations?: OdysseyModelAnimation[];
}