import { WalkmeshEdge } from "./WalkmeshEdge";

export class WalkmeshPerimeter {
  closed: boolean = false;
  start: number = -1;
  next: number = -1;
  edges: WalkmeshEdge[] = [];

  constructor(){

  }

}