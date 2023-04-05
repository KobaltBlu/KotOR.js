import { TwoDAAnimation } from "../twoDA/TwoDAAnimation";

export interface OverlayAnimationState {
  animationIndex: number;
  animationName: string;
  animation: TwoDAAnimation;
  started: boolean;
  speed: number;
}