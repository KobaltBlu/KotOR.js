import { GameState } from "../GameState";
import type { ModuleCreature, ModuleObject, ModuleRoom } from "../module";
import { OdysseyWalkMesh, WalkmeshEdge } from "../odyssey";
import * as THREE from "three";
import { Utility } from "../utility/Utility";
import { OdysseyFace3 } from "../three/odyssey";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { EngineDebugType } from "../enums/engine/EngineDebugType";

// =============================================
// TYPE DEFINITIONS
// =============================================

interface CollisionEdge {
  line: THREE.Line3;
  normal?: THREE.Vector3;
  face?: OdysseyFace3;
  center_point?: THREE.Vector3;
  transition?: number;
  index?: number; // For tracking original position
}

interface ProcessedCollision {
  edge: CollisionEdge;
  penetration: number;
  distance: number;
  closestPoint: THREE.Vector3;
  priority: number; // For stable collision resolution
  type?: CollisionType;
}


enum CollisionType {
  CREATURE = 'creature',
  DOOR = 'door',
  PLACEABLE = 'placeable',
  ROOM = 'room'
}

interface CollisionProfile {
  readonly priority: number;
}

// =============================================
// CONFIGURATION CONSTANTS
// =============================================

class CollisionConfig {
  static readonly TOLERANCE = 0.01;
  static readonly MIN_VELOCITY = 0.001;

  static readonly PROFILES: Record<CollisionType, CollisionProfile> = {
    [CollisionType.CREATURE]: { priority: 1 },
    [CollisionType.DOOR]: { priority: 2 },
    [CollisionType.PLACEABLE]: { priority: 3 },
    [CollisionType.ROOM]: { priority: 4 },
  };
}

// =============================================
// OBJECT POOLING SYSTEM
// =============================================

class CollisionPool {
  private static collisionDataPool: ProcessedCollision[] = [];
  private static vectorPool: THREE.Vector3[] = [];

  static getProcessedCollision(): ProcessedCollision {
    return this.collisionDataPool.pop() || {
      edge: {} as CollisionEdge,
      penetration: 0,
      distance: 0,
      closestPoint: new THREE.Vector3(),
      priority: 0
    };
  }

  static releaseProcessedCollision(data: ProcessedCollision): void {
    // Reset object for reuse
    data.edge = {} as CollisionEdge;
    data.penetration = 0;
    data.distance = 0;
    data.closestPoint.set(0, 0, 0);
    data.priority = 0;
    data.type = undefined;
    this.collisionDataPool.push(data);
  }

  static getVector(): THREE.Vector3 {
    return this.vectorPool.pop() || new THREE.Vector3();
  }

  static releaseVector(vector: THREE.Vector3): void {
    vector.set(0, 0, 0);
    this.vectorPool.push(vector);
  }
}

// =============================================
// COLLISION STATE MANAGEMENT
// =============================================

class CollisionState {
  readonly collisions = new Map<CollisionType, ProcessedCollision[]>();
  readonly activeCollisions = new Set<CollisionEdge>();
  public hitDistance = 1;
  public hitDistanceHalf = 0.5;

  addCollision(type: CollisionType, collision: ProcessedCollision): void {
    if (!this.collisions.has(type)) {
      this.collisions.set(type, []);
    }
    this.collisions.get(type)!.push(collision);
    this.activeCollisions.add(collision.edge);
  }

  getCollisions(type: CollisionType): ProcessedCollision[] {
    return this.collisions.get(type) || [];
  }

  getAllCollisions(): ProcessedCollision[] {
    const all: ProcessedCollision[] = [];
    for (const collisions of this.collisions.values()) {
      all.push(...collisions);
    }
    return all;
  }

  hasCollisions(): boolean {
    return this.collisions.size > 0;
  }

  clear(): void {
    // Release pooled objects back to pool
    for (const collisions of this.collisions.values()) {
      for (const collision of collisions) {
        CollisionPool.releaseProcessedCollision(collision);
      }
    }
    this.collisions.clear();
    this.activeCollisions.clear();
  }
}

