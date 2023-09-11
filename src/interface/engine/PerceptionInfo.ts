import type { ModuleObject } from "../../module";
import type { PerceptionType } from "../../enums/engine/PerceptionType";
//https://nwnlexicon.com/index.php?title=Perception

export interface PerceptionInfo {
  object: ModuleObject;
  objectId: number;
  data: number;
};