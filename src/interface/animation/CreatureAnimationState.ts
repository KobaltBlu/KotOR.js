import { ModuleCreatureAnimState } from "../../enums/module/ModuleCreatureAnimState";
import { TwoDAAnimation } from "../twoDA/TwoDAAnimation";

export interface CreatureAnimationState {
  index: ModuleCreatureAnimState;
  animation: TwoDAAnimation;
  started: boolean;
  speed: number;
}