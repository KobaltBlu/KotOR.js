import * as THREE from "three";
import { ResourceLoader } from "../loaders";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameState } from "../GameState";
import { PathPoint } from "../engine/pathfinding/PathPoint";
import { ComputedPath } from "../engine/pathfinding/ComputedPath";
import { IClosestPathPointData } from "../interface/engine/pathfinding/IClosestPathPointData";
import type { ModuleArea } from "./ModuleArea";
import { Utility } from "../utility/Utility";
import type { WalkmeshEdge } from "../odyssey/WalkmeshEdge";
import type { ModuleObject } from "./ModuleObject";
import { EngineDebugType } from "../enums";

/**
* ModulePath class.
* 
* Class representing all of the points and connections fro pathfinding in a module area.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModulePath.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModulePath {
  area: ModuleArea;
  _tmpVector: THREE.Vector3;
  points: PathPoint[];
  template: GFFObject;
  name: string;
  initialized: boolean;

  walkEdges: WalkmeshEdge[] = [];

  pointCount: number = 0;
  connectionCount: number = 0;

  helperColors: THREE.Float32BufferAttribute;
  helperPositions: THREE.Float32BufferAttribute;
  helperGeometry = new THREE.BufferGeometry();
  helperMaterial = new THREE.LineBasicMaterial({
    color: 0xFFFFFF,
    vertexColors: true
  });
  helperMesh: THREE.LineSegments;

  constructor(area: ModuleArea){
    this._tmpVector = new THREE.Vector3(0, 0, 0);
    this.points = [];
    this.template = new GFFObject();
    this.area = area;
    this.name = area.name;
  }

  async load(){
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['pth'], this.name);
    if(buffer){
      this.template = new GFFObject(buffer);
    }else{
      console.error('Failed to load ModulePath template');
    }

    if(this.template instanceof GFFObject){
      this.initProperties();
    }
    return this;
  }

  initProperties(){
    this.initialized = true;
    if(!(this.template instanceof GFFObject)){
      return;
    }
    
    /**
     * Parse the Path Points
     */
    if(this.template.RootNode.hasField('Path_Points')){
      const pathPoints = this.template.getFieldByLabel('Path_Points').getChildStructs();
      this.pointCount = pathPoints.length;
      for(let i = 0, len = pathPoints.length; i < len; i++){
        this.points[i] = PathPoint.FromGFFStruct(pathPoints[i]);
        this.points[i].id = i;
        this.points[i].setArea(this.area);
      }
    }

    /**
     * Parse the Path Connections
     */
    if(this.template.RootNode.hasField('Path_Conections')){
      const pathConnections = this.template.getFieldByLabel('Path_Conections').getChildStructs();
      this.connectionCount = pathConnections.length;
      for(let i = 0, len = this.points.length; i < len; i++){
        const point = this.points[i];
        if(!point.num_connections) continue;
        
        let connIdx = point.first_connection;
        for(let j = 0; j < point.num_connections; j++){
          const pointIdx = pathConnections[connIdx + j].getFieldByLabel('Destination').getValue();
          point.addConnection(this.points[pointIdx]);
        }
      }
    }

    this.connectionCount = this.points.reduce((sum, p) => {
      return sum + p.connections.length;
    }, 0);

    try{
      this.generatePathHelper();
    }catch(e){
      console.error(e);
    }

    this.setPathHelpersVisibility(GameState.GetDebugState(EngineDebugType.PATH_FINDING));
  }

  /**
   * Build line segments for the visual helper geometry
   */
  generatePathHelper(){
    const numPoints = this.points.length;
    const pointDataSize = 6;
    const connDataSize = 6;
    const bufferSize = (this.pointCount * pointDataSize) + (this.connectionCount * connDataSize);

    const pointDataStart = 0;
    let connectionIndexStart = (numPoints * 2);

    if(!this.helperColors){
      this.helperColors = new THREE.Float32BufferAttribute( (new Array(bufferSize)).fill(0), 3 );
    }

    if(!this.helperPositions){
      this.helperPositions = new THREE.Float32BufferAttribute( (new Array(bufferSize)).fill(0), 3 );
    }

    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];

      const idx = i * 2;
      const idx2 = idx + 1;

      this.helperPositions.setX(idx, point.vector.x);
      this.helperPositions.setY(idx, point.vector.y);
      this.helperPositions.setZ(idx, point.nearestWalkableVector.z);
      
      this.helperPositions.setX(idx2, point.vector.x);
      this.helperPositions.setY(idx2, point.vector.y);
      this.helperPositions.setZ(idx2, point.nearestWalkableVector.z + 0.5);
      this.helperPositions.needsUpdate = true;

      this.helperColors.setX(idx, 1);
      this.helperColors.setY(idx, 0);
      this.helperColors.setZ(idx, 1);

      this.helperColors.setX(idx2, 0);
      this.helperColors.setY(idx2, 0);
      this.helperColors.setZ(idx2, 1);
      this.helperColors.needsUpdate = true;

      for(let j = 0; j < point.connections.length; j++){
        const cPoint = point.connections[j];
        const idx3 = connectionIndexStart;
        const idx4 = idx3 + 1;

        this.helperPositions.setX(idx3, point.vector.x);
        this.helperPositions.setY(idx3, point.vector.y);
        this.helperPositions.setZ(idx3, point.nearestWalkableVector.z + 0.5);
        
        this.helperPositions.setX(idx4, cPoint.vector.x);
        this.helperPositions.setY(idx4, cPoint.vector.y);
        this.helperPositions.setZ(idx4, cPoint.nearestWalkableVector.z + 0.5);
        this.helperPositions.needsUpdate = true;
  
        this.helperColors.setX(idx3, 0);
        this.helperColors.setY(idx3, 0);
        this.helperColors.setZ(idx3, 1);
  
        this.helperColors.setX(idx4, 0);
        this.helperColors.setY(idx4, 0);
        this.helperColors.setZ(idx4, 1);
        this.helperColors.needsUpdate = true;
        connectionIndexStart += 2;
      }
    }

    if(!this.helperMesh){
      this.helperGeometry.setAttribute( 'position', this.helperPositions );
      this.helperGeometry.setAttribute( 'color', this.helperColors );
      
      this.helperMesh = new THREE.LineSegments( this.helperGeometry, this.helperMaterial );
      GameState.scene.add( this.helperMesh );
    }
  }

  updateTimer: number = 0;
  update(delta: number){
    this.updateTimer -= delta;
    if(this.updateTimer > 0){
      return;
    }
    this.updateTimer = 1;

    if(!this.area || !this.helperMesh?.visible)
      return;

    const player = this.area.context.getCurrentPlayer();
    const numPoints = this.points.length;
    let connectionIndexStart = (numPoints * 2);
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];

      const idx = i * 2;
      const idx2 = idx + 1;

      this.helperPositions.setX(idx, point.vector.x);
      this.helperPositions.setY(idx, point.vector.y);
      this.helperPositions.setZ(idx, point.nearestWalkableVector.z);
      
      this.helperPositions.setX(idx2, point.vector.x);
      this.helperPositions.setY(idx2, point.vector.y);
      this.helperPositions.setZ(idx2, point.nearestWalkableVector.z + 0.5);
      this.helperPositions.needsUpdate = true;

      if(this.checkLOSP2P(player.position, point.vector)){
        this.helperColors.setX(idx, 0);
        this.helperColors.setY(idx, 1);
        this.helperColors.setZ(idx, 0);
      }else{
        this.helperColors.setX(idx, 1);
        this.helperColors.setY(idx, 0);
        this.helperColors.setZ(idx, 1);
      }

      this.helperColors.setX(idx2, 0);
      this.helperColors.setY(idx2, 0);
      this.helperColors.setZ(idx2, 1);
      this.helperColors.needsUpdate = true;

      for(let j = 0; j < point.connections.length; j++){
        const cPoint = point.connections[j];
        const idx3 = connectionIndexStart;
        const idx4 = idx3 + 1;

        this.helperPositions.setX(idx3, point.vector.x);
        this.helperPositions.setY(idx3, point.vector.y);
        this.helperPositions.setZ(idx3, point.nearestWalkableVector.z + 0.5);
        
        this.helperPositions.setX(idx4, cPoint.vector.x);
        this.helperPositions.setY(idx4, cPoint.vector.y);
        this.helperPositions.setZ(idx4, cPoint.nearestWalkableVector.z + 0.5);
        this.helperPositions.needsUpdate = true;
  
        this.helperColors.setX(idx3, 0);
        this.helperColors.setY(idx3, 0);
        this.helperColors.setZ(idx3, 1);
  
        this.helperColors.setX(idx4, 0);
        this.helperColors.setY(idx4, 0);
        this.helperColors.setZ(idx4, 1);
        this.helperColors.needsUpdate = true;
        connectionIndexStart += 2;
      }
    }

  }

  #tmpLine = new THREE.Line3();
  checkLOSP2P(origin: THREE.Vector3, target: THREE.Vector3): boolean {
    let has_los = true;

    if(!this.area)
      return has_los;

    this.#tmpLine.start.copy(origin);
    this.#tmpLine.end.copy(target);
    for(let j = 0, len = this.area.walkEdges.length; j < len; j++){
      const edge = this.area.walkEdges[j];

      //Ignore transition edges
      if(edge.transition != -1)
        continue;
      
      if(Utility.LineLineIntersection(this.#tmpLine.start.x, this.#tmpLine.start.y, this.#tmpLine.end.x, this.#tmpLine.end.y, edge.line.start.x, edge.line.start.y, edge.line.end.x, edge.line.end.y)){
        has_los = false;
        break;
      }
    }
    return has_los;
  }

  dispose(){
    this.helperGeometry.dispose();
    this.helperMaterial.dispose();
    this.helperMesh.removeFromParent();

    this.helperPositions = undefined;
    this.helperColors = undefined;
    this.helperMesh = undefined;
    this.helperGeometry = undefined;
    this.helperMaterial = undefined;
  }

  setPathHelpersVisibility(state = false){
    if(!this.helperMesh) return;
    this.helperMesh.visible = state;
  }

  cleanupConnections(){
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      const toPrune: PathPoint[] = [];
      for(let j = 0; j < point.connections.length; j++){
        const con = point.connections[j];
        if(!point.hasLOS(con)){
          toPrune.push(con);
        }
      }
      while(toPrune.length){
        const con = toPrune.pop();
        console.log('los', 'pruning connection', point, con);
        point.removeConnection(con);
        con.removeConnection(point);
      }
    }
  }

  getClosestPathPointData(target = new THREE.Vector3): IClosestPathPointData {
    const targetPoint = new THREE.Vector3().copy(target);
    targetPoint.z = 0;
    const line3 = new THREE.Line3();
    const closest_position_on_line = new THREE.Vector3(0, 0, 0);
    let point_a: PathPoint;
    let point_b: PathPoint;
    let distance = Infinity;
    let pDistance = 0;

    const _tempPoint = new THREE.Vector3(0, 0, 0);
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      for(let j = 0; j < point.num_connections; j++){
        const connection = point.connections[j];
        line3.set(point.vector, connection.vector);
        line3.closestPointToPoint(targetPoint, true, _tempPoint);
        pDistance = targetPoint.distanceTo(_tempPoint);
        if(pDistance < distance){
          distance = pDistance;
          point_a = point;
          point_b = connection;
          closest_position_on_line.copy(_tempPoint);
        }
      }
    }
    
    return { 
      point_a: point_a, 
      point_b: point_b, 
      closest_position_on_line: closest_position_on_line 
    };
  }

  getClosestPathPoint(origin: THREE.Vector3): PathPoint{
    let point: PathPoint;
    let distance = Infinity;
    for(let i = 0; i < this.points.length; i++){
      const p = this.points[i];
      const d = origin.distanceTo(p.vector);
      if(d < distance){
        point = p;
        distance = d;
      }
    }
    return point;
  }

  traverseToPoint(owner: ModuleObject, origin: THREE.Vector3, dest: THREE.Vector3, smooth: boolean = true): ComputedPath {
    this.reset();

    const originPoint = PathPoint.FromVector3(origin);
    originPoint.setArea(this.area);

    const destPoint = PathPoint.FromVector3(dest);
    destPoint.setArea(this.area);

    const fallbackPath = ComputedPath.FromPointsList([originPoint, destPoint]);
    if(!this.points.length) return fallbackPath;

    if(originPoint.hasLOS(destPoint, owner)) return fallbackPath;

    const closest_origin_point = this.getClosestPathPoint(origin);
    const closest_destination_point = this.getClosestPathPoint(dest);

    //origin
    originPoint.addConnection(closest_origin_point);
    closest_origin_point.addConnection(originPoint);

    //dest
    closest_destination_point.addConnection(destPoint);
    destPoint.addConnection(closest_destination_point);

    originPoint.connections = this.points.slice(0).filter( (p) => {
      return p.hasLOS(originPoint, owner);
    });

    const path = new ComputedPath(owner, originPoint, destPoint);
    path.setOwner(owner);
    path.search();

    //clean up tmp point refs
    for(let i = 0, len = this.points.length; i < len; i++){
      const p = this.points[i];
      p.removeConnection(originPoint);
      p.removeConnection(destPoint);
    }

    if(path.points.length){
      if(smooth)
        path.smooth();
      return path;
    }
    
    return fallbackPath;

  }

  reset(){
    this.points.map( (p) => {
      p.reset();
    })
  }

}
