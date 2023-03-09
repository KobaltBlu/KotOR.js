/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { WalkmeshEdge } from ".";
import { BinaryReader } from "../BinaryReader";
import { OdysseyWalkMeshType } from "../enums/odyssey/OdysseyWalkMeshType";
import { OdysseyModelAABBNode } from "../interface/odyssey/OdysseyModelAABBNode";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleObject } from "../module";
import { OdysseyFace3 } from "../three/odyssey";
import { SurfaceMaterial } from "../engine/SurfaceMaterial";
import { TileColor } from "../engine/TileColor";

/* @file
 * The OdysseyWalkMesh is used for reading and handling the various walkmesh filetypes found in the game
 */

interface Perimeter {
  edge: number;
}

export class OdysseyWalkMesh {
  static SURFACEMATERIALS: SurfaceMaterial[] = [];
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
  facePlaneCoefficients: number[] = [];
  aabbNodes: OdysseyModelAABBNode[] = [];
  walkableFacesEdgesAdjacencyMatrix: number[][] = [];
  edges: { [key: string]: WalkmeshEdge } = {};
  edgeKeys: string[] = [];
  perimeters: Perimeter[] = [];
  edgeLines: any[] = [];
  wokReader: BinaryReader;
  walkableFacesEdgesAdjacencyMatrixDiff: number[][];
  matrixWorld: THREE.Matrix4;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  aabbGroup: THREE.Object3D;
  aabbRoot: OdysseyModelAABBNode;
  
