import { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import { OdysseyFace3 } from "@engine/render/three/odyssey";

export interface IAdjacentWalkableFaces {
	a: OdysseyFace3|WalkmeshEdge;
	b: OdysseyFace3|WalkmeshEdge;
	c: OdysseyFace3|WalkmeshEdge;
}