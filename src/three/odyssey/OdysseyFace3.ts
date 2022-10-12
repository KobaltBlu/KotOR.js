import * as THREE from "three";
export class OdysseyFace3 {

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
	normal: THREE.Vector3;

	/**
	 * Array of 3 vertex normals.
	 * @default []
	 */
	vertexNormals: THREE.Vector3[];

	/**
	 * Face centroid
	 * @default []
	 */
	centroid: THREE.Vector3;

	/**
	 * Face color.
	 * @default new THREE.Color()
	 */
	color: THREE.Color;

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

	clone(): this {
    return this;
  };
	copy( source: OdysseyFace3 ): this {
    return this;
  };

}