  constructor( wokReader?: BinaryReader ){

    this.header = {
      walkMeshType: OdysseyWalkMeshType.NONE
    };
    
    this.rootNode = null;
    this.mesh = new THREE.Mesh();
    this.box = new THREE.Box3();
    this.mat4 = new THREE.Matrix4();
    this.edges = {};

    this.wokReader = wokReader;
    this.readBinary();
    this.wokReader = undefined;

    //Build Face Colors
    for (let i = 0, len = this.faces.length; i < len; i++){
      let face = this.faces[i];
      face.walkIndex = this.walkTypes[i];
      face.color = (OdysseyWalkMesh.TILECOLORS[this.walkTypes[i]] || OdysseyWalkMesh.TILECOLORS[0]).color.clone();
      face.surfacemat = OdysseyWalkMesh.SURFACEMATERIALS[face.walkIndex];
      face.triangle = new THREE.Triangle(
        this.vertices[face.a],
        this.vertices[face.b],
        this.vertices[face.c],
      );

      if(face.surfacemat == undefined){
        console.warn('OdysseyWalkMesh', 'Unknown surfacemat', face, OdysseyWalkMesh.SURFACEMATERIALS);
      }

      face.blocksLineOfSight = face.surfacemat.lineOfSight;
      face.walkCheck = face.surfacemat.walkCheck;

      //Is this face walkable
      if(face.surfacemat.walk){
        let walkIdx = this.walkableFaces.push(face) - 1;
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

      let edge1 = (i * 3) + 0;
      let edge2 = (i * 3) + 1;
      let edge3 = (i * 3) + 2;

      if(!face.adjacentWalkableFaces.a && typeof this.edges[edge1] != 'undefined'){
        face.adjacentWalkableFaces.a = this.edges[edge1];
        if(face.adjacentWalkableFaces.a instanceof WalkmeshEdge){
          //face.adjacentWalkableFaces.a.line = new THREE.Line3( this.vertices[face.a].clone(), this.vertices[face.b].clone() );
          face.adjacentWalkableFaces.a.face = face;
          face.adjacentWalkableFaces.a.index = 0;
          face.adjacentWalkableFaces.a.update();
        }
      }

      if(!face.adjacentWalkableFaces.b && typeof this.edges[edge2] != 'undefined'){
        face.adjacentWalkableFaces.b = this.edges[edge2];
        if(face.adjacentWalkableFaces.b instanceof WalkmeshEdge){
          //face.adjacentWalkableFaces.b.line = new THREE.Line3( this.vertices[face.b].clone(), this.vertices[face.c].clone() );
          face.adjacentWalkableFaces.b.face = face;
          face.adjacentWalkableFaces.b.index = 1;
          face.adjacentWalkableFaces.b.update();
        }
      }

      if(!face.adjacentWalkableFaces.c && typeof this.edges[edge3] != 'undefined'){
        face.adjacentWalkableFaces.c = this.edges[edge3];
        if(face.adjacentWalkableFaces.c instanceof WalkmeshEdge){
          //face.adjacentWalkableFaces.c.line = new THREE.Line3( this.vertices[face.c].clone(), this.vertices[face.a].clone() );
          face.adjacentWalkableFaces.c.face = face;
          face.adjacentWalkableFaces.c.index = 2;
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

      this.detectFacePerimiterLines(face);

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
      let node = this.aabbNodes[i];
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
    this.edgeKeys = Object.keys(this.edges);

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
    let edgeKeys = Object.keys(this.edges);
    for(let i = 0, len = edgeKeys.length; i < len; i++){
      this.edges[edgeKeys[i]].update();
    }
    
    //transform vertex positions
    for(let i = 0, len = this.vertices.length; i < len; i++){
      this.vertices[i].copy(this._vertices[i]);
      this.vertices[i].applyMatrix4(this.mat4);
    }
  }

  readBinary(){
    if(this.wokReader instanceof BinaryReader){
      this.header = this.readHeader();
      //READ Verticies
      this.wokReader.Seek(this.header.offsetToVertices);
      for (let i = 0; i < this.header.verticesCount; i++){
        this._vertices[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());
        this.vertices[i] = this._vertices[i].clone();
      }

      //READ Faces
      this.wokReader.Seek(this.header.offsetToFaces);
      for (let i = 0; i < this.header.facesCount; i++){
        this.faces[i] = new OdysseyFace3(this.wokReader.ReadInt32(), this.wokReader.ReadInt32(), this.wokReader.ReadInt32());
        this.faces[i].adjacentWalkableFaces = {
          a: undefined,
          b: undefined,
          c: undefined
        }
        this.faces[i].walkmesh = this;
      }

      //READ Walk Types
      this.wokReader.Seek(this.header.offsetToWalkTypes);
      for (let i = 0; i < this.header.facesCount; i++)
        this.walkTypes[i] = this.wokReader.ReadInt32();

      //READ Normals
      this.wokReader.Seek(this.header.offsetToNormalizedInvertedNormals);
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].normal = this.normals[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());

      //READ Face Plane Coefficients
      this.wokReader.Seek(this.header.offsetToFacePlanesCoefficien);
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].coeff = this.facePlaneCoefficients[i] = this.wokReader.ReadSingle();

      this.wokReader.Seek(this.header.offsetToAABBs);
      for (let i = 0; i < this.header.aabbCount; i++)
        this.aabbNodes[i] = this.readAABB();


      this.wokReader.Seek(this.header.offsetToWalkableFacesEdgesAdjacencyMatrix);
      this.walkableFacesEdgesAdjacencyMatrix = [];
      this.walkableFacesEdgesAdjacencyMatrixDiff = [];
      for (let i = 0; i < this.header.walkableFacesEdgesAdjacencyMatrixCount; i++){
        //Every array of 3 Int32's references the 3 walkable faces adjacent to it.
        //If the value is -1 then the adjacent face on that side is not walkable, and has a corresponding edge in the edge array.
        //If it is greater or equal to zero then it is an index into the this.faces array, after it is divided by 3 and floored.

        let adj1 = this.wokReader.ReadInt32();
        let adj2 = this.wokReader.ReadInt32();
        let adj3 = this.wokReader.ReadInt32();
                    
        let adj = [-1, -1, -1];
        let diff = [-1, -1, -1];

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

      this.wokReader.Seek(this.header.offsetToEdges);
      for (let i = 0; i < this.header.edgesCount; i++){
        let edge = this.edges[this.wokReader.ReadInt32()] = new WalkmeshEdge(this.wokReader.ReadInt32());
        edge.setWalkmesh(this);
      }

      this.wokReader.Seek(this.header.offsetToPerimeters);
      for (let i = 0; i < this.header.perimetersCount; i++){
        this.perimeters.push({
          edge: this.wokReader.ReadInt32()
        });
      }

    }
  }

  detectFacePerimiterLines( face: OdysseyFace3 ){
    if(this.header.walkMeshType == OdysseyWalkMeshType.NONE){
      let aEdge = true;
      let bEdge = true;
      let cEdge = true;

      for(let i = 0; i < this.faces.length; i++){
        let adjFace = this.faces[i];
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

      if(aEdge){
        this.generateFaceWalkmeshEdge(face, 0); 
      }

      if(bEdge){
        this.generateFaceWalkmeshEdge(face, 1); 
      }

      if(cEdge){
        this.generateFaceWalkmeshEdge(face, 2); 
      }
    }
  }

  generateFaceWalkmeshEdge(face: OdysseyFace3, index: number = 0){
    if(face){
      let edge = new WalkmeshEdge(-1);
      edge.setWalkmesh(this);
      edge.setSideIndex(index);
      edge.setFace(face);
      edge.update();
      this.edges[Object.keys(this.edges).length] = edge;
    }
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
    let aabb: OdysseyModelAABBNode = {
      type: '',
      box: new THREE.Box3(
        new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() - 10),
        new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() + 10)
      ),
      faceIdx: this.wokReader.ReadInt32(),
      face: undefined,
      unknownFixedAt4: this.wokReader.ReadInt32(),
      mostSignificantPlane: this.wokReader.ReadInt32(),
      leftNodeOffset: this.wokReader.ReadInt32(),
      rightNodeOffset: this.wokReader.ReadInt32()
    };
    aabb._box = aabb.box.clone();
    return aabb;
  }

  readHeader(){

    return {
      fileType: this.wokReader.ReadChars(4),
      version: this.wokReader.ReadChars(4),
      walkMeshType: this.wokReader.ReadUInt32(),
      reserved: this.wokReader.ReadBytes(48),
      position: new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle()),
      verticesCount: this.wokReader.ReadUInt32(),
      offsetToVertices: this.wokReader.ReadUInt32(),
      facesCount: this.wokReader.ReadUInt32(),
      offsetToFaces: this.wokReader.ReadUInt32(),
      offsetToWalkTypes: this.wokReader.ReadUInt32(),
      offsetToNormalizedInvertedNormals: this.wokReader.ReadUInt32(),
      offsetToFacePlanesCoefficien: this.wokReader.ReadUInt32(),
      aabbCount: this.wokReader.ReadUInt32(),
      offsetToAABBs: this.wokReader.ReadUInt32(),
      unknownEntry: this.wokReader.ReadUInt32(),
      walkableFacesEdgesAdjacencyMatrixCount: this.wokReader.ReadUInt32(),
      offsetToWalkableFacesEdgesAdjacencyMatrix: this.wokReader.ReadUInt32(),
      edgesCount: this.wokReader.ReadUInt32(),
      offsetToEdges: this.wokReader.ReadUInt32(),
      perimetersCount: this.wokReader.ReadUInt32(),
      offsetToPerimeters: this.wokReader.ReadUInt32()
    }

  }

  sign(p1: any, p2: any, p3: any){
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  pointInFace2d(pt: any, face: any){
    let v1 = this.vertices[face.a];
    let v2 = this.vertices[face.a];
    let v3 = this.vertices[face.a];

    let d1 = this.sign(pt, v1, v2);
    let d2 = this.sign(pt, v2, v3);
    let d3 = this.sign(pt, v3, v1);

    let has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    let has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(has_neg && has_pos);
  }

  isPointWalkable(point: any){
    for(let i = 0, len = this.walkableFaces.length; i < len; i++){
      if(this.pointInFace2d(point, this.walkableFaces[i])){
        return true;
      }
    }
    return false;
  }

  getNearestWalkablePoint(point: any){
    let nearest = Infinity;
    let nearest_point = undefined;
    let distance = 0;
    for(let i = 0, len = this.walkableFaces.length; i < len; i++){
      distance = point.distanceTo(this.walkableFaces[i].centroid);
      if(distance < nearest){
        nearest_point = this.walkableFaces[i].centroid;
        nearest = distance;
      }
    }
    return nearest_point;
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

  getAABBCollisionFaces(box = new THREE.Box3, node?: OdysseyModelAABBNode, collisions: any[] = []){

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
        let tileColor = tilecolor2DA.rows[i];
        OdysseyWalkMesh.TILECOLORS.push(
          TileColor.From2DA(tileColor)
        );
      }
    }
    
    const surfacemat2DA = TwoDAManager.datatables.get('surfacemat');
    if(surfacemat2DA){
      OdysseyWalkMesh.SURFACEMATERIALS = [];
      for(let i = 0, len = surfacemat2DA.RowCount; i < len; i++){
        OdysseyWalkMesh.SURFACEMATERIALS[i] = SurfaceMaterial.From2DA(surfacemat2DA.rows[i]);
      }
    }
  }

}
  