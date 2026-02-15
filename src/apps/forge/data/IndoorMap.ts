import * as THREE from "three";

import { Kit, KitComponent, KitComponentHook, KitDoor } from "@/apps/forge/data/IndoorKit";
import { IndoorLocalizedString, ColorRGB } from "@/apps/forge/data/IndoorTypes";
import { cloneWalkmesh, cloneWalkmeshFromBuffer, applyWalkmeshTransform } from "@/apps/forge/data/IndoorWalkmesh";

export type DoorInsertion = {
  door: KitDoor;
  room: IndoorMapRoom;
  room2: IndoorMapRoom | null;
  static: boolean;
  position: THREE.Vector3;
  rotation: number;
  hook1: KitComponentHook;
  hook2: KitComponentHook | null;
};

export type MissingRoomInfo = {
  kitName: string;
  componentName: string | null;
  reason: "kit_missing" | "component_missing";
};

export type EmbeddedComponentData = {
  id: string;
  name: string;
  bwm: string;
  mdl: string;
  mdx: string;
  hooks: Array<{ position: number[]; rotation: number; edge: number }>;
};

export type RoomData = {
  position: number[];
  rotation: number;
  flip_x: boolean;
  flip_y: boolean;
  kit: string;
  component: string;
  module_root?: string;
  walkmesh_override?: string;
};

export type IndoorMapData = {
  module_id: string;
  name: Record<string, unknown>;
  lighting: number[];
  skybox: string;
  warp: string;
  rooms: RoomData[];
  target_game_type?: boolean;
  embedded_components?: EmbeddedComponentData[];
};

const EMBEDDED_KIT_ID = "__embedded__";

export class EmbeddedKit extends Kit {
  isEmbeddedKit = true;
  constructor() {
    super("Embedded", EMBEDDED_KIT_ID);
    const blank = new Uint8Array(0);
    const door = new KitDoor("sw_door", "sw_door", blank, blank, 2, 3);
    this.doors.push(door);
  }
}

const toBase64 = (data: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }
  let binary = "";
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (data: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(data, "base64"));
  }
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureEmbeddedKit = (kits: Kit[]): EmbeddedKit => {
  const existing = kits.find((kit) => kit.id === EMBEDDED_KIT_ID);
  if (existing instanceof EmbeddedKit) {
    return existing;
  }
  if (existing) {
    kits.splice(kits.indexOf(existing), 1);
  }
  const embedded = new EmbeddedKit();
  kits.push(embedded);
  return embedded;
};

export class IndoorMap {
  rooms: IndoorMapRoom[] = [];
  moduleId = "test01";
  name: IndoorLocalizedString = IndoorLocalizedString.fromEnglish("New Module");
  lighting: ColorRGB = { r: 0.5, g: 0.5, b: 0.5 };
  skybox = "";
  warpPoint: THREE.Vector3 = new THREE.Vector3();
  targetGameType: boolean | null = null;

  rebuildRoomConnections(): void {
    this.rooms.forEach((room) => room.rebuildConnections(this.rooms));
  }

  doorInsertions(): DoorInsertion[] {
    const points: THREE.Vector3[] = [];
    const insertions: DoorInsertion[] = [];

    this.rooms.forEach((room) => {
      room.hooks.forEach((connection, hookIndex) => {
        let room1 = room;
        let room2: IndoorMapRoom | null = null;
        let hook1 = room1.component.hooks[hookIndex];
        let hook2: KitComponentHook | null = null;
        let door = hook1.door;
        const position = room1.hookPosition(hook1);
        let rotation = hook1.rotation + room1.rotation;

        if (connection) {
          connection.hooks.forEach((otherRoom, otherHookIndex) => {
            if (otherRoom !== room1) return;
            const otherHook = connection.component.hooks[otherHookIndex];
            if (hook1.door.width < otherHook.door.width) {
              door = otherHook.door;
              hook2 = hook1;
              hook1 = otherHook;
              room2 = room1;
              room1 = connection;
            } else {
              hook2 = otherHook;
              room2 = connection;
              rotation = hook2.rotation + room2.rotation;
            }
          });
        }

        if (!points.find((p) => p.distanceTo(position) < 0.0001)) {
          points.push(position.clone());
          insertions.push({
            door,
            room: room1,
            room2,
            static: connection == null,
            position,
            rotation,
            hook1,
            hook2,
          });
        }
      });
    });

    return insertions;
  }

