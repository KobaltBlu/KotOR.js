import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleRoom } from "@/module/ModuleRoom";
import { OdysseyWalkMesh, WalkmeshEdge } from "@/odyssey";
import * as THREE from "three";
import { OdysseyFace3 } from "@/three/odyssey";
import {
  findWalkableAttachmentAt,
} from "@/engine/movement/area-movement-queries";
import { applyWalkableAttachment } from "@/engine/movement/apply-walkable-attachment";

/**
 * Collision / walkmesh geometry context for a ModuleObject or ModuleRoom.
 *
 * Owns walkmesh refs, ground-face caches, and collision/path-query AABB cache.
 * Does not own locomotion solvers — ModuleCreature movement commits only via
 * MovementCommitter; discontinuous placement via teleportObject.
 *
 * Transitional shims (no new callers): findWalkableFace, roomCheck.
 * Prefer findWalkableAttachmentAt + applyWalkableAttachment.
 * roomCheck still toggles model visibility — that will move off this type.
 */
export class CollisionContext {
  object: ModuleObject;

  walkmesh: OdysseyWalkMesh | undefined;
  surfaceId: number;
  groundFace: OdysseyFace3;
  lastGroundFace: OdysseyFace3;
  wm_c_point: THREE.Vector3 = new THREE.Vector3();
  lastRoom: ModuleRoom;

  box = new THREE.Box3();
  edges: WalkmeshEdge[] = [];

  private cachedLocalBounds = new THREE.Box3();
  private cachedBoundsSource?: THREE.Object3D;
  private cachedBoundsScale = new THREE.Vector3(NaN, NaN, NaN);
  private cachedBoundsInverse = new THREE.Matrix4();

  /** @deprecated Transitional — throttles unroomed attachment recovery. */
  roomCheckTimer: number = 0;

  constructor(object: ModuleObject){
    this.object = object;
  }

  setWalkmesh(walkmesh: OdysseyWalkMesh | undefined): void {
    this.walkmesh = walkmesh;
    this.edges = walkmesh?.edges ? Array.from(walkmesh.edges.values()) : [];
    this.object?.markCollisionBoundsDirty?.("walkmesh");
  }

  /**
   * Refresh collision / path-query world AABB from the object's model/container.
   * Not for generic render frustum culling ownership.
   */
  refreshObjectBounds(forceLocal: boolean = false, sweptForce?: THREE.Vector3): void {
    const source = this.object.model instanceof THREE.Object3D
      ? this.object.model
      : this.object.container;
    const transformRoot = this.object.container || source;
    if(!source || !transformRoot || !this.object.box) return;

    if(forceLocal || this.object.collisionMatrixDirty || transformRoot.matrixWorldNeedsUpdate){
      transformRoot.updateMatrix();
      transformRoot.updateMatrixWorld(forceLocal);
      this.object.collisionMatrixDirty = false;
    }

    const scaleChanged = !this.cachedBoundsScale.equals(transformRoot.scale);
    if(
      this.cachedBoundsSource !== source ||
      this.cachedLocalBounds.isEmpty() ||
      scaleChanged ||
      forceLocal ||
      this.object.collisionBoundsDirty
    ){
      source.updateMatrixWorld(forceLocal);
      this.cachedLocalBounds.setFromObject(source);
      this.cachedBoundsInverse.copy(transformRoot.matrixWorld).invert();
      this.cachedLocalBounds.applyMatrix4(this.cachedBoundsInverse);
      this.cachedBoundsSource = source;
      this.cachedBoundsScale.copy(transformRoot.scale);
      this.object.collisionBoundsDirty = false;
    }

    this.object.box.copy(this.cachedLocalBounds).applyMatrix4(transformRoot.matrixWorld);
    this.object.sphere = this.object.box.getBoundingSphere(this.object.sphere);
    this.box.copy(this.object.box);
    if(sweptForce){
      this.box.translate(sweptForce);
    }
  }

  /**
   * @deprecated Compatibility shim — mutates room/ground/Z.
   * Prefer findWalkableAttachmentAt + applyWalkableAttachment.
   * No new callers.
   */
  findWalkableFace(object: ModuleObject = this.object): OdysseyFace3 | undefined {
    const objectPos = object.position;
    if(!object.area){
      return undefined;
    }
    const prefer =
      object.room ??
      (this.object === object ? (this.lastRoom as ModuleRoom | undefined) : undefined);
    const hit = findWalkableAttachmentAt(object.area, objectPos, prefer);
    if(!hit){
      return undefined;
    }
    applyWalkableAttachment(object, hit);
    this.groundFace = hit.face;
    this.lastGroundFace = hit.face;
    this.surfaceId = (hit.face as { walkIndex?: number }).walkIndex ?? this.surfaceId;
    this.lastRoom = hit.room;
    return hit.face;
  }

  /**
   * @deprecated Transitional — mixes attachment recovery with model visibility.
   * Visibility should react to room change elsewhere. No new callers; no new duties.
   */
  roomCheck(delta: number = 0): void {
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
