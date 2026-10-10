import * as THREE from "three";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { type OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { type OdysseyModelChangeEvent } from "@engine/odyssey/OdysseyModel";
import { OdysseyEmitter3D } from "@engine/render/three/odyssey/OdysseyEmitter3D";
import { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";
import { OdysseyObject3D } from "@engine/render/three/odyssey/OdysseyObject3D";
import { buildOdysseyNodeMesh } from "@engine/render/three/odyssey/OdysseyMeshBuilder";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";

/**
 * Editor/source-model change sync for OdysseyModel3D (setSourceModel, rebuild, flush).
 */
export class OdysseyModel3DEditorSync {
  private sourceModelUnsubscribe: Function = undefined;
  private pendingSyncEvents: OdysseyModelChangeEvent[] = [];
  private syncScheduled = false;

  constructor(private readonly model: OdysseyModel3D) {}

  setSourceModel(source?: OdysseyModel): void {
    if (typeof this.sourceModelUnsubscribe === "function") {
      this.sourceModelUnsubscribe();
      this.sourceModelUnsubscribe = undefined;
    }
    this.model.sourceModel = source;
    if (this.model.sourceModel) {
      this.sourceModelUnsubscribe = this.model.sourceModel.addChangeListener(
        (event) => this.onSourceModelChange(event),
      );
    }
  }

  unsubscribe(): void {
    if (typeof this.sourceModelUnsubscribe === "function") {
      this.sourceModelUnsubscribe();
      this.sourceModelUnsubscribe = undefined;
    }
  }

  onSourceModelChange(event: OdysseyModelChangeEvent): void {
    this.pendingSyncEvents.push(event);
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    queueMicrotask(() => this.flushSyncEvents());
  }

  flushSyncEvents(): void {
    this.syncScheduled = false;
    if (!this.pendingSyncEvents.length) return;
    const events = this.pendingSyncEvents.splice(0);
    const deduped = new Map<string, OdysseyModelChangeEvent>();
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const key = `${event.kind}:${event.nodeUUID || "model"}`;
      deduped.set(key, event);
    }
    const reducedEvents = Array.from(deduped.values());
    for (let i = 0; i < reducedEvents.length; i++) {
      const event = reducedEvents[i];
      switch (event.kind) {
        case "node.transform":
          this.syncNodeTransform(event.nodeUUID);
          break;
        case "controller.keyframes":
          // Animation edits are consumed naturally by update loop since runtime nodes keep source-linked controllers.
          break;
        case "node.material":
        case "node.geometry":
          this.rebuildNode(event.nodeUUID);
          break;
        case "node.hierarchy":
          this.rebuildSubtree(event.nodeUUID);
          break;
        case "model.meta":
          // model.meta should not force full replacement in normal flow.
          break;
      }
    }
  }

  syncNodeTransform(nodeUUID?: string): boolean {
    if (!nodeUUID) return false;
    const runtimeNode = this.model.nodesByUUID.get(nodeUUID);
    const sourceNode = runtimeNode?.odysseyModelNode;
    if (!runtimeNode || !sourceNode) return false;
    runtimeNode.position.copy(sourceNode.position);
    runtimeNode.quaternion.copy(sourceNode.quaternion);
    runtimeNode.updateMatrix();
    runtimeNode.updateMatrixWorld(true);
    return true;
  }

  /** Remove mesh materials/skins from model tracking arrays before dispose. */
  private stripMeshFromModelTracking(mesh: THREE.Mesh): void {
    const materials: THREE.Material[] = Array.isArray(mesh.material)
      ? mesh.material as THREE.Material[]
      : mesh.material
        ? [mesh.material as THREE.Material]
        : [];
    for (let m = 0; m < materials.length; m++) {
      const mat = materials[m];
      const idx = this.model.materials.indexOf(mat);
      if (idx >= 0) this.model.materials.splice(idx, 1);
    }
    if (mesh instanceof THREE.SkinnedMesh) {
      const si = this.model.skins.indexOf(mesh);
      if (si >= 0) this.model.skins.splice(si, 1);
    }
  }

  rebuildNode(nodeUUID?: string): boolean {
    const model = this.model;
    if (!nodeUUID) return false;
    const runtimeNode = model.nodesByUUID.get(nodeUUID);
    if (!runtimeNode || !runtimeNode.odysseyModelNode) return false;
    const sourceNode = runtimeNode.odysseyModelNode;

    if (runtimeNode.saberTrail) {
      runtimeNode.saberTrail.dispose();
      runtimeNode.saberTrail = undefined;
    }

    if (runtimeNode.mesh) {
      this.stripMeshFromModelTracking(runtimeNode.mesh);
      const saberIdx = model.saberMeshes.indexOf(runtimeNode.mesh);
      if (saberIdx >= 0) model.saberMeshes.splice(saberIdx, 1);
      runtimeNode.remove(runtimeNode.mesh);
      if (runtimeNode.mesh.material) {
        if (Array.isArray(runtimeNode.mesh.material)) {
          for (let i = 0; i < runtimeNode.mesh.material.length; i++) {
            model.disposeMaterial(runtimeNode.mesh.material[i]);
            runtimeNode.mesh.material[i].dispose();
          }
        } else {
          model.disposeMaterial(runtimeNode.mesh.material);
          runtimeNode.mesh.material.dispose();
        }
      }
      runtimeNode.mesh.geometry?.dispose();
      runtimeNode.mesh = undefined;
      runtimeNode.userData.mesh = undefined;
    }

    if (runtimeNode.emitter) {
      const emitterIdx = model.emitters.indexOf(runtimeNode.emitter);
      if (emitterIdx >= 0) model.emitters.splice(emitterIdx, 1);
      runtimeNode.emitter.removeFromParent();
      runtimeNode.emitter = undefined;
    }

    if (runtimeNode.light) {
      if (model.context?.lightManager && runtimeNode.light instanceof OdysseyLight3D) {
        model.context.lightManager.removeLight(runtimeNode.light);
      }
      runtimeNode.light.removeFromParent();
      runtimeNode.light = undefined as any;
    }

    runtimeNode.controllers = sourceNode.controllers;
    runtimeNode.position.copy(sourceNode.position);
    runtimeNode.quaternion.copy(sourceNode.quaternion);

    if ((sourceNode.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      buildOdysseyNodeMesh(model, runtimeNode, sourceNode as any, model.options);
    }
    if ((sourceNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      runtimeNode.light = OdysseyModel3D.NodeLightBuilder(model, runtimeNode, sourceNode as any, model.options);
    }
    if ((sourceNode.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      runtimeNode.emitter = new OdysseyEmitter3D(sourceNode as any);
      runtimeNode.emitter.context = model.context;
      runtimeNode.emitter.name = sourceNode.name + '_em';
      runtimeNode.add(runtimeNode.emitter);
      model.emitters.push(runtimeNode.emitter);
    }

    runtimeNode.updateMatrixWorld(true);
    if (runtimeNode.mesh instanceof THREE.SkinnedMesh) {
      model.buildSkeleton();
    }
    return true;
  }

  rebuildSubtree(nodeUUID?: string): boolean {
    if (!nodeUUID) return false;
    const rootNode = this.model.nodesByUUID.get(nodeUUID);
    if (!rootNode) return false;
    rootNode.traverse((obj) => {
      if (!(obj instanceof OdysseyObject3D) || !obj.sourceNodeUUID) return;
      this.rebuildNode(obj.sourceNodeUUID);
    });
    return true;
  }

  rebuildFromSourceModel(): void {
    const model = this.model;
    const source = model.sourceModel;
    if (!source) return;
    const parent = model.parent;
    const context = model.context;
    const options = model.options || {};
    OdysseyModel3D.FromMDL(source, {
      ...options,
      context,
    }).then((rebuilt) => {
      if (!rebuilt || rebuilt === model) return;
      rebuilt.position.copy(model.position);
      rebuilt.quaternion.copy(model.quaternion);
      rebuilt.scale.copy(model.scale);
      if (parent) {
        parent.add(rebuilt);
        parent.remove(model);
      }
      model.dispatchEvent({
        type: 'odysseyInstanceReplaced',
        previous: model,
        next: rebuilt,
      } as THREE.Event);
      model.dispose();
    }).catch((e) => {
      console.error("OdysseyModel3D.rebuildFromSourceModel", e);
    });
  }
}
