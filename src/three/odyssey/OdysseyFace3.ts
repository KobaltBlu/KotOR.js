import * as THREE from "three";
import type { OdysseyWalkMesh } from "../../odyssey/OdysseyWalkMesh";
import type { SurfaceMaterial } from "../../engine/SurfaceMaterial";
import { IAdjacentWalkableFaces } from "../../interface/odyssey";

/**
 * OdysseyFace3 class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyFace3.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyFace3 {

	walkIndex:number = 0;
	coeff: number = 0;
	walkmesh: OdysseyWalkMesh;
	surfacemat: SurfaceMaterial;

	adjacent: number[] = [];
	adjacentDiff: number[] = [];

	blocksLineOfSight: boolean = false;
	walkCheck: boolean = false;

	triangle: THREE.Triangle;

	adjacentWalkableFaces: IAdjacentWalkableFaces = {
		a: undefined,
		b: undefined,
		c: undefined,
	};

	/**
	 * @param a Vertex A index.
	 * @param b Vertex B index.
	 * @param c Vertex C index.
	 * @param normal Face normal or array of vertex normals.
	 * @param color Face color or array of vertex colors.
	 * @param materialIndex Material index.
	 */
	constructor(
		a: number,
		b: number,
		c: number,
		normal?: THREE.Vector3,
		color?: THREE.Color,
		materialIndex?: number
	);

	constructor(
		a: number,
		b: number,
		c: number,
		normal?: THREE.Vector3,
		vertexColors?: THREE.Color[],
		materialIndex?: number
	);

	constructor(
		a: number,
		b: number,
		c: number,
		vertexNormals?: THREE.Vector3[],
		color?: THREE.Color,
		materialIndex?: number
	);

	constructor(
		a: number,
		b: number,
		c: number,
		vertexNormals?: THREE.Vector3|THREE.Vector3[],
		vertexColors?: THREE.Color|THREE.Color[],
		materialIndex?: number
	){
		this.a = a;
		this.b = b;
		this.c = c;
		this.materialIndex = materialIndex;
		if(Array.isArray(vertexNormals)){
			this.vertexNormals = vertexNormals;
		}else{
			this.normal = vertexNormals || new THREE.Vector3();
		}

		if(Array.isArray(vertexColors)){
			this.vertexColors = vertexColors;
		}else{
			this.color = vertexColors || new THREE.Color();
		}
  }

	/**
	 * Vertex A index.
	 */
	a: number;

	/**
	 * Vertex B index.
	 */
	b: number;

	/**
	 * Vertex C index.
	 */
	c: number;

	/**
	 * Face normal.
	 * @default new THREE.THREE.Vector3()
	 */
	normal: THREE.Vector3 = new THREE.Vector3();

	/**
	 * Array of 3 vertex normals.
	 * @default []
	 */
	vertexNormals: THREE.Vector3[];

	/**
	 * Face centroid
	 * @default []
	 */
	centroid: THREE.Vector3 = new THREE.Vector3();

	/**
	 * Face color.
	 * @default new THREE.Color()
	 */
	color: THREE.Color = new THREE.Color();

	/**
	 * Array of 3 vertex colors.
	 * @default []
	 */
	vertexColors: THREE.Color[];

	/**
	 * Material index (points to {@link Mesh.material}).
	 * @default 0
	 */
	materialIndex: number;

	perimeter = {
		a: false, b: false, c: false
	};

	pointInFace2d(pt: THREE.Vector3){
    let v1 = this.walkmesh.vertices[this.a];
    let v2 = this.walkmesh.vertices[this.b];
    let v3 = this.walkmesh.vertices[this.c];

    let d1 = this.sign(pt, v1, v2);
    let d2 = this.sign(pt, v2, v3);
    let d3 = this.sign(pt, v3, v1);

    let has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    let has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(has_neg && has_pos);
  }

	#tmpEdge = new THREE.Vector3();
	#tmpPointToStart = new THREE.Vector3();
	#tmpPointToEnd = new THREE.Vector3();

	pointIsOnEdge(point: THREE.Vector3, side: 'a'|'b'|'c') {
		const edgeStart = side == 'a' ? this.walkmesh.vertices[this.a] : 
			side == 'b' ? this.walkmesh.vertices[this.b] : this.walkmesh.vertices[this.c];
		const edgeEnd = side == 'a' ? this.walkmesh.vertices[this.b] : 
			side == 'b' ? this.walkmesh.vertices[this.c] : this.walkmesh.vertices[this.a];

    this.#tmpEdge.set(0, 0, 0).subVectors(edgeEnd, edgeStart);
    this.#tmpPointToStart.set(0, 0, 0).subVectors(point, edgeStart);
    this.#tmpPointToEnd.set(0, 0, 0).subVectors(point, edgeEnd);

    // Check if the point lies on the edge segment
    return (
			this.#tmpPointToStart.cross(this.#tmpEdge).length() < 1e-6 && // Point is collinear
			this.#tmpPointToStart.dot(this.#tmpEdge) >= 0 && // Point is not before edgeStart
			this.#tmpPointToEnd.dot(this.#tmpEdge) <= 0 // Point is not after edgeEnd
    );
	}

  sign(p1: any, p2: any, p3: any){
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

	clone(): this {
    return this;
  };

	copy( source: OdysseyFace3 ): this {
    return this;
  };

}