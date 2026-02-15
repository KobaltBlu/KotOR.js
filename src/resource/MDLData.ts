/**
 * MDL (Model) data structures for KotOR.
 * In-memory representation of MDL/MDX model files.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file MDLData.ts
 * @license GPL-3.0
 */

import {
  MDLClassification,
  MDLGeometryType,
  MDLNodeFlags,
  MDLNodeType
} from '@/resource/MDLTypes';

/** 3D vector (x, y, z). */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** 4D vector / quaternion (x, y, z, w). */
export interface Vector4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 2D vector (e.g. UV). */
export interface Vector2 {
  x: number;
  y: number;
}

/** RGBA color. */
export interface MDLColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** One row of controller keyframe data (time + float array). */
export interface MDLControllerRow {
  time: number;
  data: number[];
}

/** Controller (animation curve for a property). */
export interface MDLController {
  controllerType: number;
  isBezier: boolean;
  rows: MDLControllerRow[];
}

/** Triangle face (vertex indices and optional t-vert indices). */
export interface MDLFace {
  v1: number;
  v2: number;
  v3: number;
  t1: number;
  t2: number;
  t3: number;
  material: number;
  smoothgroup: number;
}

/** Bone-vertex entry for skinned mesh. */
export interface MDLBoneVertex {
  boneIndex: number;
  boneWeight: number;
}

/** Light data attached to a node. */
export interface MDLLight {
  ambientOnly: boolean;
  dynamicType: number;
  affectDynamic: boolean;
  shadow: boolean;
  flare: boolean;
  lightPriority: number;
  fadingLight: boolean;
  flareRadius: number;
  flareSizes: number[];
  flarePositions: number[];
  flareColorShaders: string[];
  flareTextures: string[];
}

/** Particle emitter data. */
export interface MDLEmitter {
  deadSpace: number;
  blastLength: number;
  blastRadius: number;
  blastSpeed: number;
  branchCount: number;
  controlPointSmoothing: number;
  xGrid: number;
  yGrid: number;
  spawnType: number;
  updateType: number;
  renderType: number;
  blendType: number;
  texture: string;
  twinkleMin: number;
  twinkleMax: number;
  burstMultiplier: number;
  lifeExpectancy: number;
  midPoint: number;
  spread: number;
  mass: number;
  velocity: number;
  gravity: number;
  drag: number;
  randomVelocity: number;
  sizeStart: number;
  sizeMid: number;
  sizeEnd: number;
  sizeStartY: number;
  sizeMidY: number;
  sizeEndY: number;
  colorStart: MDLColor;
  colorMid: MDLColor;
  colorEnd: MDLColor;
  alphaStart: number;
  alphaMid: number;
  alphaEnd: number;
  alphaKey1: number;
  alphaKey2: number;
  alphaKey3: number;
  percentStart: number;
  percentMid: number;
  percentEnd: number;
  frameStart: number;
  frameEnd: number;
  fps: number;
  birthrate: number;
  randomBirthRate: number;
  bounceCo: number;
  combinetime: number;
  flags: number;
}

/** Reference to another model. */
export interface MDLReference {
  modelName: string;
  reattachable: boolean;
}

/** Constraint for dangly mesh. */
export interface MDLConstraint {
  stiffness: number;
  period: number;
  length: number;
}

/** Dangly (cloth) mesh extension. */
export interface MDLDangly {
  displacement: number;
  tightness: number;
  period: number;
  constraints: MDLConstraint[];
}

/** AABB node for walkmesh tree. */
export interface MDLAABBNode {
  bboxMin: Vector3;
  bboxMax: Vector3;
  faceIndex: number;
  leftChildOffset: number;
  rightChildOffset: number;
  unknown: number;
}

/** Walkmesh (AABB tree). */
export interface MDLWalkmesh {
  aabbs: MDLAABBNode[];
}

/** Saber blade mesh. */
export interface MDLSaber {
  bladeType: number;
  bladeRadius: number;
  bladeLength: number;
  flags: number;
}

/** Base mesh data (trimesh). */
export interface MDLMesh {
  texture1: string;
  texture2: string;
  transparencyHint: number;
  hasLightmap: boolean;
  rotateTexture: boolean;
  backgroundGeometry: boolean;
  shadow: boolean;
  beaming: boolean;
  render: boolean;
  dirtEnabled: boolean;
  dirtTexture: number;
  dirtCoordinateSpace: number;
  diffuse: Vector3;
  ambient: Vector3;
  bbMin: Vector3;
  bbMax: Vector3;
  radius: number;
  average: Vector3;
  area: number;
  vertexPositions: Vector3[];
  vertexNormals: Vector3[];
  vertexUv1: Vector2[];
  vertexUv2: Vector2[];
  faces: MDLFace[];
}

