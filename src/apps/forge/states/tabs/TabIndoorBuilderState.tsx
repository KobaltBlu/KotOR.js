import React from "react";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import { UI3DRenderer } from "../../UI3DRenderer";
import { IndoorMap, IndoorMapRoom, EmbeddedKit } from "../../data/IndoorMap";
import { Kit, KitComponent } from "../../data/IndoorKit";
import { loadKits } from "../../data/IndoorKitLoader";
import { IndoorMap3DScene } from "../../helpers/IndoorMap3DScene";
import { TabIndoorBuilder } from "../../components/tabs/tab-indoor-builder/TabIndoorBuilder";
import {
  INDOOR_DUPLICATE_OFFSET_X,
  INDOOR_DUPLICATE_OFFSET_Y,
  INDOOR_DUPLICATE_OFFSET_Z,
} from "../../data/IndoorBuilderConstants";
import * as THREE from "three";

export enum IndoorBuilderViewMode {
  TwoD = "2d",
  ThreeD = "3d",
}

export class TabIndoorBuilderState extends TabState {
  tabName: string = "Indoor Builder";
  map: IndoorMap = new IndoorMap();
  kits: Kit[] = [];
  embeddedKit: EmbeddedKit = new EmbeddedKit();
  selectedRooms: IndoorMapRoom[] = [];
  selectedKit: Kit | null = null;
  selectedComponent: KitComponent | null = null;
  viewMode: IndoorBuilderViewMode = IndoorBuilderViewMode.TwoD;
  ui3DRenderer: UI3DRenderer = new UI3DRenderer();
  scene3D: IndoorMap3DScene = new IndoorMap3DScene(this.ui3DRenderer);

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setKits([this.embeddedKit]);
    this.setContentView(<TabIndoorBuilder tab={this} />);
    this.saveTypes = [
      {
        description: "Indoor Map",
        accept: {
          "application/json": [".indoor"],
        },
      },
    ];
    this.openFile();
  }

  show(): void {
    super.show();
    if (this.viewMode === IndoorBuilderViewMode.ThreeD) {
      this.ui3DRenderer.enabled = true;
      this.ui3DRenderer.render();
    }
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  destroy(): void {
    this.scene3D.dispose();
    this.ui3DRenderer.destroy();
    super.destroy();
  }

  async openFile(file?: EditorFile): Promise<void> {
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }
    if (!file) {
      return;
    }
    this.file = file;
    this.tabName = file.getFilename();
    const response = await file.readFile();
    if (response?.buffer?.length) {
      this.map.load(response.buffer, this.kits);
      this.map.rebuildRoomConnections();
      await this.scene3D.syncRooms(this.map.rooms);
      this.processEventListener("onMapLoaded", [this.map]);
    }
  }

  async loadKitsFromPath(path: string): Promise<void> {
    const kits = await loadKits(path);
    this.setKits(kits);
  }

  setKits(kits: Kit[]): void {
    const merged = kits.filter((kit) => kit.id !== this.embeddedKit.id);
    merged.push(this.embeddedKit);
    this.kits = merged;
    if (!this.selectedKit && this.kits.length) {
      this.selectedKit = this.kits[0];
    }
    this.processEventListener("onKitsLoaded", [this.kits]);
  }

  setSelectedComponent(component: KitComponent | null): void {
    this.selectedComponent = component;
    this.processEventListener("onComponentSelected", [component]);
  }

  addRoomAt(position: THREE.Vector3): void {
    if (!this.selectedComponent) return;
    const room = new IndoorMapRoom(this.selectedComponent, position.clone(), 0, false, false);
    this.map.rooms.push(room);
    this.map.rebuildRoomConnections();
    this.selectedRooms = [room];
    this.markDirty();
    this.processEventListener("onMapChanged", [this.map]);
  }

  deleteSelectedRooms(): void {
    if (!this.selectedRooms.length) return;
    this.selectedRooms.forEach((room) => {
      const idx = this.map.rooms.indexOf(room);
      if (idx >= 0) {
        this.map.rooms.splice(idx, 1);
      }
    });
    this.selectedRooms = [];
    this.map.rebuildRoomConnections();
    this.markDirty();
    this.processEventListener("onMapChanged", [this.map]);
  }

  duplicateSelectedRooms(): void {
    if (!this.selectedRooms.length) return;
    const clones: IndoorMapRoom[] = [];
    this.selectedRooms.forEach((room) => {
      const clone = new IndoorMapRoom(
        room.component,
        room.position.clone().add(new THREE.Vector3(INDOOR_DUPLICATE_OFFSET_X, INDOOR_DUPLICATE_OFFSET_Y, INDOOR_DUPLICATE_OFFSET_Z)),
        room.rotation,
        room.flipX,
        room.flipY
      );
      clones.push(clone);
      this.map.rooms.push(clone);
    });
    this.selectedRooms = clones;
    this.map.rebuildRoomConnections();
    this.markDirty();
    this.processEventListener("onMapChanged", [this.map]);
  }

  rotateSelectedRooms(degrees: number): void {
    if (!this.selectedRooms.length) return;
    this.selectedRooms.forEach((room) => {
      room.rotation = (room.rotation + degrees) % 360;
    });
    this.map.rebuildRoomConnections();
    this.markDirty();
    this.processEventListener("onMapChanged", [this.map]);
  }

  flipSelectedRooms(flipX: boolean, flipY: boolean): void {
    if (!this.selectedRooms.length) return;
    this.selectedRooms.forEach((room) => {
      if (flipX) room.flipX = !room.flipX;
      if (flipY) room.flipY = !room.flipY;
    });
    this.map.rebuildRoomConnections();
    this.markDirty();
    this.processEventListener("onMapChanged", [this.map]);
  }

  setSelectedRooms(rooms: IndoorMapRoom[]): void {
    this.selectedRooms = rooms;
    this.processEventListener("onSelectionChanged", [rooms]);
  }

  setViewMode(mode: IndoorBuilderViewMode): void {
    this.viewMode = mode;
    this.ui3DRenderer.enabled = mode === IndoorBuilderViewMode.ThreeD;
    if (this.ui3DRenderer.enabled) {
      this.ui3DRenderer.render();
    }
    this.processEventListener("onViewModeChanged", [mode]);
  }

  async sync3D(): Promise<void> {
    await this.scene3D.syncRooms(this.map.rooms);
  }

  async getExportBuffer(): Promise<Uint8Array> {
    return this.map.write();
  }

  updateFile(): void {
    if (this.file) {
      this.file.unsaved_changes = true;
      this.editorFileUpdated();
    }
  }

  private markDirty(): void {
    this.updateFile();
    this.sync3D();
  }
}
