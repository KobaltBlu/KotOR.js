import * as THREE from "three";

import { SurfaceMaterial } from "@/engine/SurfaceMaterial";
import { TileColor } from "@/engine/TileColor";
import { OdysseyWalkMeshType } from "@/enums/odyssey/OdysseyWalkMeshType";
import { IPerimeter } from "@/interface/odyssey";
import { IOdysseyModelAABBNode } from "@/interface/odyssey/IOdysseyModelAABBNode";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { ModuleObject } from "@/module";
import { OdysseyModelUtility } from "@/odyssey/OdysseyModelUtility";
import { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";
import { OdysseyFace3 } from "@/three/odyssey/OdysseyFace3";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";

/**
 * OdysseyWalkMesh class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file OdysseyWalkMesh.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyWalkMesh {
  // static SURFACEMATERIALS: SurfaceMaterial[] = [];
  static TILECOLORS: TileColor[] = [];
  name: string;
  moduleObject: ModuleObject;
  header: any = { };
  walkableFaces: OdysseyFace3[] = [];
  walkableFacesWithEdge: OdysseyFace3[] = [];
  grassFaces: OdysseyFace3[] = [];
  rootNode: any;
  mesh: THREE.Mesh;
  box: THREE.Box3;
  mat4: THREE.Matrix4;
  faces: OdysseyFace3[] = [];
  vertices: THREE.Vector3[] = [];
  _vertices: THREE.Vector3[] = [];
  walkTypes: number[] = [];
  normals: THREE.Vector3[] = [];
  _normals: THREE.Vector3[] = [];
  facePlaneCoefficients: number[] = [];
  aabbNodes: IOdysseyModelAABBNode[] = [];
  walkableFacesEdgesAdjacencyMatrix: number[][] = [];
  edges: Map<number, WalkmeshEdge>;
  perimeters: IPerimeter[] = [];
  edgeLines: any[] = [];
  edgeNormalHelpers: THREE.Group;
  wokReader: BinaryReader;
  walkableFacesEdgesAdjacencyMatrixDiff: number[][];
  matrixWorld: THREE.Matrix4;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  aabbGroup: THREE.Object3D;
  aabbRoot: IOdysseyModelAABBNode;
  uuid: string = crypto.randomUUID();

  constructor( wokReader?: BinaryReader ){

    this.header = {
      walkMeshType: OdysseyWalkMeshType.NONE
    };

    this.rootNode = null;
    this.mesh = new THREE.Mesh();
    this.box = new THREE.Box3();
    this.mat4 = new THREE.Matrix4();
    this.edges = new Map<number, WalkmeshEdge>();

    this.wokReader = wokReader;
    this.readBinary();
    this.wokReader = undefined;

    //Build Face Colors
    for (let i = 0, len = this.faces.length; i < len; i++){
      const face = this.faces[i];
      face.materialIndex = this.walkTypes[i];
      face.walkIndex = face.materialIndex;
      face.color = (OdysseyWalkMesh.TILECOLORS[this.walkTypes[i]] || OdysseyWalkMesh.TILECOLORS[0]).color.clone();
      face.surfacemat = OdysseyModelUtility.SURFACEMATERIALS[face.walkIndex];
      face.triangle = new THREE.Triangle(
        this.vertices[face.a],
        this.vertices[face.b],
        this.vertices[face.c],
      );

      if(face.surfacemat == undefined){
        console.warn('OdysseyWalkMesh', 'Unknown surfacemat', face, OdysseyModelUtility.SURFACEMATERIALS);
      }

      face.blocksLineOfSight = face.surfacemat.lineOfSight;
      face.walkCheck = face.surfacemat.walkCheck;
      face.walk = face.surfacemat.walk;

      //Is this face walkable
      if(face.surfacemat.walk){
        const walkIdx = this.walkableFaces.push(face) - 1;
        face.adjacent = this.walkableFacesEdgesAdjacencyMatrix[walkIdx];
        face.adjacentDiff = this.walkableFacesEdgesAdjacencyMatrixDiff[walkIdx];
        face.adjacentWalkableFaces.a = this.faces[(face.adjacent || [] )[0]];
        face.adjacentWalkableFaces.b = this.faces[(face.adjacent || [] )[1]];
        face.adjacentWalkableFaces.c = this.faces[(face.adjacent || [] )[2]];

        if(face.adjacentWalkableFaces.a instanceof WalkmeshEdge ||
           face.adjacentWalkableFaces.b instanceof WalkmeshEdge ||
           face.adjacentWalkableFaces.c instanceof WalkmeshEdge){
          this.walkableFacesWithEdge.push(face);
        }
      }

      const edge1 = (i * 3) + 0;
      const edge2 = (i * 3) + 1;
      const edge3 = (i * 3) + 2;

      if(!face.adjacentWalkableFaces.a && this.edges.has(edge1)){
        face.adjacentWalkableFaces.a = this.edges.get(edge1);
        if(face.adjacentWalkableFaces.a instanceof WalkmeshEdge){
          face.adjacentWalkableFaces.a.index = edge1;
          face.adjacentWalkableFaces.a.face = face;
          face.adjacentWalkableFaces.a.side = 0;
          face.adjacentWalkableFaces.a.update();
        }
      }

      if(!face.adjacentWalkableFaces.b && this.edges.has(edge2)){
        face.adjacentWalkableFaces.b = this.edges.get(edge2);
        if(face.adjacentWalkableFaces.b instanceof WalkmeshEdge){
          face.adjacentWalkableFaces.b.index = edge2;
          face.adjacentWalkableFaces.b.face = face;
          face.adjacentWalkableFaces.b.side = 1;
          face.adjacentWalkableFaces.b.update();
        }
      }

      if(!face.adjacentWalkableFaces.c && this.edges.has(edge3)){
        face.adjacentWalkableFaces.c = this.edges.get(edge3);
        if(face.adjacentWalkableFaces.c instanceof WalkmeshEdge){
          face.adjacentWalkableFaces.c.index = edge3;
          face.adjacentWalkableFaces.c.face = face;
          face.adjacentWalkableFaces.c.side = 2;
          face.adjacentWalkableFaces.c.update();
        }
      }

      //Is this face grassy
      if(face.surfacemat.grass){
        this.grassFaces.push(face);
      }

      //Get centroid of the face
      face.centroid = new THREE.Vector3( 0, 0, 0 );
      if ( face instanceof OdysseyFace3 ) {
        face.centroid.add( this.vertices[ face.a ] );
        face.centroid.add( this.vertices[ face.b ] );
        face.centroid.add( this.vertices[ face.c ] );
        face.centroid.divideScalar( 3 );
      }

      const perimeter = this.detectFacePerimiterLines(face);
    }

    this.matrixWorld = new THREE.Matrix4();
    this.box = new THREE.Box3(new THREE.Vector3, new THREE.Vector3);
    //this.geometry.boundingBox = this.boundingBox;

    this.buildBufferedGeometry();

    // this.geometry.vertices = this.vertices;
    // this.geometry.faces = this.faces;

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.FrontSide
    });

    // this.geometry.verticesNeedUpdate = true;
    // this.geometry.normalsNeedUpdate = true;
    // this.geometry.uvsNeedUpdate = true;

    this.mesh = new THREE.Mesh( this.geometry , this.material );
    this.box.setFromObject(this.mesh);
    this.material.visible = false;
    this.mesh.userData.wok = this;

    this.aabbGroup = new THREE.Object3D;
    this.mesh.add(this.aabbGroup);

    for(let i = 0; i < this.aabbNodes.length; i++){
      const node = this.aabbNodes[i];
      //node.boxHelper = new THREE.Box3Helper( node.box, 0xffff00 );
      //this.aabbGroup.add( node.boxHelper );

      node.face = this.faces[node.faceIdx];
      node.leftNode = this.aabbNodes[node.leftNodeOffset];
      node.rightNode = this.aabbNodes[node.rightNodeOffset];

      if(node.face == undefined){
        node.type = 'node';
      }else{
        node.type = 'leaf';
      }

    }

    this.aabbRoot = this.aabbNodes[0];

  }

  buildBufferedGeometry(){
    this.geometry = new THREE.BufferGeometry();

    const vertices = this.faces.map( f => {
      return [
        this.vertices[f.a].x, this.vertices[f.a].y, this.vertices[f.a].z,
        this.vertices[f.b].x, this.vertices[f.b].y, this.vertices[f.b].z,
        this.vertices[f.c].x, this.vertices[f.c].y, this.vertices[f.c].z,
      ]
    }).flat();

    //Positions
    const vertices32 = new Float32Array( vertices );
    this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices32, 3 ) );

    const normals = this.faces.map( f => {
      return [ f.normal.x, f.normal.y, f.normal.z ]
    }).flat();

    //Normals
    const normals32 = new Float32Array( normals );
    this.geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals32, 3 ) );

    const colors = this.faces.map( f => {
      return [
        f.color.r, f.color.g, f.color.b,
        f.color.r, f.color.g, f.color.b,
        f.color.r, f.color.g, f.color.b,
      ]
    }).flat();

    //Color
    const colors32 = new Float32Array( colors );
    this.geometry.setAttribute( 'color', new THREE.BufferAttribute( colors32, 3 ) );
  }

  updateMatrix(){
    //updateMatrix
    this.edges.forEach( (edge) => {
      edge.update();
    });

    //transform vertex positions
    for(let i = 0, len = this.vertices.length; i < len; i++){
      this.vertices[i].copy(this._vertices[i]);
      this.vertices[i].applyMatrix4(this.mat4);
    }
    const normalMatrix = this.mat4.clone().setPosition(0, 0, 0);
    for(let i = 0, len = this.normals.length; i < len; i++){
      this.normals[i].copy(this._normals[i]);
      this.normals[i].applyMatrix4(normalMatrix);
    }
    for (let i = 0, len = this.faces.length; i < len; i++){
      const face = this.faces[i];
      //Get centroid of the face
      face.centroid.set(0, 0, 0);
      if ( face instanceof OdysseyFace3 ) {
        face.centroid.add( this.vertices[ face.a ] );
        face.centroid.add( this.vertices[ face.b ] );
        face.centroid.add( this.vertices[ face.c ] );
        face.centroid.divideScalar( 3 );
      }
    }

    //updateMatrix
    this.edges.forEach( (edge) => {
      edge.update();
    });
  }

  buildEdgeNormalHelpers(color: number = 0xff0000, maxLength: number = 0.5){
    if(this.edgeNormalHelpers){
      this.edgeNormalHelpers.removeFromParent();
      this.edgeNormalHelpers.traverse((obj: any) => {
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
      });
    }

    const helpers = new THREE.Group();
    for(const edge of this.edges.values()){
      if(!edge?.line || !edge?.normal) continue;
      const length = Math.min(maxLength, edge.line.distance() * 0.5);
      const arrow = new THREE.ArrowHelper(edge.normal, edge.center_point, length, color);
      helpers.add(arrow);
    }

    this.edgeNormalHelpers = helpers;
    this.mesh.add(this.edgeNormalHelpers);
  }

  readBinary(){
    if(this.wokReader instanceof BinaryReader){
      this.header = this.readHeader();
      //READ Verticies
      this.wokReader.seek(this.header.offsetToVertices);
      for (let i = 0; i < this.header.verticesCount; i++){
        this._vertices[i] = new THREE.Vector3(this.wokReader.readSingle(), this.wokReader.readSingle(), this.wokReader.readSingle());
        this.vertices[i] = this._vertices[i].clone();
      }

      //READ Faces
      this.wokReader.seek(this.header.offsetToFaces);
      for (let i = 0; i < this.header.facesCount; i++){
        this.faces[i] = new OdysseyFace3(this.wokReader.readInt32(), this.wokReader.readInt32(), this.wokReader.readInt32());
        this.faces[i].adjacentWalkableFaces = {
          a: undefined,
          b: undefined,
          c: undefined
        }
        this.faces[i].walkmesh = this;
      }

      //READ Walk Types
      this.wokReader.seek(this.header.offsetToWalkTypes);
      for (let i = 0; i < this.header.facesCount; i++)
        this.walkTypes[i] = this.wokReader.readInt32();

      //READ Normals
      this.wokReader.seek(this.header.offsetToNormalizedInvertedNormals);
      for (let i = 0; i < this.header.facesCount; i++){
        this.faces[i].normal = this.normals[i] = new THREE.Vector3(this.wokReader.readSingle(), this.wokReader.readSingle(), this.wokReader.readSingle());
        this._normals[i] = this.normals[i].clone();
      }

      //READ Face Plane Coefficients
      this.wokReader.seek(this.header.offsetToFacePlanesCoefficien);
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].coeff = this.facePlaneCoefficients[i] = this.wokReader.readSingle();

      this.wokReader.seek(this.header.offsetToAABBs);
      for (let i = 0; i < this.header.aabbCount; i++)
        this.aabbNodes[i] = this.readAABB();


      this.wokReader.seek(this.header.offsetToWalkableFacesEdgesAdjacencyMatrix);
      this.walkableFacesEdgesAdjacencyMatrix = [];
      this.walkableFacesEdgesAdjacencyMatrixDiff = [];
      for (let i = 0; i < this.header.walkableFacesEdgesAdjacencyMatrixCount; i++){
        //Every array of 3 Int32's references the 3 walkable faces adjacent to it.
        //If the value is -1 then the adjacent face on that side is not walkable, and has a corresponding edge in the edge array.
        //If it is greater or equal to zero then it is an index into the this.faces array, after it is divided by 3 and floored.

        const adj1 = this.wokReader.readInt32();
        const adj2 = this.wokReader.readInt32();
        const adj3 = this.wokReader.readInt32();

        const adj = [-1, -1, -1];
        const diff = [-1, -1, -1];

        if(adj1 >= 0){
          adj[0] = Math.floor(adj1/3);
          diff[0] = (adj1 - adj[0]);
        }

        if(adj2 >= 0){
          adj[1] = Math.floor(adj2/3);
          diff[1] = (adj1 - adj[1]);
        }

        if(adj3 >= 0){
          adj[2] = Math.floor(adj3/3);
          diff[2] = (adj1 - adj[2]);
        }

        this.walkableFacesEdgesAdjacencyMatrix.push(adj);
        this.walkableFacesEdgesAdjacencyMatrixDiff.push(diff);
      }

      this.wokReader.seek(this.header.offsetToEdges);
      for (let i = 0; i < this.header.edgesCount; i++){
        const index = this.wokReader.readInt32();
        const edge = new WalkmeshEdge(this.wokReader.readInt32());
        this.edges.set(index, edge);
        edge.setWalkmesh(this);
      }

      this.wokReader.seek(this.header.offsetToPerimeters);
      for (let i = 0; i < this.header.perimetersCount; i++){
        this.perimeters.push({
          edge: this.wokReader.readInt32()
        });
      }

    }
  }

  detectFacePerimiterLines( face: OdysseyFace3 ){
    if(this.header.walkMeshType != OdysseyWalkMeshType.NONE){
      return;
    }

    let aEdge = true;
    let bEdge = true;
    let cEdge = true;

    for(let i = 0; i < this.faces.length; i++){
      const adjFace = this.faces[i];
      if(adjFace == face)
        continue;

      for(let j = 0; j < 3; j++){
        if(j == 0 && aEdge){
          if( (face.a == adjFace.a && face.b == adjFace.b) || (face.a == adjFace.b && face.b == adjFace.a) ||
            (face.a == adjFace.b && face.b == adjFace.c) || (face.a == adjFace.c && face.b == adjFace.b) ||
            (face.a == adjFace.c && face.b == adjFace.a) || (face.a == adjFace.a && face.b == adjFace.c)){
            aEdge = false;
          }
        }else if(j == 1 && bEdge){
          if( (face.b == adjFace.a && face.c == adjFace.b) || (face.b == adjFace.b && face.c == adjFace.a) ||
            (face.b == adjFace.b && face.c == adjFace.c) || (face.b == adjFace.c && face.c == adjFace.b) ||
            (face.b == adjFace.c && face.c == adjFace.a) || (face.b == adjFace.a && face.c == adjFace.c)){
            bEdge = false;
          }
        }else if(j == 2 && cEdge){
          if( (face.c == adjFace.a && face.a == adjFace.b) || (face.c == adjFace.b && face.a == adjFace.a) ||
            (face.c == adjFace.b && face.a == adjFace.c) || (face.c == adjFace.c && face.a == adjFace.b) ||
            (face.c == adjFace.c && face.a == adjFace.a) || (face.c == adjFace.a && face.a == adjFace.c)){
            cEdge = false;
          }
        }
      }

    }

    return {
      a: aEdge ? this.generateFaceWalkmeshEdge(face, 0) : undefined,
      b: bEdge ? this.generateFaceWalkmeshEdge(face, 1) : undefined,
      c: cEdge ? this.generateFaceWalkmeshEdge(face, 2) : undefined,
    };
  }

  generateFaceWalkmeshEdge(face: OdysseyFace3, index: number = 0){
    if(!face){
      return;
    }
    const edge = new WalkmeshEdge(-1);
    edge.setWalkmesh(this);
    edge.setSide(index);
    edge.setFace(face);
    edge.update();
    edge.exportable = false;
    const f_idx = this.faces.indexOf(face);
    this.edges.set((f_idx * 3) + index, edge);
    return edge;
  }

  dispose(){

    if(this.mesh && this.mesh.parent)
      this.mesh.parent.remove(this.mesh);

    if(this.geometry){
      this.geometry.dispose();
    }

    if(this.material){
      this.material.dispose();
    }

  }

  readAABB(){
    const aabb: IOdysseyModelAABBNode = {
      type: '',
      box: new THREE.Box3(
        new THREE.Vector3(this.wokReader.readSingle(), this.wokReader.readSingle(), this.wokReader.readSingle()),
        new THREE.Vector3(this.wokReader.readSingle(), this.wokReader.readSingle(), this.wokReader.readSingle())
      ),
      faceIdx: this.wokReader.readInt32(),
      face: undefined,
      unknownFixedAt4: this.wokReader.readInt32(),
      mostSignificantPlane: this.wokReader.readInt32(),
      leftNodeOffset: this.wokReader.readInt32(),
      rightNodeOffset: this.wokReader.readInt32()
    };
    aabb._box = aabb.box.clone();
    return aabb;
  }

  readHeader(){

    const header = {
      fileType: this.wokReader.readChars(4),
      version: this.wokReader.readChars(4),
      walkMeshType: this.wokReader.readUInt32(),
      reserved: this.wokReader.readBytes(48),
      position: new THREE.Vector3(this.wokReader.readSingle(), this.wokReader.readSingle(), this.wokReader.readSingle()),
      verticesCount: this.wokReader.readUInt32(),
      offsetToVertices: this.wokReader.readUInt32(),
      facesCount: this.wokReader.readUInt32(),
      offsetToFaces: this.wokReader.readUInt32(),
      offsetToWalkTypes: this.wokReader.readUInt32(),
      offsetToNormalizedInvertedNormals: this.wokReader.readUInt32(),
      offsetToFacePlanesCoefficien: this.wokReader.readUInt32(),
      aabbCount: this.wokReader.readUInt32(),
      offsetToAABBs: this.wokReader.readUInt32(),
      unknownEntry: this.wokReader.readUInt32(),
      walkableFacesEdgesAdjacencyMatrixCount: this.wokReader.readUInt32(),
      offsetToWalkableFacesEdgesAdjacencyMatrix: this.wokReader.readUInt32(),
      edgesCount: this.wokReader.readUInt32(),
      offsetToEdges: this.wokReader.readUInt32(),
      perimetersCount: this.wokReader.readUInt32(),
      offsetToPerimeters: this.wokReader.readUInt32()
    };

    if (header.fileType !== 'BWM ') {
      throw new Error(`Invalid walkmesh file type: expected BWM , got ${header.fileType}`);
    }

    if (header.version !== 'V1.0') {
      throw new Error(`Invalid walkmesh version: expected V1.0, got ${header.version}`);
    }

    return header;

  }

  sign(p1: any, p2: any, p3: any){
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  pointInFace2d(pt: any, face: any){
    const v1 = this.vertices[face.a];
    const v2 = this.vertices[face.b];
    const v3 = this.vertices[face.c];

    const d1 = this.sign(pt, v1, v2);
    const d2 = this.sign(pt, v2, v3);
    const d3 = this.sign(pt, v3, v1);

    const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(has_neg && has_pos);
  }

  isPointWalkable(point: THREE.Vector3){
    for(let i = 0, len = this.walkableFaces.length; i < len; i++){
      if(this.walkableFaces[i].pointInFace2d(point)){
        return true;
      }
    }
    return false;
  }

  getNearestWalkablePoint(point: THREE.Vector3){
    let nearest = Infinity;
    const nearest_point = point.clone();
    let distance = 0;
    const target = new THREE.Vector3();
    for(let i = 0, len = this.walkableFaces.length; i < len; i++){
      this.walkableFaces[i].triangle.closestPointToPoint(point, target)
      distance = point.distanceTo(target);
      if(distance >= nearest)
        continue;

      nearest_point.copy(target);//this.walkableFaces[i].centroid;
      nearest = distance;
    }
    return nearest_point;
  }

  #tmpTriangle = new THREE.Triangle();
  #tmpVec3z = new THREE.Vector3();

  isPointInsideTriangle2d(point: THREE.Vector3, triangle: THREE.Triangle): boolean {
    this.#tmpVec3z.set(point.x, point.y, 0);
    this.#tmpTriangle.a.set(triangle.a.x, triangle.a.y, 0);
    this.#tmpTriangle.b.set(triangle.b.x, triangle.b.y, 0);
    this.#tmpTriangle.c.set(triangle.c.x, triangle.c.y, 0);

    return this.#tmpTriangle.containsPoint(this.#tmpVec3z);
  }

  //BSP Tree?
  //https://www.gamasutra.com/view/feature/131508/bsp_collision_detection_as_used_in_.php?print=1

  containsPointOrBox( box: THREE.Box3, pointOrBox: THREE.Box3 | THREE.Vector3 ){
    if(pointOrBox){
      if(pointOrBox instanceof THREE.Box3){
        return box.intersectsBox(pointOrBox) || box.containsBox(pointOrBox);
      }else if(pointOrBox instanceof THREE.Vector3){
        return box.containsPoint(pointOrBox);
      }
    }
    return false;
  }

  getAABBCollisionFaces(box = new THREE.Box3, node?: IOdysseyModelAABBNode, collisions: any[] = []){

    if(this.header.walkMeshType == OdysseyWalkMeshType.AABB){

      if(!this.aabbRoot){
        return this.faces;
      }

      if(node == undefined){
        node = this.aabbRoot;
        if(node){
          if(this.containsPointOrBox(node.box, box)){
            if(node.leftNode != undefined){
              this.getAABBCollisionFaces(box, node.leftNode, collisions)
            }

            if(node.rightNode != undefined){
              this.getAABBCollisionFaces(box, node.rightNode, collisions)
            }
          }

          if(node.faceIdx > -1)
            collisions.push(this.faces[node.faceIdx]);
        }

      }else{

        if(this.containsPointOrBox(node.box, box)){
          if(node.leftNode != undefined){
            this.getAABBCollisionFaces(box, node.leftNode, collisions)
          }

          if(node.rightNode != undefined){
            this.getAABBCollisionFaces(box, node.rightNode, collisions)
          }
        }

        if(node.faceIdx > -1)
          collisions.push(this.faces[node.faceIdx]);

      }

      return collisions;

    }else{
      if(this.containsPointOrBox(node.box, box)){
        return this.faces;
      }else{
        return [];
      }
    }

  }

  raycast(raycaster: THREE.Raycaster, faces: any[] = []): THREE.Intersection[] {
    let _intersects: THREE.Intersection[] = [];
    this.mesh.raycast(raycaster, _intersects);
    _intersects = _intersects.map<THREE.Intersection>( (face) => {
      const wokFace = this.faces[face.faceIndex];
      (face as any).walkIndex = wokFace.walkIndex;
      // (face as any).normal = wokFace.normal;
      (face as any).face = wokFace;
      return face;
    })
    return _intersects;
  }

  static Init(){
    OdysseyWalkMesh.TILECOLORS = [];
    const tilecolor2DA = TwoDAManager.datatables.get('tilecolor');
    if(tilecolor2DA){
      for(let i = 0; i < tilecolor2DA.RowCount; i++){
        const tileColor = tilecolor2DA.rows[i];
        OdysseyWalkMesh.TILECOLORS.push(
          TileColor.From2DA(tileColor)
        );
      }
    }

    const surfacemat2DA = TwoDAManager.datatables.get('surfacemat');
    if(surfacemat2DA){
      OdysseyModelUtility.SURFACEMATERIALS = [];
      for(let i = 0, len = surfacemat2DA.RowCount; i < len; i++){
        OdysseyModelUtility.SURFACEMATERIALS[i] = SurfaceMaterial.From2DA(surfacemat2DA.rows[i]);
      }
    }
  }

  getAdjacentFaces(faceIndex: number = 0): { a: OdysseyFace3, b: OdysseyFace3, c: OdysseyFace3 } {
    const face = this.faces[1];
    const vertIndexes = [face.a, face.b, face.c];
    const adjacent = this.faces.filter( (f) => {
      if(face != f){
        const _a = vertIndexes.indexOf(f.a) >= 0;
        const _b = vertIndexes.indexOf(f.b) >= 0;
        const _c = vertIndexes.indexOf(f.c) >= 0;

        const _sideA = (_a && _b);
        const _sideB = (_b && _c);
        const _sideC = (_c && _a);

        return _sideA || _sideB || _sideC;
      } return false;
    });
    return {
      a: adjacent.find( (f) => {
        const _a = vertIndexes.indexOf(f.a) >= 0;
        const _b = vertIndexes.indexOf(f.b) >= 0;

        const _sideA = (_a && _b);
        return _sideA;
      }),
      b: adjacent.find( (f) => {
        const _b = vertIndexes.indexOf(f.b) >= 0;
        const _c = vertIndexes.indexOf(f.c) >= 0;

        const _sideB = (_b && _c);
        return _sideB;
      }),
      c: adjacent.find( (f) => {
        const _c = vertIndexes.indexOf(f.c) >= 0;
        const _a = vertIndexes.indexOf(f.a) >= 0;

        const _sideC = (_c && _a);
        return _sideC;
      }),
    };
  }

  getAdjacentFaceByIndex(faceIndex: number = 0, side: 0 | 1 | 2 = 0): OdysseyFace3 {
    const adjacent = this.getAdjacentFaces(faceIndex);
    switch(side){
      case 0:
        return adjacent.a;
      case 1:
        return adjacent.b;
      case 2:
        return adjacent.c;
    }
  }

  /**
   * Set a face's walk index and update mesh color in real time (for editor painting).
   * Does not rebuild adjacency; call rebuild() before export if needed.
   */
  setFaceWalkIndex(faceIndex: number, walkIndex: number): void {
    if (faceIndex < 0 || faceIndex >= this.faces.length) return;
    const face = this.faces[faceIndex];
    this.walkTypes[faceIndex] = walkIndex;
    face.materialIndex = walkIndex;
    face.walkIndex = walkIndex;
    face.color = (OdysseyWalkMesh.TILECOLORS[walkIndex] || OdysseyWalkMesh.TILECOLORS[0])?.color?.clone() ?? new THREE.Color(0.5, 0.5, 0.5);
    face.surfacemat = OdysseyModelUtility.SURFACEMATERIALS[walkIndex];
    if (face.surfacemat) {
      face.blocksLineOfSight = face.surfacemat.lineOfSight;
      face.walkCheck = face.surfacemat.walkCheck;
      face.walk = face.surfacemat.walk;
    }
    const color = this.geometry.attributes.color as THREE.BufferAttribute;
    const index = faceIndex * 3;
    color.setX(index, face.color.r);
    color.setY(index, face.color.g);
    color.setZ(index, face.color.b);
    color.setX(index + 1, face.color.r);
    color.setY(index + 1, face.color.g);
    color.setZ(index + 1, face.color.b);
    color.setX(index + 2, face.color.r);
    color.setY(index + 2, face.color.g);
    color.setZ(index + 2, face.color.b);
    color.needsUpdate = true;
  }

  /**
   * Find a face that shares the given edge (two vertex indices).
   * Returns { faceIdx, edgeIndex } or null if no face shares the edge.
   */
  private findFaceSharingEdge(v1: number, v2: number, excludeFaceIdx: number): { faceIdx: number; edgeIndex: number } | null {
    const matchEdge = (a: number, b: number) =>
      (a === v1 && b === v2) || (a === v2 && b === v1);

    for (let i = 0; i < this.faces.length; i++) {
      if (i === excludeFaceIdx) continue;
      const f = this.faces[i];
      if (matchEdge(f.a, f.b)) return { faceIdx: i, edgeIndex: 0 };
      if (matchEdge(f.b, f.c)) return { faceIdx: i, edgeIndex: 1 };
      if (matchEdge(f.c, f.a)) return { faceIdx: i, edgeIndex: 2 };
    }
    return null;
  }

  /**
   * Fully rebuild all derived walkmesh data from vertices, faces, and walkTypes.
   * Call after structural edits (delete face/vertex, extrude, etc.).
   */
  rebuild(): void {
    // Ensure walkTypes is in sync with faces
    while (this.walkTypes.length < this.faces.length) {
      this.walkTypes.push(this.walkTypes[this.walkTypes.length - 1] ?? 0);
    }
    this.walkTypes.length = this.faces.length;

    // Update face properties from walkTypes
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      const walkIndex = this.walkTypes[i];
      face.materialIndex = walkIndex;
      face.walkIndex = walkIndex;
      face.color = (OdysseyWalkMesh.TILECOLORS[walkIndex] || OdysseyWalkMesh.TILECOLORS[0])?.color?.clone() ?? new THREE.Color(0.5, 0.5, 0.5);
      face.surfacemat = OdysseyModelUtility.SURFACEMATERIALS[walkIndex];
      if (face.surfacemat) {
        face.blocksLineOfSight = face.surfacemat.lineOfSight;
        face.walkCheck = face.surfacemat.walkCheck;
        face.walk = face.surfacemat.walk;
      }
    }

    // Compute normals and plane coefficients
    this.normals.length = 0;
    this.facePlaneCoefficients.length = 0;
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      const v1 = this.vertices[face.a];
      const v2 = this.vertices[face.b];
      const v3 = this.vertices[face.c];
      const cb = v3.clone().sub(v2);
      const ab = v1.clone().sub(v2);
      cb.cross(ab);
      face.normal.copy(cb).normalize();
      face.coeff = -((v1.x * face.normal.x) + (v1.y * face.normal.y) + (v1.z * face.normal.z));
      this.normals.push(face.normal.clone());
      this.facePlaneCoefficients.push(face.coeff);
    }
    this._normals = this.normals.map((n) => n.clone());
    this._vertices = this.vertices.map((v) => v.clone());

    // Update face triangles and centroids
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      face.triangle = new THREE.Triangle(
        this.vertices[face.a],
        this.vertices[face.b],
        this.vertices[face.c],
      );
      face.centroid ??= new THREE.Vector3(0, 0, 0);
      face.centroid.set(0, 0, 0).add(this.vertices[face.a]).add(this.vertices[face.b]).add(this.vertices[face.c]).divideScalar(3);
      face.adjacentWalkableFaces ??= { a: undefined, b: undefined, c: undefined };
      face.adjacentWalkableFaces.a = undefined;
      face.adjacentWalkableFaces.b = undefined;
      face.adjacentWalkableFaces.c = undefined;
    }

    // Build walkable faces list
    this.walkableFaces = this.faces.filter((f) => f.surfacemat?.walk);
    this.walkableFacesWithEdge = [];
    this.grassFaces = this.faces.filter((f) => f.surfacemat?.grass);

    // Preserve edge transitions before clearing (keyed by vertex indices so they survive face reindexing)
    const getEdgeVertices = (f: OdysseyFace3, side: 0 | 1 | 2): [number, number] => {
      if (side === 0) return [f.a, f.b];
      if (side === 1) return [f.b, f.c];
      return [f.c, f.a];
    };
    const edgeKey = (v1: number, v2: number) => `${Math.min(v1, v2)}_${Math.max(v1, v2)}`;
    const transitionByEdge = new Map<string, number>();
    for (const [index, edge] of this.edges) {
      const faceIdx = Math.floor(index / 3);
      const side = index % 3;
      const face = this.faces[faceIdx];
      if (face) {
        const [v1, v2] = getEdgeVertices(face, side as 0 | 1 | 2);
        transitionByEdge.set(edgeKey(v1, v2), edge.transition);
      }
    }

    // Clear and rebuild adjacency matrix and edges
    this.walkableFacesEdgesAdjacencyMatrix = [];
    this.walkableFacesEdgesAdjacencyMatrixDiff = [];
    this.edges.clear();

    for (let i = 0; i < this.walkableFaces.length; i++) {
      const face = this.walkableFaces[i];
      const faceIdx = this.faces.indexOf(face);
      const adj: number[] = [-1, -1, -1];
      const diff: number[] = [-1, -1, -1];

      for (let side = 0; side < 3; side++) {
        const [v1, v2] = getEdgeVertices(face, side as 0 | 1 | 2);
        const shared = this.findFaceSharingEdge(v1, v2, faceIdx);
        if (shared) {
          const adjFace = this.faces[shared.faceIdx];
          if (adjFace.surfacemat?.walk) {
            adj[side] = shared.faceIdx;
            diff[side] = shared.edgeIndex;
          }
        }
        if (adj[side] < 0) {
          const transition = transitionByEdge.get(edgeKey(v1, v2)) ?? -1;
          const edge = new WalkmeshEdge(transition);
          edge.setWalkmesh(this);
          edge.setSide(side);
          edge.setFace(face);
          edge.index = faceIdx * 3 + side;
          edge.update();
          edge.exportable = true;
          const edgeIndex = faceIdx * 3 + side;
          this.edges.set(edgeIndex, edge);
          face.adjacentWalkableFaces[side === 0 ? 'a' : side === 1 ? 'b' : 'c'] = edge;
        }
      }

      this.walkableFacesEdgesAdjacencyMatrix.push(adj);
      this.walkableFacesEdgesAdjacencyMatrixDiff.push(diff);
    }

    // Wire up face.adjacent, face.adjacentDiff, and adjacentWalkableFaces for walkable faces
    for (let i = 0; i < this.walkableFaces.length; i++) {
      const face = this.walkableFaces[i];
      face.adjacent = this.walkableFacesEdgesAdjacencyMatrix[i];
      face.adjacentDiff = this.walkableFacesEdgesAdjacencyMatrixDiff[i];
      face.adjacentWalkableFaces.a = face.adjacent[0] >= 0 ? this.faces[face.adjacent[0]] : face.adjacentWalkableFaces.a;
      face.adjacentWalkableFaces.b = face.adjacent[1] >= 0 ? this.faces[face.adjacent[1]] : face.adjacentWalkableFaces.b;
      face.adjacentWalkableFaces.c = face.adjacent[2] >= 0 ? this.faces[face.adjacent[2]] : face.adjacentWalkableFaces.c;
      if (
        face.adjacentWalkableFaces.a instanceof WalkmeshEdge ||
        face.adjacentWalkableFaces.b instanceof WalkmeshEdge ||
        face.adjacentWalkableFaces.c instanceof WalkmeshEdge
      ) {
        this.walkableFacesWithEdge.push(face);
      }
    }

    // Attach edges to faces that reference them
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      for (let side = 0; side < 3; side++) {
        const edgeIndex = i * 3 + side;
        const edge = this.edges.get(edgeIndex);
        if (edge && !face.adjacentWalkableFaces[side === 0 ? 'a' : side === 1 ? 'b' : 'c']) {
          face.adjacentWalkableFaces[side === 0 ? 'a' : side === 1 ? 'b' : 'c'] = edge;
          edge.index = edgeIndex;
          edge.face = face;
          edge.side = side;
          edge.update();
        }
      }
    }

    // Rebuild AABB tree
    this.buildAABBTree();

    this.buildBufferedGeometry();
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      this.mesh.geometry = this.geometry;
      this.box.setFromObject(this.mesh);
    }
  }

  /**
   * Build AABB tree for spatial queries. Uses top-down median split along longest axis.
   * Aligned with KAurora: unknownFixedAt4=4, mostSignificantPlane=0, ±0.01 box expansion,
   * median split at floor(n/2)-1, walkable faces first.
   */
  private buildAABBTree(): void {
    if (this.faces.length === 0) {
      this.aabbNodes = [];
      this.aabbRoot = undefined;
      return;
    }

    const getFaceBox = (faceIdx: number): THREE.Box3 => {
      const face = this.faces[faceIdx];
      const box = new THREE.Box3();
      box.setFromPoints([
        this.vertices[face.a].clone(),
        this.vertices[face.b].clone(),
        this.vertices[face.c].clone(),
      ]);
      return box;
    };

    type AABBNodeData = {
      box: THREE.Box3;
      faceIdx: number;
      mostSignificantPlane: number;
      left?: AABBNodeData;
      right?: AABBNodeData;
    };

    const buildNode = (faceIndices: number[]): AABBNodeData => {
      const box = new THREE.Box3();
      for (const fi of faceIndices) {
        box.union(getFaceBox(fi));
      }
      box.min.subScalar(0.01);
      box.max.addScalar(0.01);

      if (faceIndices.length === 1) {
        return {
          box,
          faceIdx: faceIndices[0],
          mostSignificantPlane: 0,
        };
      }

      const size = box.getSize(new THREE.Vector3());
      const axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
      const getCentroid = (fi: number) => {
        const f = this.faces[fi];
        const c = this.vertices[f.a].clone().add(this.vertices[f.b]).add(this.vertices[f.c]).divideScalar(3);
        return axis === 0 ? c.x : axis === 1 ? c.y : c.z;
      };
      faceIndices.sort((a, b) => getCentroid(a) - getCentroid(b));
      const mid = Math.max(0, Math.floor(faceIndices.length / 2) - 1);
      const leftIndices = faceIndices.slice(0, mid + 1);
      const rightIndices = faceIndices.slice(mid + 1);

      const leftNode = buildNode(leftIndices);
      const rightNode = buildNode(rightIndices);

      return {
        box,
        faceIdx: -1,
        mostSignificantPlane: 0,
        left: leftNode,
        right: rightNode,
      };
    };

    const faceIndices = this.faces
      .map((_, i) => i)
      .sort((a, b) => {
        const aWalk = this.faces[a].surfacemat?.walk ? 1 : 0;
        const bWalk = this.faces[b].surfacemat?.walk ? 1 : 0;
        return bWalk - aWalk;
      });
    const root = buildNode(faceIndices);

    const countNodes = (n: AABBNodeData): number =>
      1 + (n.left ? countNodes(n.left) : 0) + (n.right ? countNodes(n.right) : 0);

    const flatten = (n: AABBNodeData, offset: number): number => {
      const leftCount = n.left ? countNodes(n.left) : 0;
      const leftOffset = n.left ? offset + 1 : -1;
      const rightOffset = n.right ? offset + 1 + leftCount : -1;

      const node: IOdysseyModelAABBNode = {
        type: n.faceIdx >= 0 ? 'leaf' : 'node',
        box: n.box.clone(),
        faceIdx: n.faceIdx,
        mostSignificantPlane: n.mostSignificantPlane,
        leftNodeOffset: leftOffset,
        rightNodeOffset: rightOffset,
        face: n.faceIdx >= 0 ? this.faces[n.faceIdx] : undefined,
        unknownFixedAt4: 4,
      };
      this.aabbNodes[offset] = node;

      let nextOffset = offset + 1;
      if (n.left) nextOffset = flatten(n.left, nextOffset);
      if (n.right) nextOffset = flatten(n.right, nextOffset);

      return nextOffset;
    };

    this.aabbNodes = new Array(countNodes(root));
    flatten(root, 0);

    for (let i = 0; i < this.aabbNodes.length; i++) {
      const node = this.aabbNodes[i];
      node.leftNode = node.leftNodeOffset >= 0 ? this.aabbNodes[node.leftNodeOffset] : undefined;
      node.rightNode = node.rightNodeOffset >= 0 ? this.aabbNodes[node.rightNodeOffset] : undefined;
    }

    this.aabbRoot = this.aabbNodes[0];
  }

  buildPerimeters(){
    const edges: WalkmeshEdge[] = this.walkableFaces.reduce( (acc: WalkmeshEdge[], c: OdysseyFace3) => {
      if(c.adjacentWalkableFaces.a instanceof WalkmeshEdge) acc.push(c.adjacentWalkableFaces.a);
      if(c.adjacentWalkableFaces.b instanceof WalkmeshEdge) acc.push(c.adjacentWalkableFaces.b);
      if(c.adjacentWalkableFaces.c instanceof WalkmeshEdge) acc.push(c.adjacentWalkableFaces.c);
      return acc;
    }, [] as WalkmeshEdge[]);

    const perimeters: {
      closed: boolean;
      start: number;
      next: number;
      edges: WalkmeshEdge[];
    }[] = [];

    let current_perimeter: {
      closed: boolean;
      start: number;
      next: number;
      edges: WalkmeshEdge[];
    };

    const start_perimeter = () => {
      if(edges.length){
        const edge: WalkmeshEdge = edges.shift();
        return {
          closed: false,
          start: edge.vertIdx1,
          next: edge.vertIdx2,
          edges: [edge]
        }
      }
    };

    while(edges.length){
      if(!current_perimeter){
        console.log('Walkmesh perimeter start...');
        current_perimeter = start_perimeter();
        perimeters.push(current_perimeter);
      }

      if(current_perimeter){
        if(current_perimeter.next == current_perimeter.start){
          console.log('Walkmesh perimeter end found! Closing perimeter...');
          current_perimeter.closed = true;
          current_perimeter = undefined;
          continue;
        }

        //Find next perimeter edge
        const next_idx = edges.findIndex( (n_edge) => n_edge.vertIdx1 == current_perimeter.next );
        if(next_idx >= 0){
          const n_edge = edges.splice(next_idx, 1)[0];
          current_perimeter.edges.push(n_edge);
          current_perimeter.next = n_edge.vertIdx2;
          continue;
        }else{
          console.warn('Walkmesh edge perimeter open');
          current_perimeter = undefined;
        }

      }
    }

    console.log('perimeters', perimeters);
    return perimeters;
  }

  public getMinZ(){
    const minZ = this.vertices.reduce((minZ, vec) => {
      return vec.z < minZ ? vec.z : minZ;
    }, Infinity);
    return isFinite(minZ) ? minZ : 0;
  }

  public getBoundingSize(){
    return this.box.getSize(new THREE.Vector3());
  }

  public toExportBuffer(){

    this.rebuild();

    const perimeters = this.buildPerimeters();
    const edgesCount = perimeters.reduce((acc, p) => acc + p.edges.length, 0);

    const header_size     = 136;

    const vertices_offset = header_size;
    const vertices_size   = 12 * this.vertices.length;

    const faces_offset = vertices_offset + vertices_size;
    const faces_size   = 12 * this.faces.length;

    const walkTypes_offset = faces_offset + faces_size;
    const walkTypes_size   = 4 * this.faces.length;

    const normals_offset  = walkTypes_offset + walkTypes_size;
    const normals_size    = 12 * this.faces.length;

    const planeCoeff_offset = normals_offset + normals_size;
    const planeCoeff_size   = 4 * this.faces.length;

    const aabb_offset = planeCoeff_offset + planeCoeff_size;
    const aabb_size   = 44 * this.aabbNodes.length;

    const adjacent_offset = aabb_offset + aabb_size;
    const adjacent_size   = 12 * this.walkableFaces.length;

    const edge_offset = adjacent_offset + adjacent_size;
    const edge_size   = 8 * edgesCount;

    const perimeter_offset  = edge_offset + edge_size;
    const perimeter_size    = 4 * perimeters.length;

    const EOF = perimeter_offset + perimeter_size;

    const bw = new BinaryWriter(new Uint8Array(EOF));

    //--------//
    // HEADER
    //--------//

    bw.writeChars(this.header.fileType);
    bw.writeChars(this.header.version);
    bw.writeUInt32(this.header.walkMeshType);
    bw.writeBytes(new Uint8Array(48));
    bw.writeSingle(this.header.position.x);
    bw.writeSingle(this.header.position.y);
    bw.writeSingle(this.header.position.z);

    //verts
    bw.writeUInt32(this.vertices.length);
    bw.writeUInt32(vertices_offset);

    //faces
    bw.writeUInt32(this.faces.length);
    bw.writeUInt32(faces_offset);

    //offsetToWalkTypes
    bw.writeUInt32(walkTypes_offset);

    //offsetToNormalizedInvertedNormals
    bw.writeUInt32(normals_offset); //96

    //offsetToFacePlanesCoefficien
    bw.writeUInt32(planeCoeff_offset);

    //aabb
    bw.writeUInt32(this.aabbNodes.length);
    bw.writeUInt32(aabb_offset); //108

    //unknownEntry
    bw.writeUInt32(0); //112

    //walkable adjacent matrix
    bw.writeUInt32(this.walkableFacesEdgesAdjacencyMatrix.length); //116
    bw.writeUInt32(adjacent_offset);

    //edges
    bw.writeUInt32(edgesCount);
    bw.writeUInt32(edge_offset);

    //perimeters
    bw.writeUInt32(perimeters.length);
    bw.writeUInt32(perimeter_offset);

    //------//
    // DATA
    //------//

    //vertices
    for(let i = 0; i < this.vertices.length; i++){
      const vertex = this.vertices[i];
      bw.writeSingle(vertex.x);
      bw.writeSingle(vertex.y);
      bw.writeSingle(vertex.z);
    }

    //faces
    for(let i = 0; i < this.faces.length; i++){
      const face = this.faces[i];
      bw.writeInt32(face.a);
      bw.writeInt32(face.b);
      bw.writeInt32(face.c);
    }

    //walkIndexes
    for(let i = 0; i < this.faces.length; i++){
      const face = this.faces[i];
      bw.writeInt32(face.walkIndex);
    }

    //normals
    for(let i = 0; i < this.faces.length; i++){
      const face = this.faces[i];
      bw.writeSingle(face.normal.x);
      bw.writeSingle(face.normal.y);
      bw.writeSingle(face.normal.z);
    }

    //face plane coeff
    for(let i = 0; i < this.faces.length; i++){
      const face = this.faces[i];
      bw.writeSingle(face.coeff);
    }

    //aabb
    for(let i = 0; i < this.aabbNodes.length; i++){
      const aabb = this.aabbNodes[i];
      bw.writeSingle(aabb.box.min.x);
      bw.writeSingle(aabb.box.min.y);
      bw.writeSingle(aabb.box.min.z);
      bw.writeSingle(aabb.box.max.x);
      bw.writeSingle(aabb.box.max.y);
      bw.writeSingle(aabb.box.max.z);
      bw.writeInt32(aabb.faceIdx);
      bw.writeInt32(aabb.unknownFixedAt4);
      bw.writeInt32(aabb.mostSignificantPlane);
      bw.writeInt32(aabb.leftNodeOffset);
      bw.writeInt32(aabb.rightNodeOffset);
    }

    //walkable face edge adjacency matrix
    for(let i = 0; i < this.walkableFacesEdgesAdjacencyMatrix.length; i++){
      const adj = this.walkableFacesEdgesAdjacencyMatrix[i];

      if(adj[0] >= 0){
        const face = this.faces[adj[0]];
        const currentFaceIdx = this.faces.indexOf(this.walkableFaces[i]);
        const adjacentIndex = face.adjacent.indexOf(currentFaceIdx);
        bw.writeInt32((adj[0] * 3) + (adjacentIndex >= 0 ? adjacentIndex : 0));
      }else{ bw.writeInt32(-1); }

      if(adj[1] >= 0){
        const face = this.faces[adj[1]];
        const currentFaceIdx = this.faces.indexOf(this.walkableFaces[i]);
        const adjacentIndex = face.adjacent.indexOf(currentFaceIdx);
        bw.writeInt32((adj[1] * 3) + (adjacentIndex >= 0 ? adjacentIndex : 0));
      }else{ bw.writeInt32(-1); }

      if(adj[2] >= 0){
        const face = this.faces[adj[2]];
        const currentFaceIdx = this.faces.indexOf(this.walkableFaces[i]);
        const adjacentIndex = face.adjacent.indexOf(currentFaceIdx);
        bw.writeInt32((adj[2] * 3) + (adjacentIndex >= 0 ? adjacentIndex : 0));
      }else{ bw.writeInt32(-1); }
    }

    //edges
    for(let i = 0; i < perimeters.length; i++){
      const perimeter = perimeters[i];
      for(let j = 0; j < perimeter.edges.length; j++){
        const edge = perimeter.edges[j];
        bw.writeInt32(edge.index);
        bw.writeInt32(edge.transition);
      }
    }

    //perimeters
    let offset = 0;
    for(let i = 0; i < perimeters.length; i++){
      const perimeter = perimeters[i];
      offset += perimeter.edges.length;
      bw.writeInt32(offset);
    }

    return bw.buffer;
  }

}