/** Skinned mesh (extends mesh with bone data). */
export interface MDLSkin extends MDLMesh {
  qbones: Vector4[];
  tbones: Vector3[];
  boneIndices: number[];
  vertexBones: MDLBoneVertex[][];
}

/** Animation event. */
export interface MDLEvent {
  time: number;
  name: string;
}

/** Animation (keyframe sequence with its own node tree). */
export interface MDLAnimation {
  name: string;
  rootModel: string;
  animLength: number;
  transitionLength: number;
  events: MDLEvent[];
  root: MDLNode;
}

/** A node in the MDL tree (can have mesh, light, emitter, children, etc.). */
export class MDLNode {
  name = '';
  nodeId = -1;
  parentId = -1;
  position: Vector3 = { x: 0, y: 0, z: 0 };
  orientation: Vector4 = { x: 0, y: 0, z: 0, w: 1 };
  nodeType: MDLNodeType = MDLNodeType.Dummy;
  children: MDLNode[] = [];
  controllers: MDLController[] = [];
  light: MDLLight | null = null;
  emitter: MDLEmitter | null = null;
  reference: MDLReference | null = null;
  mesh: MDLMesh | null = null;
  skin: MDLSkin | null = null;
  dangly: MDLDangly | null = null;
  aabb: MDLWalkmesh | null = null;
  saber: MDLSaber | null = null;

  getFlags(): number {
    let f = MDLNodeFlags.Header;
    if (this.light) f |= MDLNodeFlags.Light;
    if (this.emitter) f |= MDLNodeFlags.Emitter;
    if (this.reference) f |= MDLNodeFlags.Reference;
    if (this.mesh) f |= MDLNodeFlags.Mesh;
    if (this.skin) f |= MDLNodeFlags.Skin;
    if (this.dangly) f |= MDLNodeFlags.Dangly;
    if (this.aabb) f |= MDLNodeFlags.Aabb;
    if (this.saber) f |= MDLNodeFlags.Saber;
    return f;
  }

  /** Find direct child by name. */
  child(name: string): MDLNode {
    const c = this.children.find((n) => n.name === name);
    if (!c) throw new Error(`MDLNode: child "${name}" not found`);
    return c;
  }

  /** All descendants (this node + all children recursively). */
  descendants(): MDLNode[] {
    const out: MDLNode[] = [];
    for (const c of this.children) {
      out.push(c);
      out.push(...c.descendants());
    }
    return out;
  }
}

/** Root MDL model (root node + animations + header). */
export class MDL {
  name = '';
  fog = false;
  supermodel = '';
  geometryType: MDLGeometryType = MDLGeometryType.Normal;
  classification: MDLClassification = MDLClassification.Other;
  classificationUnk1 = 0;
  animationScale = 0.971;
  bmin: Vector3 = { x: -5, y: -5, z: -1 };
  bmax: Vector3 = { x: 5, y: 5, z: 10 };
  radius = 7.0;
  headlink = '';
  compressQuaternions = 0;
  root: MDLNode = new MDLNode();
  anims: MDLAnimation[] = [];

  get animations(): MDLAnimation[] {
    return this.anims;
  }
  set animations(v: MDLAnimation[]) {
    this.anims = v;
  }

  get rootNode(): MDLNode {
    return this.root;
  }
  set rootNode(v: MDLNode) {
    this.root = v;
  }

  /** Get node by name from the tree. */
  get(nodeName: string): MDLNode | null {
    const stack: MDLNode[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === undefined) break;
      if (node.name === nodeName) return node;
      stack.push(...node.children);
    }
    return null;
  }

  /** All nodes (root + descendants) in pre-order. */
  allNodes(): MDLNode[] {
    const out: MDLNode[] = [];
    const stack: MDLNode[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === undefined) break;
      out.push(node);
      stack.push(...node.children.slice().reverse());
    }
    return out;
  }

  /** Find parent of a node. */
  findParent(child: MDLNode): MDLNode | null {
    for (const node of this.allNodes()) {
      if (node.children.includes(child)) return node;
    }
    return null;
  }

  /** All unique texture names (texture1) from meshes. */
  allTextures(): Set<string> {
    const set = new Set<string>();
    for (const node of this.allNodes()) {
      const m = node.mesh ?? node.skin;
      if (m?.texture1 && m.texture1 !== 'NULL') set.add(m.texture1);
    }
    return set;
  }

  /** All unique lightmap texture names (texture2). */
  allLightmaps(): Set<string> {
    const set = new Set<string>();
    for (const node of this.allNodes()) {
      const m = node.mesh ?? node.skin;
      if (m?.texture2 && m.texture2 !== 'NULL') set.add(m.texture2);
    }
    return set;
  }
}
