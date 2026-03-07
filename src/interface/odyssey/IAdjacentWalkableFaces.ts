import { WalkmeshEdge } from "../../odyssey/WalkmeshEdge";
import { OdysseyFace3 } from "../../three/odyssey";

export interface IAdjacentWalkableFaces {
	a: OdysseyFace3|WalkmeshEdge;
	b: OdysseyFace3|WalkmeshEdge;
	c: OdysseyFace3|WalkmeshEdge;
}