/**
 * CollisionManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CollisionManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CollisionManager {
  // Core object references
  object: ModuleObject;

  // Collision state
  blockingTimer: number = 0;
  lastBlockingObject: ModuleObject;
  blockingObject: ModuleObject;

  // Ground/walkmesh state
  walkmesh: OdysseyWalkMesh;
  surfaceId: number;
  groundFace: OdysseyFace3;
  lastGroundFace: OdysseyFace3;
  wm_c_point: THREE.Vector3 = new THREE.Vector3();
  lastRoom: ModuleRoom;
  groundTilt = new THREE.Vector3();

  // Reusable objects (avoiding frequent allocations)
  box = new THREE.Box3();
  rayLine3 = new THREE.Line3();
  scratchVec3 = new THREE.Vector3(0, 0, 2);
  closestPoint = new THREE.Vector3(0, 0, 0);

  // Temporary position vector for calculations
  tempPosition = new THREE.Vector3();

  edges: WalkmeshEdge[] = [];

  // Collision state management
  private collisionState = new CollisionState();

  // Visual debug helpers for collision edges
  private edgeHelperColors: THREE.Float32BufferAttribute;
  private edgeHelperPositions: THREE.Float32BufferAttribute;
  private edgeHelperGeometry = new THREE.BufferGeometry();
  private edgeHelperMaterial = new THREE.LineBasicMaterial({
    color: 0xFF0000,
    vertexColors: true,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  private edgeHelperMesh: THREE.LineSegments;

  constructor(object: ModuleObject){
    this.object = object;
  }

  setWalkmesh(walkmesh: OdysseyWalkMesh): void {
    this.walkmesh = walkmesh;
    this.edges = Array.from(walkmesh.edges.values());
  }

  /**
   * Apply multi-edge collide and slide response for corner/complex collision scenarios
   */
  private tmpNormal1 = new THREE.Vector3();
  private applyCollideAndSlide(collisions: ProcessedCollision[]): void {
    if (collisions.length === 0) return;

    const velocity = this.object.forceVector.clone();
    const finalVelocity = velocity.clone();

    // Sort by penetration (closest first) for consistent processing
    collisions.sort((a, b) => b.penetration - a.penetration);

    // Detect narrow choke points (opposing normals with penetration)
    for (let i = 0; i < collisions.length; i++) {
      const n1 = collisions[i].edge.normal;
      if (!n1 || collisions[i].penetration <= 0) continue;
      for (let j = i + 1; j < collisions.length; j++) {
        const n2 = collisions[j].edge.normal;
        if (!n2 || collisions[j].penetration <= 0) continue;
        if (n1.dot(n2) < -0.3) {
          // Only block if moving into both opposing faces; allow escape away
          const intoFirst = velocity.dot(n1) < 0;
          const intoSecond = velocity.dot(n2) < 0;
          if (intoFirst && intoSecond) {
            this.object.forceVector.set(0, 0, 0);
            return;
          }
        }
      }
    }

    // Multi-constraint projection (Gauss-Seidel)
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (const collision of collisions) {
        const normal = collision.edge.normal;
        if (!normal) continue;
        this.tmpNormal1.copy(normal);
        const vn = finalVelocity.dot(this.tmpNormal1);
        if (vn < 0) {
          finalVelocity.sub(this.tmpNormal1.multiplyScalar(vn));
        }
      }
    }

    // Small separation along averaged normals if still penetrating
    let sepNormal = new THREE.Vector3(0, 0, 0);
    let sepCount = 0;
    let totalPenetration = 0;
    for (const collision of collisions) {
      if (collision.penetration > 0 && collision.edge.normal) {
        sepNormal.add(collision.edge.normal);
        totalPenetration += collision.penetration;
        sepCount++;
      }
    }
    if (sepCount > 0) {
      sepNormal.normalize();
      const sep = Math.min(totalPenetration / sepCount, CollisionConfig.TOLERANCE);
      finalVelocity.add(sepNormal.multiplyScalar(sep));
    }

    this.object.forceVector.copy(finalVelocity);
  }
  
  // =============================================
  // MAIN COLLISION UPDATE METHOD
  // =============================================

  private originalPosition = new THREE.Vector3();
  private playerFeetRay = new THREE.Vector3(0, 0, 0);

  updateCollision(delta = 0): void {
    if (!this.validatePrerequisites()) {
      return;
    }

    const originalForce = this.object.forceVector.clone();
    const steps = 4;
    const stepForce = originalForce.clone().multiplyScalar(1 / steps);
    let collided = false;

    for (let step = 0; step < steps; step++) {
      // Initialize collision state for this frame
      this.collisionState.clear();
      this.collisionState.hitDistance = this.getHitDistance();
      this.collisionState.hitDistanceHalf = this.collisionState.hitDistance; // / 2

      // Apply step movement
      this.object.forceVector.copy(stepForce);

      // Update ground positioning first
      this.updateGroundPositioning();

      // Calculate predicted position for collision detection
      this.tempPosition.copy(this.object.position).add(this.object.forceVector);
      this.originalPosition.copy(this.object.position);

      // Update bounding box
      this.updateBoundingBox();

      // Setup gravity raycasting
      this.setupGravityRaycast();

      // Process all collision types
      this.handleCreatureCollisions(delta);
      this.handleDoorCollisions();
      this.handlePlaceableCollisions();
      this.handleRoomCollisions();

      const hadCollisions = this.collisionState.hasCollisions();

      // Resolve all detected collisions
      this.resolveAllCollisions();

      if (hadCollisions) {
        // Preserve full movement distance for the remainder of the frame
        const remainingSteps = steps - step;
        this.object.forceVector.multiplyScalar(remainingSteps);
      }

      // Validate final position against placeables
      this.validatePlaceablePenetration();

      // Handle room transitions and position finalization
      this.processRoomTransitions();
      this.finalizePositionUpdate();

      if (hadCollisions) {
        collided = true;
        break;
      }
    }

    if (!collided) {
      this.object.forceVector.copy(originalForce);
    }
  }

  // =============================================
  // VALIDATION & SETUP METHODS
  // =============================================

  private validatePrerequisites(): boolean {
    if (!this.object?.model) {
      console.warn('CollisionManager: No valid object for collision detection');
      return false;
    }

    if (!this.object.room?.collisionManager?.walkmesh) {
      console.warn('CollisionManager: Object not in valid room with walkmesh');
      return false;
    }

    if (!GameState.module || !this.object.area) {
      console.warn('CollisionManager: Missing module or area context');
      return false;
    }

    return true;
  }

  private getHitDistance(): number {
    if (BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) {
      return (this.object as ModuleCreature).getAppearance().creperspace;
    }
    return 1; // Default hit distance
  }

  private updateGroundPositioning(): void {
    if (this.groundFace && this.object.room?.model?.wok &&
        this.object.room.model.wok.walkableFaces.indexOf(this.groundFace) === -1) {
      this.findWalkableFace();
    }
  }

  private updateBoundingBox(): void {
    if (this.object.container && this.object.box) {
      this.object.box.setFromObject(this.object.container);
      this.object.sphere = this.object.box.getBoundingSphere(this.object.sphere);
      this.box = this.object.box.clone();
      this.box.translate(this.object.forceVector);
    }
  }

  private setupGravityRaycast(): void {
    GameState.raycaster.far = 10;
    this.scratchVec3.set(0, 0, 2);
    this.playerFeetRay.copy(this.object.position).add(this.scratchVec3);
    GameState.raycaster.ray.origin.copy(this.playerFeetRay);
    GameState.raycaster.ray.direction.set(0, 0, -1);
  }

  // =============================================
  // COLLISION HANDLING METHODS
  // =============================================

  private handleCreatureCollisions(delta: number): void {
    // Handle both area creatures and party members
    this.handleObjectGroupCollisions(GameState.module.area.creatures, CollisionType.CREATURE, delta);
    this.handleObjectGroupCollisions(GameState.PartyManager.party, CollisionType.CREATURE, delta);
  }

  private handleObjectGroupCollisions(objects: ModuleCreature[], type: CollisionType, delta: number): void {
    for (const creature of objects) {
      if (!creature || creature === this.object || creature.isDead()) {
        continue;
      }

      if (!creature.getAppearance()) {
        continue;
      }

      const collision = this.detectCreatureCollision(creature);
      if (collision) {
        this.collisionState.addCollision(type, collision);
      }
    }
  }

  private detectCreatureCollision(creature: ModuleCreature): ProcessedCollision | null {
    const collision = CollisionPool.getProcessedCollision();
    const selfPos = this.object.position;
    const otherPos = creature.position;

    const dx = selfPos.x - otherPos.x;
    const dy = selfPos.y - otherPos.y;
    const dist = Math.hypot(dx, dy);

    const otherHitDistance = creature.getAppearance()?.creperspace ?? 1;
    const minDist = this.collisionState.hitDistance + otherHitDistance;

    if (dist >= minDist) {
      CollisionPool.releaseProcessedCollision(collision);
      return null;
    }

    const penetration = Math.max(0, minDist - dist);
    const normal = (dist > CollisionConfig.TOLERANCE)
      ? new THREE.Vector3(dx / dist, dy / dist, 0)
      : new THREE.Vector3(1, 0, 0);

    // Populate processed collision
    collision.edge = {
      line: new THREE.Line3(otherPos.clone(), otherPos.clone()),
      normal
    };
    collision.type = CollisionType.CREATURE;
    collision.penetration = penetration;
    collision.distance = dist;
    collision.closestPoint.set(
      otherPos.x + normal.x * otherHitDistance,
      otherPos.y + normal.y * otherHitDistance,
      otherPos.z
    );
    collision.priority = CollisionConfig.PROFILES[CollisionType.CREATURE].priority;

    return collision;
  }
    
  private handlePlaceableCollisions(): void {
    const placeables = this.object.room.placeables;
    for (const placeable of placeables) {
      if (!this.isValidPlaceableForCollision(placeable)) continue;

      const collisions = this.detectEdgeCollisions(placeable.collisionManager.edges);
      for (const collision of collisions) {
        this.collisionState.addCollision(CollisionType.PLACEABLE, collision);
      }
    }
  }

  static DIR_COUNT: number = 12;
  static DX_LIST: number[] = [1,  0.15425144988758405, -0.9524129804151563, -0.4480736161291702, 0.8141809705265618,  0.6992508064783751, -0.5984600690578581, -0.8838774731823718,  0.32578130553514806, 0.9843819506325049, -0.022096619278683942, -0.9911988217552068];
  static DY_LIST: number[] = [0, -0.9880316240928618,  -0.3048106211022167,  0.8939966636005579, 0.5806111842123143, -0.7148764296291646, -0.8011526357338304,  0.46771851834275896, 0.9454451549211168, -0.1760459464712114, -0.9997558399011495,   -0.13238162920545193];
  private tmpDirection = new THREE.Vector3();
  private tmpNormal = new THREE.Vector3();
  private tmpMatrix3 = new THREE.Matrix3();

  private handleDoorCollisions(): void {
    const doors = this.object.room.doors;
    if (!doors?.length) return;

    const raycaster = GameState.raycaster;
    const prevFar = raycaster.far;

    // Cast from predicted position to approximate capsule collision
    this.playerFeetRay.copy(this.object.position).add(this.object.forceVector);
    raycaster.ray.origin.copy(this.playerFeetRay);
    raycaster.far = this.collisionState.hitDistance;

    for (const door of doors) {
      if (!door?.collisionManager?.walkmesh) continue;
      if (door.isOpen() || door.collisionDelay) continue;

      const mesh = door.collisionManager.walkmesh.mesh;
      this.tmpMatrix3.getNormalMatrix(mesh.matrixWorld);

      for (let i = 0; i < CollisionManager.DIR_COUNT; i++) {
        this.tmpDirection.set(CollisionManager.DX_LIST[i], CollisionManager.DY_LIST[i], 0);
        raycaster.ray.direction.copy(this.tmpDirection);
        const intersects = door.collisionManager.walkmesh.raycast(raycaster) || [];
        if (!intersects.length) continue;

        for (const hit of intersects) {
          if (hit.distance >= this.collisionState.hitDistance) continue;

          const face = hit.face;
          if (!face || (face.materialIndex !== 7 && face.materialIndex !== 2)) {
            continue;
          }

          this.tmpNormal.copy(face.normal);
          this.tmpNormal.applyMatrix3(this.tmpMatrix3).normalize();

          const collision = CollisionPool.getProcessedCollision();
          collision.edge = {
            line: new THREE.Line3(),
            normal: this.tmpNormal,
            face: face as OdysseyFace3
          };
          collision.edge.line.start.copy(hit.point);
          collision.edge.line.end.copy(hit.point);
          collision.type = CollisionType.DOOR;
          collision.closestPoint.copy(hit.point);
          collision.distance = hit.distance;
          collision.penetration = Math.max(0, this.collisionState.hitDistance - hit.distance);
          collision.priority = CollisionConfig.PROFILES[CollisionType.DOOR].priority;

          this.collisionState.addCollision(CollisionType.DOOR, collision);
          this.blockingObject = door;
        }
      }
    }

    raycaster.far = prevFar;
  }

  private handleRoomCollisions(): void {
    if (!this.groundFace) {
      this.findWalkableFace();
    }

    const roomEdges = this.object.room.collisionManager.edges;
    const collisions = this.detectEdgeCollisions(roomEdges, CollisionType.ROOM);
    for (const collision of collisions) {
      this.collisionState.addCollision(CollisionType.ROOM, collision);
    }
  }

  private validatePlaceablePenetration(): void {
    if (!this.object?.room?.placeables?.length) return;
    if (this.object.forceVector.length() === 0) return;

    const nextPosition = CollisionPool.getVector();
    nextPosition.copy(this.object.position).add(this.object.forceVector);

    for (const placeable of this.object.room.placeables) {
      if (!placeable?.model?.visible) continue;
      if (!placeable?.collisionManager?.walkmesh) continue;

      if (this.isInsidePlaceableWalkmesh(nextPosition, placeable)) {
        this.object.forceVector.set(0, 0, 0);
        break;
      }
    }

    CollisionPool.releaseVector(nextPosition);
  }

  private isInsidePlaceableWalkmesh(point: THREE.Vector3, placeable: any): boolean {
    const walkmesh = placeable?.collisionManager?.walkmesh;
    if (!walkmesh?.walkableFaces?.length) return false;

    const testPoint = CollisionPool.getVector();
    testPoint.copy(point);

    for (const face of walkmesh.walkableFaces) {
      if (!face?.triangle) continue;
      // Align test point to face plane for stable containsPoint checks
      testPoint.z = face.triangle.a.z;
      if (face.triangle.containsPoint(testPoint)) {
        CollisionPool.releaseVector(testPoint);
        return true;
      }
    }

    CollisionPool.releaseVector(testPoint);
    return false;
  }

  // =============================================
  // COLLISION DETECTION UTILITIES
  // =============================================

  private isValidPlaceableForCollision(placeable: any): boolean {
    if (!placeable?.collisionManager?.walkmesh || !placeable.model?.visible) {
      return false;
    }

    // Update bounding box for intersection test
    placeable.box.setFromObject(placeable.container);
    return placeable.box.intersectsBox(this.box) || placeable.box.containsBox(this.box);
  }

  private detectEdgeCollisions(edges: any[], collisionType: CollisionType = CollisionType.PLACEABLE): ProcessedCollision[] {
    const collisions: ProcessedCollision[] = [];
    if (!edges || edges.length === 0) return collisions;

    for (const edge of edges) {
      if (!edge || edge.transition >= 0) continue;
      const collision = this.detectSingleEdgeCollision(edge, collisionType);
      if (collision) {
        collisions.push(collision);
      }
    }

    return collisions;
  }

  private detectSingleEdgeCollision(edge: any, collisionType: CollisionType): ProcessedCollision | null {
    const collision = CollisionPool.getProcessedCollision();
    collision.edge = edge;
    collision.type = collisionType;

    // Use current position for more stable collision detection
    // Avoid using predicted position (tempPosition) to prevent frame-to-frame jitter
    const checkPosition = this.object.position.clone();

    // Find closest point on edge to current position
    edge.line.closestPointToPoint(checkPosition, true, collision.closestPoint);
    collision.distance = collision.closestPoint.distanceTo(checkPosition);

    // Check if within collision range (with conservative tolerance)
    // const profile = CollisionConfig.PROFILES[collisionType];
    // // Use more conservative tolerance to reduce false collision detections
    // const effectiveTolerance = profile.tolerance * 0.8;
    if (collision.distance >= this.collisionState.hitDistanceHalf /*- effectiveTolerance*/) {
      CollisionPool.releaseProcessedCollision(collision);
      return null;
    }

    const toActor = checkPosition.clone().sub(collision.closestPoint);
    if (toActor.dot(edge.normal) <= 0) {
      CollisionPool.releaseProcessedCollision(collision);
      return null; // backside, ignore
    }

    // Calculate penetration based on distance from center of collision sphere
    collision.penetration = Math.max(0, this.collisionState.hitDistanceHalf - collision.distance);

    // Ensure penetration is reasonable (prevent extreme values)
    // collision.penetration = Math.min(collision.penetration, this.collisionState.hitDistanceHalf * 0.5);

    // Ignore very small penetrations that could cause micro-jitter
    // if (collision.penetration < 0.002) {
    //   CollisionPool.releaseProcessedCollision(collision);
    //   return null;
    // }

    collision.priority = CollisionConfig.PROFILES[collisionType].priority;
    return collision;
  }

  // =============================================
  // COLLISION RESOLUTION
  // =============================================

  private resolveAllCollisions(): void {
    if (!this.collisionState.hasCollisions()) return;

    // Resolve creature collisions separately (no occlusion filtering)
    const creatureCollisions = this.collisionState.collisions.get(CollisionType.CREATURE) || [];
    if (creatureCollisions.length > 0) {
      this.applyCollideAndSlide(creatureCollisions);
    }

    // Resolve door collisions separately (raycast-based)
    const doorCollisions = this.collisionState.collisions.get(CollisionType.DOOR) || [];
    if (doorCollisions.length > 0) {
      this.applyCollideAndSlide(doorCollisions);
    }

    // Resolve room and placeable collisions with occlusion and clustering
    const placeableCollisions = this.collisionState.collisions.get(CollisionType.PLACEABLE) || [];
    const roomCollisions = this.collisionState.collisions.get(CollisionType.ROOM) || [];

    // Flatten all room and placeable collisions into one array
    const allEdgeCollisions = [...placeableCollisions, ...roomCollisions];

    // Sort by distance (closest first)
    allEdgeCollisions.sort((a, b) => a.distance - b.distance);

    // Filter out occluded edges
    const nonOccludedCollisions = this.filterOccludedEdges(allEdgeCollisions);

    // Handle multiple collisions
    this.applyCollideAndSlide(nonOccludedCollisions);

    // Update visual debug helpers if enabled
    this.updateCollisionEdgeVisualHelper(nonOccludedCollisions);
  }

  /**
   * Filter out edge collisions that are occluded by closer edges
   * Edges are processed in distance order (closest first)
   */
  private filterOccludedEdges(collisions: ProcessedCollision[]): ProcessedCollision[] {
    const nonOccluded: ProcessedCollision[] = [];

    for (let i = 0; i < collisions.length; i++) {
      const currentCollision = collisions[i];
      let isOccluded = false;

      // Check if this edge is occluded by any closer edge
      for (let j = 0; j < i; j++) {
        const closerCollision = collisions[j];
        if (this.isEdgeOccludedByCloserEdge(currentCollision, closerCollision)) {
          isOccluded = true;
          break;
        }
      }

      if (!isOccluded) {
        nonOccluded.push(currentCollision);
      }
    }

    return nonOccluded;
  }

  /**
   * Check if an edge is occluded by a closer edge
   */
  private isEdgeOccludedByCloserEdge(farCollision: ProcessedCollision, closeCollision: ProcessedCollision): boolean {
    // Calculate vectors from object position to both collision points
    const toClosePoint = CollisionPool.getVector();
    const toFarPoint = CollisionPool.getVector();

    toClosePoint.copy(closeCollision.closestPoint).sub(this.tempPosition);
    toFarPoint.copy(farCollision.closestPoint).sub(this.tempPosition);

    const closeDistance = toClosePoint.length();
    const farDistance = toFarPoint.length();

    // Closer edge must be significantly closer and in similar direction
    const distanceRatio = closeDistance / farDistance;
    if (distanceRatio > 0.8) { // Not significantly closer
      CollisionPool.releaseVector(toClosePoint);
      CollisionPool.releaseVector(toFarPoint);
      return false;
    }

    // Check angular similarity (edges should be roughly aligned)
    const closeDir = toClosePoint.clone().normalize();
    const farDir = toFarPoint.clone().normalize();
    const dotProduct = closeDir.dot(farDir);
    const angleThreshold = Math.cos(Math.PI / 6); // 30 degrees

    CollisionPool.releaseVector(toClosePoint);
    CollisionPool.releaseVector(toFarPoint);

    // If close edge is in similar direction and significantly closer, it occludes
    return dotProduct > angleThreshold;
  }

  // =============================================
  // VISUAL DEBUG HELPERS
  // =============================================

  /**
   * Update the visual helper that draws collision edges being processed
   */
  private updateCollisionEdgeVisualHelper(allCollisions: ProcessedCollision[] = []): void {
    if (allCollisions.length === 0 || !GameState.debug[EngineDebugType.COLLISION_HELPERS]) {
      if (this.edgeHelperMesh) {
        this.edgeHelperMesh.visible = false;
      }
      return;
    }

    // Calculate buffer size needed (2 vertices per edge)
    const bufferSize = allCollisions.length * 2 * 3; // 2 vertices * 3 components each

    // Initialize or resize buffers
    if (!this.edgeHelperColors || this.edgeHelperColors.count !== bufferSize / 3) {
      this.edgeHelperColors = new THREE.Float32BufferAttribute(new Array(bufferSize).fill(0), 3);
      this.edgeHelperPositions = new THREE.Float32BufferAttribute(new Array(bufferSize).fill(0), 3);
      this.edgeHelperGeometry.setAttribute('position', this.edgeHelperPositions);
      this.edgeHelperGeometry.setAttribute('color', this.edgeHelperColors);
    }

    // Set vertex data for each collision edge
    let vertexIndex = 0;
    for (const collision of allCollisions) {
      const edge = collision.edge.line;
      const color = this.getEdgeColor(collision);

      // Start vertex
      this.edgeHelperPositions.setXYZ(vertexIndex, edge.start.x, edge.start.y, edge.start.z + 0.01);
      this.edgeHelperColors.setXYZ(vertexIndex, color.r, color.g, color.b);
      vertexIndex++;

      // End vertex
      this.edgeHelperPositions.setXYZ(vertexIndex, edge.end.x, edge.end.y, edge.end.z + 0.01);
      this.edgeHelperColors.setXYZ(vertexIndex, color.r, color.g, color.b);
      vertexIndex++;
    }

    // Mark buffers as needing update
    this.edgeHelperPositions.needsUpdate = true;
    this.edgeHelperColors.needsUpdate = true;
    this.edgeHelperGeometry.attributes.position.needsUpdate = true;
    this.edgeHelperGeometry.attributes.color.needsUpdate = true;

    this.edgeHelperGeometry.computeBoundingSphere();
    this.edgeHelperGeometry.computeBoundingBox();

    // Create or update mesh
    if (!this.edgeHelperMesh) {
      this.edgeHelperMesh = new THREE.LineSegments(this.edgeHelperGeometry, this.edgeHelperMaterial);
      this.edgeHelperMesh.renderOrder = 1000; // Render after other geometry
      GameState.group.collision_helpers.add(this.edgeHelperMesh);
    }

    this.edgeHelperMesh.visible = GameState.debug[EngineDebugType.COLLISION_HELPERS];
  }

  /**
   * Get color for collision edge based on type and collision status
   */
  private getEdgeColor(collision: ProcessedCollision): THREE.Color {
    // Get collision type from the collision
    let collisionType = CollisionType.PLACEABLE; // Default

    // Determine type by checking which collision array this came from
    for (const [type, collisions] of this.collisionState.collisions) {
      if (collisions.includes(collision)) {
        collisionType = type;
        break;
      }
    }

    // Color based on collision type and penetration
    if (collision.penetration > 0.01) {
      // Active collision (penetrating) - bright colors
      switch (collisionType) {
        case CollisionType.ROOM: return new THREE.Color(0xFF0000); // Red
        case CollisionType.PLACEABLE: return new THREE.Color(0x00FF00); // Green
        case CollisionType.DOOR: return new THREE.Color(0x0000FF); // Blue
        case CollisionType.CREATURE: return new THREE.Color(0xFFFF00); // Yellow
        default: return new THREE.Color(0xFFFFFF); // White
      }
    } else {
      // Grazing collision - dimmed colors
      switch (collisionType) {
        case CollisionType.ROOM: return new THREE.Color(0x880000); // Dark red
        case CollisionType.PLACEABLE: return new THREE.Color(0x008800); // Dark green
        case CollisionType.DOOR: return new THREE.Color(0x000088); // Dark blue
        case CollisionType.CREATURE: return new THREE.Color(0x888800); // Dark yellow
        default: return new THREE.Color(0x888888); // Gray
      }
    }
  }

  // =============================================
  // ROOM TRANSITIONS & POSITION FINALIZATION
  // =============================================

  private processRoomTransitions(): void {
    if (this.object.forceVector.length() === 0) return;

    // Check for room transition edges
    for (const [index, edge] of this.object.room.collisionManager.walkmesh.edges) {
      if (!edge || edge.transition === -1) continue;

      if (Utility.LineLineIntersection(
        this.object.position.x,
        this.object.position.y,
        this.object.position.x + this.object.forceVector.x,
        this.object.position.y + this.object.forceVector.y,
        edge.line.start.x,
        edge.line.start.y,
        edge.line.end.x,
        edge.line.end.y
      )) {
        this.object.attachToRoom(this.object.area.rooms[edge.transition]);
        break;
      }
    }

    // Handle door transition logic
    if (this.object.lastDoorEntered) {
      this.object.lastDoorEntered.testTransitionLineCrosses(this.object);
    }
  }

  private finalizePositionUpdate(): void {
    // Apply final position update
    this.object.position.add(this.object.forceVector);

    // Update ground face detection
    this.lastRoom = this.object.room;
    this.lastGroundFace = this.groundFace;
    this.groundFace = undefined;

    if (this.object.room) {
      const face = this.object.room.findWalkableFace(this.object);
      if (!face) {
        this.findWalkableFace();
      }
    }

    // Handle case where no valid ground face found
    if (!this.groundFace) {
      this.object.forceVector.set(0, 0, 0);
      this.object.position.copy(this.originalPosition);
      this.groundFace = this.lastGroundFace;
      this.object.attachToRoom(this.lastRoom);
      this.object.forceVector.set(0, 0, 0);
    }

    // Reset raycaster far plane
    GameState.raycaster.far = Infinity;

    // Clean up collision state for next frame
    this.collisionState.clear();
  }

  findWalkableFace(object: ModuleObject = this.object){
    const objectPos = object.position;
    let face;
    let room;
    if(!object.area){
      return;
    }
    for(let i = 0, il = object.area.rooms.length; i < il; i++){
      room = object.area.rooms[i];
      if(!room.collisionManager.walkmesh){
        continue;
      }

      const walkableFaces = room.collisionManager.walkmesh.walkableFaces;

      for(let j = 0, jl = walkableFaces.length; j < jl; j++){
        face = walkableFaces[j];
        if(!face.triangle.containsPoint(objectPos)){
          continue;
        }
        this.groundFace = face;
        this.lastGroundFace = this.groundFace;
        this.surfaceId = this.groundFace.walkIndex;
        object.attachToRoom(room);
        face.triangle.closestPointToPoint(objectPos, this.wm_c_point);
        objectPos.z = this.wm_c_point.z + .005;
      }
    }
    return face;
  }

  // Room checking
  roomCheckTimer: number = 0;
  roomCheck(delta: number = 0){
    if(!this.object.room && this.object.area){
      if(!this.roomCheckTimer || this.roomCheckTimer <= 0){
        this.roomCheckTimer = 1;
        this.findWalkableFace();
      }
      this.roomCheckTimer -= delta;
    }
    this.object.updateModelVisibility();
  }

}