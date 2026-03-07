import * as THREE from "three";

import { IndoorMapRoom } from "@/apps/forge/data/IndoorMap";
import { cloneWalkmesh } from "@/apps/forge/data/IndoorWalkmesh";
import { OdysseyModel, OdysseyModel3D, OdysseyWalkMesh } from "@/apps/forge/KotOR";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { BinaryReader } from "@/utility/binary/BinaryReader";


export class IndoorMap3DRoom {
  room: IndoorMapRoom;
  group: THREE.Group = new THREE.Group();
  model?: OdysseyModel3D;
  walkmesh?: OdysseyWalkMesh;
  private loadingModel = false;

  constructor(room: IndoorMapRoom) {
    this.room = room;
    this.group.name = `IndoorRoom:${room.component.id}`;
  }

  async loadModel(context: UI3DRenderer): Promise<void> {
    if (this.loadingModel) return;
    if (!this.room.component.mdl?.length) return;
    this.loadingModel = true;
    try {
      const mdlReader = new BinaryReader(this.room.component.mdl);
      const mdxReader = new BinaryReader(this.room.component.mdx);
      const odysseyModel = new OdysseyModel(mdlReader, mdxReader);
      const model = await OdysseyModel3D.FromMDL(odysseyModel, {
        context,
        editorMode: true,
      });
      this.model = model;
      this.group.add(model);
    } finally {
      this.loadingModel = false;
    }
  }

  buildWalkmesh(): void {
    const walkmesh = cloneWalkmesh(this.room.baseWalkmesh());
    walkmesh.material.visible = true;
    walkmesh.material.transparent = true;
    walkmesh.material.opacity = 0.6;
    walkmesh.material.side = THREE.DoubleSide;
    this.walkmesh = walkmesh;
    this.group.add(walkmesh.mesh);
  }

  updateTransform(): void {
    this.group.position.set(this.room.position.x, this.room.position.y, this.room.position.z);
    this.group.rotation.set(0, 0, (this.room.rotation * Math.PI) / 180);
    this.group.scale.set(this.room.flipX ? -1 : 1, this.room.flipY ? -1 : 1, 1);
  }

  dispose(): void {
    if (this.model) {
      this.model.removeFromParent();
      this.model.dispose();
      this.model = undefined;
    }
    if (this.walkmesh) {
      this.walkmesh.mesh.removeFromParent();
      this.walkmesh.mesh.geometry.dispose();
      (this.walkmesh.mesh.material as THREE.Material).dispose();
      this.walkmesh = undefined;
    }
    this.group.removeFromParent();
  }
}

export class IndoorMap3DScene {
  renderer: UI3DRenderer;
  roomObjects: Map<IndoorMapRoom, IndoorMap3DRoom> = new Map();

  constructor(renderer: UI3DRenderer) {
    this.renderer = renderer;
  }

  async syncRooms(rooms: IndoorMapRoom[]): Promise<void> {
    const existing = new Set(this.roomObjects.keys());
    rooms.forEach((room) => {
      if (this.roomObjects.has(room)) {
        existing.delete(room);
        return;
      }
      const roomObject = new IndoorMap3DRoom(room);
      roomObject.buildWalkmesh();
      roomObject.updateTransform();
      this.roomObjects.set(room, roomObject);
      this.renderer.scene.add(roomObject.group);
      roomObject.loadModel(this.renderer);
    });

    existing.forEach((room) => {
      const obj = this.roomObjects.get(room);
      if (obj) {
        obj.dispose();
      }
      this.roomObjects.delete(room);
    });

    rooms.forEach((room) => {
      const obj = this.roomObjects.get(room);
      if (obj) {
        obj.updateTransform();
      }
    });
  }

  dispose(): void {
    this.roomObjects.forEach((room) => room.dispose());
    this.roomObjects.clear();
  }
}