  write(): Uint8Array {
    const nameData = this.name.toJson();
    const data: IndoorMapData = {
      module_id: this.moduleId,
      name: nameData,
      lighting: [this.lighting.r, this.lighting.g, this.lighting.b],
      skybox: this.skybox,
      warp: this.moduleId,
      rooms: [],
    };
    if (this.targetGameType !== null) {
      data.target_game_type = this.targetGameType;
    }

    const embeddedComponents: Record<string, EmbeddedComponentData> = {};

    this.rooms.forEach((room) => {
      const roomData: RoomData = {
        position: [room.position.x, room.position.y, room.position.z],
        rotation: room.rotation,
        flip_x: room.flipX,
        flip_y: room.flipY,
        kit: room.component.kit.id,
        component: room.component.id,
      };
      if (room.component.kit.id === EMBEDDED_KIT_ID) {
        const id = String(room.component.id);
        if (!embeddedComponents[id]) {
          embeddedComponents[id] = {
            id,
            name: room.component.name,
            bwm: toBase64(room.component.bwmRaw),
            mdl: toBase64(room.component.mdl),
            mdx: toBase64(room.component.mdx),
            hooks: room.component.hooks.map((hook) => ({
              position: [hook.position.x, hook.position.y, hook.position.z],
              rotation: hook.rotation,
              edge: hook.edge,
            })),
          };
        }
      }
      if (room.walkmeshOverride) {
        roomData.walkmesh_override = toBase64(room.walkmeshOverride.toExportBuffer());
      }
      data.rooms.push(roomData);
    });

    if (Object.keys(embeddedComponents).length) {
      data.embedded_components = Object.values(embeddedComponents);
    }

    return new TextEncoder().encode(JSON.stringify(data, null, 2));
  }

  load(raw: Uint8Array, kits: Kit[]): MissingRoomInfo[] {
    this.reset();
    const data = JSON.parse(new TextDecoder("utf8").decode(raw)) as IndoorMapData;
    return this.loadFromData(data, kits);
  }

  loadFromData(data: IndoorMapData, kits: Kit[]): MissingRoomInfo[] {
    const missingRooms: MissingRoomInfo[] = [];
    if (data.name && typeof data.name === "object") {
      this.name = IndoorLocalizedString.fromJson(data.name as Record<string, unknown>);
    }
    if (Array.isArray(data.lighting)) {
      this.lighting = {
        r: Number(data.lighting[0] ?? this.lighting.r),
        g: Number(data.lighting[1] ?? this.lighting.g),
        b: Number(data.lighting[2] ?? this.lighting.b),
      };
    }
    this.moduleId = data.warp || data.module_id || "test01";
    this.skybox = data.skybox || "";
    this.targetGameType = typeof data.target_game_type === "boolean" ? data.target_game_type : null;

    const embeddedList = data.embedded_components || [];
    if (embeddedList.length) {
      const embeddedKit = ensureEmbeddedKit(kits);
      const existingById = new Map<string, KitComponent>();
      embeddedKit.components.forEach((component) => existingById.set(component.id, component));

      embeddedList.forEach((compData) => {
        try {
          const compId = String(compData.id);
          const name = compData.name || compId;
          const bwmRaw = fromBase64(compData.bwm);
          const mdl = compData.mdl ? fromBase64(compData.mdl) : new Uint8Array(0);
          const mdx = compData.mdx ? fromBase64(compData.mdx) : new Uint8Array(0);
          const bwm = cloneWalkmeshFromBuffer(bwmRaw);
          const component = new KitComponent(embeddedKit, name, compId, bwm, bwmRaw, mdl, mdx);
          component.hooks = [];
          compData.hooks.forEach((hookData) => {
            const pos = hookData.position;
            const hook = new KitComponentHook(
              new THREE.Vector3(Number(pos[0]), Number(pos[1]), Number(pos[2])),
              Number(hookData.rotation ?? 0),
              Number(hookData.edge ?? 0),
              embeddedKit.doors[0]
            );
            component.hooks.push(hook);
          });
          const existingComp = existingById.get(compId);
          if (existingComp !== undefined) {
            const index = embeddedKit.components.indexOf(existingComp);
            embeddedKit.components[index] = component;
            existingById.set(compId, component);
          } else {
            embeddedKit.components.push(component);
            existingById.set(compId, component);
          }
        } catch {
          return;
        }
      });
    }

    (data.rooms || []).forEach((roomData) => {
      const kitId = roomData.kit;
      const compId = roomData.component;
      const kit = kits.find((entry) => entry.id === kitId);
      if (!kit) {
        missingRooms.push({ kitName: kitId, componentName: compId, reason: "kit_missing" });
        return;
      }
      const component = kit.components.find((entry) => entry.id === compId);
      if (!component) {
        missingRooms.push({ kitName: kitId, componentName: compId, reason: "component_missing" });
        return;
      }
      const room = new IndoorMapRoom(
        component,
        new THREE.Vector3(roomData.position[0], roomData.position[1], roomData.position[2]),
        Number(roomData.rotation ?? 0),
        Boolean(roomData.flip_x),
        Boolean(roomData.flip_y)
      );
      if (roomData.walkmesh_override) {
        try {
          room.walkmeshOverride = cloneWalkmeshFromBuffer(fromBase64(roomData.walkmesh_override));
        } catch {
          return;
        }
      }
      this.rooms.push(room);
    });

    return missingRooms;
  }

