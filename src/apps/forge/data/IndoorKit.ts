import * as THREE from 'three';

import { CaseInsensitiveMap } from '@/apps/forge/data/CaseInsensitiveMap';
import type { OdysseyWalkMesh } from '@/apps/forge/KotOR';

export class Kit {
  name: string;
  id: string;
  components: KitComponent[] = [];
  doors: KitDoor[] = [];
  textures: CaseInsensitiveMap<Uint8Array> = new CaseInsensitiveMap();
  lightmaps: CaseInsensitiveMap<Uint8Array> = new CaseInsensitiveMap();
  txis: CaseInsensitiveMap<Uint8Array> = new CaseInsensitiveMap();
  always: Map<string, Uint8Array> = new Map();
  sidePadding: Map<number, Map<number, MDLMDXTuple>> = new Map();
  topPadding: Map<number, Map<number, MDLMDXTuple>> = new Map();
  skyboxes: Map<string, MDLMDXTuple> = new Map();

  constructor(name: string, kitId: string) {
    this.name = name;
    this.id = kitId;
  }
}

export class KitComponent {
  kit: Kit;
  id: string;
  name: string;
  hooks: KitComponentHook[] = [];
  bwm: OdysseyWalkMesh;
  bwmRaw: Uint8Array;
  mdl: Uint8Array;
  mdx: Uint8Array;
  defaultPosition: THREE.Vector3 = new THREE.Vector3();
  image: HTMLCanvasElement | ImageBitmap | null = null;

  constructor(
    kit: Kit,
    name: string,
    componentId: string,
    bwm: OdysseyWalkMesh,
    bwmRaw: Uint8Array,
    mdl: Uint8Array,
    mdx: Uint8Array
  ) {
    this.kit = kit;
    this.id = componentId;
    this.name = name;
    this.bwm = bwm;
    this.bwmRaw = bwmRaw;
    this.mdl = mdl;
    this.mdx = mdx;
  }
}

export class KitComponentHook {
  position: THREE.Vector3;
  rotation: number;
  edge: number;
  door: KitDoor;

  constructor(position: THREE.Vector3, rotation: number, edge: number, door: KitDoor) {
    this.position = position;
    this.rotation = rotation;
    this.edge = edge;
    this.door = door;
  }
}

export class KitDoor {
  utdK1: Uint8Array;
  utdK2: Uint8Array;
  utdK1ResRef: string;
  utdK2ResRef: string;
  width: number;
  height: number;

  constructor(
    utdK1ResRef: string,
    utdK2ResRef: string,
    utdK1: Uint8Array,
    utdK2: Uint8Array,
    width: number,
    height: number
  ) {
    this.utdK1ResRef = utdK1ResRef;
    this.utdK2ResRef = utdK2ResRef;
    this.utdK1 = utdK1;
    this.utdK2 = utdK2;
    this.width = width;
    this.height = height;
  }

  get utd(): Uint8Array {
    return this.utdK1;
  }
}

export type MDLMDXTuple = {
  mdl: Uint8Array;
  mdx: Uint8Array;
};
