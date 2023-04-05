import { OdysseyModelAnimation } from "../../odyssey/OdysseyModelAnimation";
import { TwoDAAnimation } from "../twoDA/TwoDAAnimation";

export interface DialogAnimationState {
  animationIndex: number;
  animation: OdysseyModelAnimation;
  data: TwoDAAnimation,
  started: boolean;
}