  reset(): void {
    this.rooms = [];
    this.moduleId = "test01";
    this.name = IndoorLocalizedString.fromEnglish("New Module");
    this.lighting = { r: 0.5, g: 0.5, b: 0.5 };
    this.targetGameType = null;
  }
}

export class IndoorMapRoom {
  component: KitComponent;
  position: THREE.Vector3;
  rotation: number;
  hooks: Array<IndoorMapRoom | null>;
  flipX: boolean;
  flipY: boolean;
  walkmeshOverride: import("../KotOR").OdysseyWalkMesh | null = null;

  constructor(component: KitComponent, position: THREE.Vector3, rotation: number, flipX: boolean, flipY: boolean) {
    this.component = component;
    this.position = position;
    this.rotation = rotation;
    this.flipX = flipX;
    this.flipY = flipY;
    this.hooks = Array.from<IndoorMapRoom | null>({ length: component.hooks.length }, () => null);
  }

  hookPosition(hook: KitComponentHook, worldOffset = true): THREE.Vector3 {
    const pos = hook.position.clone();
    pos.x = this.flipX ? -pos.x : pos.x;
    pos.y = this.flipY ? -pos.y : pos.y;
    const temp = pos.clone();
    const cos = Math.cos((this.rotation * Math.PI) / 180);
    const sin = Math.sin((this.rotation * Math.PI) / 180);
    pos.x = temp.x * cos - temp.y * sin;
    pos.y = temp.x * sin + temp.y * cos;
    if (worldOffset) {
      pos.add(this.position);
    }
    return pos;
  }

  rebuildConnections(rooms: IndoorMapRoom[]): void {
    this.hooks = Array.from<IndoorMapRoom | null>({ length: this.component.hooks.length }, () => null);
    this.component.hooks.forEach((hook, hookIndex) => {
      const hookPos = this.hookPosition(hook);
      rooms.forEach((otherRoom) => {
        if (otherRoom === this) return;
        otherRoom.component.hooks.forEach((otherHook) => {
          const otherPos = otherRoom.hookPosition(otherHook);
          if (hookPos.distanceTo(otherPos) < 0.001) {
            this.hooks[hookIndex] = otherRoom;
          }
        });
      });
    });
  }

  baseWalkmesh(): import("../KotOR").OdysseyWalkMesh {
    return this.walkmeshOverride || this.component.bwm;
  }

  walkmesh(): import("../KotOR").OdysseyWalkMesh {
    const walkmesh = cloneWalkmesh(this.baseWalkmesh());
    applyWalkmeshTransform(walkmesh, {
      position: this.position,
      rotationDegrees: this.rotation,
      flipX: this.flipX,
      flipY: this.flipY,
    });
    return walkmesh;
  }
}
