import * as THREE from 'three';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { OdysseyModelEngine } from '@/enums/odyssey/OdysseyModelEngine';
import { OdysseyModelClass } from '@/enums/odyssey/OdysseyModelClass';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { OdysseyModelMDXFlag } from '@/enums/odyssey/OdysseyModelMDXFlag';
import { OdysseyModelNodeType } from '@/enums/odyssey/OdysseyModelNodeType';
import type { IOdysseyControllerFrameGeneric } from '@/interface/odyssey/controller/IOdysseyControllerFrameGeneric';
import type { IOdysseyControllerGeneric } from '@/interface/odyssey/controller/IOdysseyControllerGeneric';
import type { IOdysseyModelAABBNode } from '@/interface/odyssey/IOdysseyModelAABBNode';
import { OdysseyModelEmitterFlag } from '@/enums/odyssey/OdysseyModelEmitterFlag';
import { OdysseyModel } from '@/odyssey/OdysseyModel';
import { OdysseyModelAnimation } from '@/odyssey/OdysseyModelAnimation';
import { OdysseyModelAnimationNode } from '@/odyssey/OdysseyModelAnimationNode';
import { OdysseyModelNode } from '@/odyssey/OdysseyModelNode';
import { OdysseyModelNodeAABB } from '@/odyssey/OdysseyModelNodeAABB';
import { OdysseyModelNodeDangly } from '@/odyssey/OdysseyModelNodeDangly';
import { OdysseyModelNodeEmitter } from '@/odyssey/OdysseyModelNodeEmitter';
import { OdysseyModelNodeLight } from '@/odyssey/OdysseyModelNodeLight';
import { OdysseyModelNodeMesh } from '@/odyssey/OdysseyModelNodeMesh';
import { OdysseyModelNodeReference } from '@/odyssey/OdysseyModelNodeReference';
import { OdysseyModelNodeSaber } from '@/odyssey/OdysseyModelNodeSaber';
import { OdysseyModelNodeSkin } from '@/odyssey/OdysseyModelNodeSkin';
import { OdysseyControllerFactory } from '@/odyssey/controllers/OdysseyControllerFactory';
import { OdysseyWalkMesh } from '@/odyssey/OdysseyWalkMesh';
import { OdysseyFace3 } from '@/three/odyssey/OdysseyFace3';
import {
  asciiClassificationToEnum,
  asciiControllerBaseToType,
  axisAngleToQuaternion,
  parseControllerKeyHeader,
} from '@/odyssey/export/odysseyModelAsciiParseMaps';
import {
  MdlAsciiParseError,
  MdlAsciiTokenStream,
  tokenizeMdlAscii,
  type AsciiToken,
} from '@/odyssey/export/odysseyModelAsciiTokenizer';

const FN_PTR_PC_K1_MODEL = 4273776;

function applyEngineFromFunctionPointer0(model: OdysseyModel): void {
  const fp = model.geometryHeader.functionPointer0;
  switch (fp) {
    case 4273776:
      model.engine = OdysseyModelEngine.K1;
      break;
    case 4285200:
      model.engine = OdysseyModelEngine.K2;
      break;
    case 4254992:
      model.engine = OdysseyModelEngine.K1_XBOX;
      break;
    case 4285872:
      model.engine = OdysseyModelEngine.K2_XBOX;
      break;
    default:
      break;
  }
}

function cleanName(s: string): string {
  return s
    .replace(/\0[\s\S]*$/g, '')
    .toLowerCase()
    .trim();
}

function collectGeometryNames(tokens: AsciiToken[]): string[] {
  const names: string[] = [];
  let i = 0;
  let inGeom = false;
  while (i < tokens.length) {
    const w = tokens[i].text.toLowerCase();
    if (w === 'beginmodelgeom') {
      inGeom = true;
      i++;
      continue;
    }
    if (w === 'endmodelgeom') break;
    if (inGeom && w === 'node' && i + 2 < tokens.length) {
      names.push(cleanName(tokens[i + 2].text));
      i += 3;
      continue;
    }
    if (inGeom && w === 'name' && i + 1 < tokens.length) {
      names.push(cleanName(tokens[i + 1].text));
      i += 2;
      continue;
    }
    i++;
  }
  return names;
}

function nodeKindToType(kind: string): OdysseyModelNodeType {
  const k = kind.toLowerCase();
  switch (k) {
    case 'dummy':
      return OdysseyModelNodeType.Header;
    case 'trimesh':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Mesh;
    case 'skin':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Mesh | OdysseyModelNodeType.Skin;
    case 'danglymesh':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Mesh | OdysseyModelNodeType.Dangly;
    case 'aabb':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Mesh | OdysseyModelNodeType.AABB;
    case 'lightsaber':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Mesh | OdysseyModelNodeType.Saber;
    case 'emitter':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Emitter;
    case 'light':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Light;
    case 'reference':
      return OdysseyModelNodeType.Header | OdysseyModelNodeType.Reference;
    default:
      return OdysseyModelNodeType.Header;
  }
}

function instantiateNode(kind: string, parent: OdysseyModelNode | undefined): OdysseyModelNode {
  const p = parent as OdysseyModelNode;
  const k = kind.toLowerCase();
  if (k === 'trimesh') return new OdysseyModelNodeMesh(p);
  if (k === 'skin') return new OdysseyModelNodeSkin(p);
  if (k === 'danglymesh') return new OdysseyModelNodeDangly(p);
  if (k === 'aabb') return new OdysseyModelNodeAABB(p);
  if (k === 'lightsaber') return new OdysseyModelNodeSaber(p);
  if (k === 'emitter') return new OdysseyModelNodeEmitter(p);
  if (k === 'light') return new OdysseyModelNodeLight(p);
  if (k === 'reference') return new OdysseyModelNodeReference(p);
  return new OdysseyModelNode(p);
}

function createAsciiShell(): OdysseyModel {
  const m = Object.create(OdysseyModel.prototype) as OdysseyModel;
  m.mdlReader = new BinaryReader(new Uint8Array(0));
  m.mdxReader = new BinaryReader(new Uint8Array(0));
  m.fileHeader = {
    flagBinary: 0,
    mdlDataSize: 0,
    mdxDataSize: 0,
    modelDataOffset: 12,
    rawDataOffset: 12,
  } as OdysseyModel['fileHeader'];
  m.geometryHeader = {
    functionPointer0: FN_PTR_PC_K1_MODEL,
    functionPointer1: FN_PTR_PC_K1_MODEL,
    modelName: '',
    rootNodeOffset: 0,
    nodeCount: 0,
    unknown1ArrayDefinition: { offset: 0, count: 0, count2: 0 },
    unknown2ArrayDefinition: { offset: 0, count: 0, count2: 0 },
    refCount: 0,
    geometryType: 0,
    unknown4: new Uint8Array(3),
    mdxOffset: 0,
    mdxLength: 0,
    padding: 0,
    rootNodeOffset2: 0,
  } as OdysseyModel['geometryHeader'];
  m.modelHeader = {
    classification: OdysseyModelClass.OTHER,
    subClassification: 0,
    smoothing: false,
    fogged: false,
    childModelCount: 0,
    animationArrayDefinition: { offset: 0, count: 0, count2: 0 },
    parentModelPointer: 0,
    boundingMinX: 0,
    boundingMinY: 0,
    boundingMinZ: 0,
    boundingMaxX: 0,
    boundingMaxY: 0,
    boundingMaxZ: 0,
    radius: 0,
    scale: 1,
    smoothingGroupsInFile: false,
    superModelName: '',
  } as OdysseyModel['modelHeader'];
  m.engine = OdysseyModelEngine.K1;
  m.names = [];
  m.nodes = new Map();
  m.animations = [];
  m.namesArrayDefinition = { offset: 0, count: 0, count2: 0 };
  m.nameOffsetsArray = [];
  return m;
}

function buildFaceFromVerts(
  verts: number[],
  ia: number,
  ib: number,
  ic: number,
  materialIndex: number,
  smoothingGroup?: number
): OdysseyFace3 {
  const va = new THREE.Vector3(verts[ia * 3], verts[ia * 3 + 1], verts[ia * 3 + 2]);
  const vb = new THREE.Vector3(verts[ib * 3], verts[ib * 3 + 1], verts[ib * 3 + 2]);
  const vc = new THREE.Vector3(verts[ic * 3], verts[ic * 3 + 1], verts[ic * 3 + 2]);
  const e1 = new THREE.Vector3().subVectors(vb, va);
  const e2 = new THREE.Vector3().subVectors(vc, va);
  const n = new THREE.Vector3().crossVectors(e1, e2);
  if (n.lengthSq() > 1e-20) n.normalize();
  const planeD = -n.dot(va);
  const f = new OdysseyFace3(ia, ib, ic, n, undefined, materialIndex);
  f.distance = planeD;
  f.adjacent = [-1, -1, -1];
  f.color = OdysseyWalkMesh.colorForMaterialIndex(materialIndex);
  if (smoothingGroup !== undefined) f.smoothingGroup = smoothingGroup >>> 0;
  return f;
}

function putStaticController(
  node: OdysseyModelNode,
  type: OdysseyModelControllerType,
  columnCount: number,
  frames: IOdysseyControllerFrameGeneric[]
): void {
  const gen: IOdysseyControllerGeneric = {
    type,
    nodeType: node.nodeType,
    frameCount: frames.length,
    timeKeyIndex: 0,
    dataValueIndex: 0,
    columnCount,
    data: frames,
  };
  const c = OdysseyControllerFactory.From(gen);
  if (c) node.controllers.set(type, c);
}

function applyGeometryController(node: OdysseyModelNode, word: string, s: MdlAsciiTokenStream): boolean {
  const w = word.toLowerCase();
  if (w === 'position') {
    const x = s.takeNumber();
    const y = s.takeNumber();
    const z = s.takeNumber();
    node.position.set(x, y, z);
    return true;
  }
  if (w === 'orientation') {
    const ax = s.takeNumber();
    const ay = s.takeNumber();
    const az = s.takeNumber();
    const ang = s.takeNumber();
    const q = axisAngleToQuaternion(ax, ay, az, ang);
    node.quaternion.copy(q);
    return true;
  }
  if (w === 'scale') {
    const sc = s.takeNumber();
    const gen: IOdysseyControllerGeneric = {
      type: OdysseyModelControllerType.Scale,
      nodeType: node.nodeType,
      frameCount: 1,
      timeKeyIndex: 0,
      dataValueIndex: 0,
      columnCount: 1,
      data: [{ time: 0, value: sc } as IOdysseyControllerFrameGeneric],
    };
    const c = OdysseyControllerFactory.From(gen);
    if (c) node.controllers.set(OdysseyModelControllerType.Scale, c);
    return true;
  }

  const mapped = asciiControllerBaseToType(w, node.nodeType);
  if (!mapped) return false;
  const { type } = mapped;

  if (w === 'selfillumcolor' && node.nodeType & OdysseyModelNodeType.Mesh) {
    const x = s.takeNumber();
    const y = s.takeNumber();
    const z = s.takeNumber();
    putStaticController(node, OdysseyModelControllerType.SelfIllumColor, 3, [
      { time: 0, x, y, z } as IOdysseyControllerFrameGeneric,
    ]);
    return true;
  }
  if (w === 'alpha' && node.nodeType & OdysseyModelNodeType.Mesh) {
    const v = s.takeNumber();
    putStaticController(node, OdysseyModelControllerType.Alpha, 1, [
      { time: 0, value: v } as IOdysseyControllerFrameGeneric,
    ]);
    return true;
  }
  if (w === 'color' && node.nodeType & OdysseyModelNodeType.Light) {
    const r = s.takeNumber();
    const g = s.takeNumber();
    const b = s.takeNumber();
    const light = node as OdysseyModelNodeLight;
    light.color = new THREE.Color(r, g, b);
    putStaticController(node, OdysseyModelControllerType.Color, 3, [
      { time: 0, x: r, y: g, z: b } as IOdysseyControllerFrameGeneric,
    ]);
    return true;
  }
  if (
    (w === 'radius' || w === 'shadowradius' || w === 'verticaldisplacement' || w === 'multiplier') &&
    node.nodeType & OdysseyModelNodeType.Light
  ) {
    const v = s.takeNumber();
    const light = node as OdysseyModelNodeLight;
    const lt = type;
    if (lt === OdysseyModelControllerType.Radius) light.radius = v;
    if (lt === OdysseyModelControllerType.Multiplier) light.multiplier = v;
    putStaticController(node, lt, 1, [{ time: 0, value: v } as IOdysseyControllerFrameGeneric]);
    return true;
  }

  if (node.nodeType & OdysseyModelNodeType.Emitter) {
    if (w === 'colorstart' || w === 'colormid' || w === 'colorend') {
      const x = s.takeNumber();
      const y = s.takeNumber();
      const z = s.takeNumber();
      putStaticController(node, type, 3, [{ time: 0, x, y, z } as IOdysseyControllerFrameGeneric]);
      return true;
    }
    const v = s.takeNumber();
    putStaticController(node, type, 1, [{ time: 0, value: v } as IOdysseyControllerFrameGeneric]);
    return true;
  }

  return false;
}

function parseSkinWeights(
  model: OdysseyModel,
  skin: OdysseyModelNodeSkin,
  s: MdlAsciiTokenStream,
  nVerts: number
): void {
  skin.weights = new Array(nVerts * 4).fill(0);
  skin.boneIdx = new Array(nVerts * 4).fill(0);
  skin.bone_parts = new Array(17).fill(0);
  const boneKeyToSlot = new Map<string, number>();
  let nextSlot = 0;

  function slotForBoneName(boneToken: string): number {
    const key = cleanName(boneToken);
    const existing = boneKeyToSlot.get(key);
    if (existing !== undefined) return existing;
    if (nextSlot >= 17) return 0;
    const ni = model.names.indexOf(key);
    skin.bone_parts[nextSlot] = ni >= 0 ? ni : 0;
    boneKeyToSlot.set(key, nextSlot);
    return nextSlot++;
  }

  for (let vi = 0; vi < nVerts; vi++) {
    const lineNum = s.peek()?.line;
    if (lineNum === undefined) break;
    let k = 0;
    while (k < 4 && s.peek() && s.peek()!.line === lineNum) {
      const boneTok = s.take().text;
      const wgt = s.takeNumber();
      const slot = slotForBoneName(boneTok);
      skin.boneIdx[vi * 4 + k] = slot;
      skin.weights[vi * 4 + k] = wgt;
      k++;
    }
  }
}

function parseAabbPreorder(s: MdlAsciiTokenStream, faces: OdysseyFace3[]): IOdysseyModelAABBNode | undefined {
  const p = s.peek();
  if (!p || p.text.toLowerCase() === 'roomlinks') return undefined;

  const minx = s.takeNumber();
  const miny = s.takeNumber();
  const minz = s.takeNumber();
  const maxx = s.takeNumber();
  const maxy = s.takeNumber();
  const maxz = s.takeNumber();
  const faceIdx = s.takeInt();

  const node: IOdysseyModelAABBNode = {
    type: 'AABB',
    box: new THREE.Box3(new THREE.Vector3(minx, miny, minz), new THREE.Vector3(maxx, maxy, maxz)),
    leftNodeOffset: 0,
    rightNodeOffset: 0,
    faceIdx,
    mostSignificantPlane: 0,
    face: undefined,
  };
  if (faceIdx >= 0 && faceIdx < faces.length) {
    node.face = faces[faceIdx];
  }

  if (faceIdx >= 0) {
    return node;
  }

  if (s.peek()?.text.toLowerCase() !== 'roomlinks') {
    node.leftNode = parseAabbPreorder(s, faces);
    node.leftNodeOffset = node.leftNode ? 1 : 0;
  }
  if (s.peek()?.text.toLowerCase() !== 'roomlinks') {
    node.rightNode = parseAabbPreorder(s, faces);
    node.rightNodeOffset = node.rightNode ? 1 : 0;
  }
  return node;
}

function parseMeshBody(model: OdysseyModel, mesh: OdysseyModelNodeMesh, s: MdlAsciiTokenStream): void {
  const verts: number[] = [];
  let mdxFlags = 0;
  while (!s.eof) {
    const p = s.peek();
    if (!p) break;
    const w = p.text.toLowerCase();
    if (w === 'endnode') break;

    if (w === 'newanim' || w === 'donemodel' || w === 'beginmodelgeom' || w === 'endmodelgeom') {
      break;
    }

    s.take();

    if (w === 'parent') {
      (mesh as OdysseyModelNode & { _asciiParent?: string })._asciiParent = cleanName(s.take().text);
    } else if (w === 'diffuse') {
      const r = s.takeNumber();
      const g = s.takeNumber();
      const b = s.takeNumber();
      mesh.diffuse = new THREE.Color(r, g, b);
    } else if (w === 'ambient') {
      const r = s.takeNumber();
      const g = s.takeNumber();
      const b = s.takeNumber();
      mesh.ambient = new THREE.Color(r, g, b);
    } else if (w === 'transparencyhint') mesh.transparencyHint = !!s.takeNumber();
    else if (w === 'animateuv') mesh.nAnimateUV = !!s.takeNumber();
    else if (w === 'uvdirectionx') mesh.fUVDirectionX = s.takeNumber();
    else if (w === 'uvdirectiony') mesh.fUVDirectionY = s.takeNumber();
    else if (w === 'uvjitter') mesh.fUVJitter = s.takeNumber();
    else if (w === 'uvjitterspeed') mesh.fUVJitterSpeed = s.takeNumber();
    else if (w === 'lightmapped') mesh.hasLightmap = !!s.takeNumber();
    else if (w === 'rotatetexture') mesh.rotateTexture = !!s.takeNumber();
    else if (w === 'm_bisbackgroundgeometry') mesh.backgroundGeometry = !!s.takeNumber();
    else if (w === 'shadow') mesh.flagShadow = !!s.takeNumber();
    else if (w === 'beaming') mesh.beaming = !!s.takeNumber();
    else if (w === 'render') mesh.flagRender = !!s.takeNumber();
    else if (w === 'dirt_enabled') mesh.dirtEnabled = s.takeInt();
    else if (w === 'dirt_texture') mesh.dirtTexture = s.takeInt();
    else if (w === 'dirt_worldspace') mesh.dirtCoordSpace = s.takeInt();
    else if (w === 'hologram_donotdraw') mesh.hideInHolograms = s.takeInt();
    else if (w === 'tangentspace') {
      /* flag */
      s.takeNumber();
    } else if (w === 'inv_count') {
      if (mesh instanceof OdysseyModelNodeSaber) {
        const sab = mesh as OdysseyModelNodeSaber;
        sab.invCount1 = s.takeInt() >>> 0;
        sab.invCount2 = s.takeInt() >>> 0;
      } else {
        mesh.meshInvertedCounter = s.takeInt() >>> 0;
      }
    } else if (w === 'weights') {
      const nw = s.takeInt();
      if (mesh instanceof OdysseyModelNodeSkin) {
        parseSkinWeights(model, mesh, s, nw);
      } else {
        for (let vi = 0; vi < nw; vi++) {
          const ln = s.peek()?.line;
          if (ln === undefined) break;
          while (s.peek() && s.peek()!.line === ln) {
            s.take();
            if (s.peek() && /^-?\d/.test(s.peek()!.text)) s.takeNumber();
            else break;
          }
        }
      }
    } else if (w === 'displacement' && mesh instanceof OdysseyModelNodeDangly) {
      (mesh as OdysseyModelNodeDangly).danglyDisplacement = s.takeNumber();
    } else if (w === 'tightness' && mesh instanceof OdysseyModelNodeDangly) {
      (mesh as OdysseyModelNodeDangly).danglyTightness = s.takeNumber();
    } else if (w === 'period' && mesh instanceof OdysseyModelNodeDangly) {
      (mesh as OdysseyModelNodeDangly).danglyPeriod = s.takeNumber();
    } else if (w === 'constraints' && mesh instanceof OdysseyModelNodeDangly) {
      const nc = s.takeInt();
      const dang = mesh as OdysseyModelNodeDangly;
      dang.constraints = [];
      for (let i = 0; i < nc; i++) dang.constraints.push(s.takeNumber());
    } else if (w === 'aabb' && mesh instanceof OdysseyModelNodeAABB) {
      const aabb = mesh as OdysseyModelNodeAABB;
      const root = parseAabbPreorder(s, aabb.faces ?? []);
      if (root) aabb.rootAABBNode = root;
    } else if (w === 'roomlinks') {
      if (s.peek() && /^-?\d/.test(s.peek()!.text)) {
        const n = s.takeInt();
        for (let i = 0; i < n * 2; i++) s.takeNumber();
      }
      if (s.peek()?.text.toLowerCase() === 'endlist') s.take();
    } else if (w === 'colors') {
      const n = s.takeInt();
      mesh.colors = [];
      for (let i = 0; i < n; i++) {
        mesh.colors.push(s.takeNumber(), s.takeNumber(), s.takeNumber());
      }
    } else if (w === 'colorindices') {
      const n = s.takeInt();
      mesh.colorIndices = [];
      for (let i = 0; i < n; i++) mesh.colorIndices.push(s.takeInt());
    } else if (w === 'bitmap') mesh.textureMap1 = cleanName(s.take().text);
    else if (w === 'bitmap2') mesh.textureMap2 = cleanName(s.take().text);
    else if (w === 'texture0') mesh.textureMap3 = cleanName(s.take().text);
    else if (w === 'texture1') mesh.textureMap4 = cleanName(s.take().text);
    else if (w === 'verts') {
      const n = s.takeInt();
      mesh.verticesCount = n;
      verts.length = 0;
      for (let i = 0; i < n; i++) {
        verts.push(s.takeNumber(), s.takeNumber(), s.takeNumber());
      }
      mesh.vertices = verts;
    } else if (w === 'faces') {
      const nf = s.takeInt();
      mesh.faces = [];
      mesh.indices = [];
      for (let fi = 0; fi < nf; fi++) {
        const a = s.takeInt();
        const b = s.takeInt();
        const c = s.takeInt();
        const sg = s.takeInt();
        const t0 = s.takeInt();
        const t1 = s.takeInt();
        const t2 = s.takeInt();
        const mat = s.takeInt();
        void t0;
        void t1;
        void t2;
        const face = buildFaceFromVerts(verts, a, b, c, mat, sg === 0 ? 1 : sg);
        mesh.faces.push(face);
        mesh.indices.push(a, b, c);
      }
    } else if (w === 'tverts') {
      const n = s.takeInt();
      mdxFlags |= OdysseyModelMDXFlag.VERTEX | OdysseyModelMDXFlag.UV1;
      mesh.tvectors[0] = [];
      for (let i = 0; i < n; i++) {
        mesh.tvectors[0].push(s.takeNumber(), s.takeNumber());
      }
    } else if (w === 'texindices1') {
      const nf = s.takeInt();
      for (let i = 0; i < nf; i++) {
        s.takeNumber();
        s.takeNumber();
        s.takeNumber();
      }
      mdxFlags |= OdysseyModelMDXFlag.UV2;
    } else if (w === 'tverts1') {
      const n = s.takeInt();
      mesh.tvectors[1] = [];
      for (let i = 0; i < n; i++) mesh.tvectors[1].push(s.takeNumber(), s.takeNumber());
    } else if (w === 'texindices2') {
      const nf = s.takeInt();
      for (let i = 0; i < nf; i++) {
        s.takeNumber();
        s.takeNumber();
        s.takeNumber();
      }
      mdxFlags |= OdysseyModelMDXFlag.UV3;
    } else if (w === 'tverts2') {
      const n = s.takeInt();
      mesh.tvectors[2] = [];
      for (let i = 0; i < n; i++) mesh.tvectors[2].push(s.takeNumber(), s.takeNumber());
    } else if (w === 'texindices3') {
      const nf = s.takeInt();
      for (let i = 0; i < nf; i++) {
        s.takeNumber();
        s.takeNumber();
        s.takeNumber();
      }
      mdxFlags |= OdysseyModelMDXFlag.UV4;
    } else if (w === 'tverts3') {
      const n = s.takeInt();
      mesh.tvectors[3] = [];
      for (let i = 0; i < n; i++) mesh.tvectors[3].push(s.takeNumber(), s.takeNumber());
    } else if (applyGeometryController(mesh, w, s)) {
      void 0;
    } else {
      /* unknown keyword at geometry level */
    }
  }
  mesh.MDXDataBitmap = mdxFlags;
  if (!mesh.diffuse) mesh.diffuse = new THREE.Color(1, 1, 1);
  if (!mesh.ambient) mesh.ambient = new THREE.Color(1, 1, 1);
}

function syncEmitterFlagsFromNFlags(em: OdysseyModelNodeEmitter): void {
  const nf = em.nFlags | 0;
  const F = OdysseyModelEmitterFlag;
  em.flags.isP2P = !!(nf & F.P2P);
  em.flags.isP2PSel = !!(nf & F.P2P_SEL);
  em.flags.affectedByWind = !!(nf & F.AFFECTED_WIND);
  em.flags.isTinted = !!(nf & F.TINTED);
  em.flags.canBounce = !!(nf & F.BOUNCE);
  em.flags.isRandom = !!(nf & F.RANDOM);
  em.flags.canInherit = !!(nf & F.INHERIT);
  em.flags.canInheritVelocity = !!(nf & F.INHERIT_VEL);
  em.flags.canInheritLocal = !!(nf & F.INHERIT_LOCAL);
  em.flags.canSplat = !!(nf & F.SPLAT);
  em.flags.canInheritPart = !!(nf & F.INHERIT_PART);
  em.flags.isDepthTexture = !!(nf & F.DEPTH_TEXTURE);
}

function parseEmitterBody(em: OdysseyModelNodeEmitter, s: MdlAsciiTokenStream): void {
  em.nFlags = em.nFlags | 0;
  while (!s.eof) {
    const p = s.peek();
    if (!p) break;
    const w = p.text.toLowerCase();
    if (w === 'endnode') return;
    s.take();
    if (w === 'parent') (em as OdysseyModelNode & { _asciiParent?: string })._asciiParent = cleanName(s.take().text);
    else if (w === 'deadspace') em.deadSpace = s.takeNumber();
    else if (w === 'blastradius') em.blastRadius = s.takeNumber();
    else if (w === 'blastlength') em.blastLength = s.takeNumber();
    else if (w === 'numbranches') em.branchCount = s.takeInt();
    else if (w === 'controlptsmoothing') em.controlPTSmoothing = s.takeNumber();
    else if (w === 'xgrid') em.gridX = s.takeInt();
    else if (w === 'ygrid') em.gridY = s.takeInt();
    else if (w === 'spawntype') em.spaceType = s.takeInt();
    else if (w === 'update') em.updateMode = s.take().text;
    else if (w === 'render') em.renderMode = s.take().text;
    else if (w === 'blend') em.blendMode = s.take().text;
    else if (w === 'texture') em.textureResRef = cleanName(s.take().text);
    else if (w === 'chunkname') em.chunkResRef = cleanName(s.take().text);
    else if (w === 'twosidedtex') em.twoSidedTex = s.takeInt();
    else if (w === 'loop') em.loop = s.takeInt();
    else if (w === 'renderorder') em.renderOrder = s.takeInt();
    else if (w === 'm_bframeblending') em.padding1 = s.takeInt();
    else if (w === 'm_sdepthtexturename') {
      /* optional string */
      s.take();
    } else if (w === 'p2p') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.P2P;
      else em.nFlags &= ~OdysseyModelEmitterFlag.P2P;
    } else if (w === 'p2p_sel') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.P2P_SEL;
      else em.nFlags &= ~OdysseyModelEmitterFlag.P2P_SEL;
    } else if (w === 'affectedbywind') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.AFFECTED_WIND;
      else em.nFlags &= ~OdysseyModelEmitterFlag.AFFECTED_WIND;
    } else if (w === 'm_istinted') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.TINTED;
      else em.nFlags &= ~OdysseyModelEmitterFlag.TINTED;
    } else if (w === 'bounce') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.BOUNCE;
      else em.nFlags &= ~OdysseyModelEmitterFlag.BOUNCE;
    } else if (w === 'random') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.RANDOM;
      else em.nFlags &= ~OdysseyModelEmitterFlag.RANDOM;
    } else if (w === 'inherit') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.INHERIT;
      else em.nFlags &= ~OdysseyModelEmitterFlag.INHERIT;
    } else if (w === 'inheritvel') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.INHERIT_VEL;
      else em.nFlags &= ~OdysseyModelEmitterFlag.INHERIT_VEL;
    } else if (w === 'inherit_local') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.INHERIT_LOCAL;
      else em.nFlags &= ~OdysseyModelEmitterFlag.INHERIT_LOCAL;
    } else if (w === 'splat') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.SPLAT;
      else em.nFlags &= ~OdysseyModelEmitterFlag.SPLAT;
    } else if (w === 'inherit_part') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.INHERIT_PART;
      else em.nFlags &= ~OdysseyModelEmitterFlag.INHERIT_PART;
    } else if (w === 'depth_texture') {
      if (s.takeNumber()) em.nFlags |= OdysseyModelEmitterFlag.DEPTH_TEXTURE;
      else em.nFlags &= ~OdysseyModelEmitterFlag.DEPTH_TEXTURE;
    } else if (w === 'emitterflag13') {
      s.takeNumber();
    } else if (applyGeometryController(em, w, s)) {
      void 0;
    } else {
      if (s.peek() && /-?\d/.test(s.peek()!.text)) s.takeNumber();
    }
  }
}

function parseLightBody(light: OdysseyModelNodeLight, s: MdlAsciiTokenStream): void {
  while (!s.eof) {
    const p = s.peek();
    if (!p) break;
    const w = p.text.toLowerCase();
    if (w === 'endnode') return;
    s.take();
    if (w === 'lightpriority') light.lightPriority = s.takeInt();
    else if (w === 'ndynamictype') light.dynamicFlag = s.takeInt();
    else if (w === 'ambientonly') light.ambientFlag = s.takeInt();
    else if (w === 'affectdynamic') light.affectDynamicFlag = s.takeInt();
    else if (w === 'shadow') light.shadowFlag = s.takeInt();
    else if (w === 'flare') light.generateFlareFlag = s.takeInt();
    else if (w === 'fadinglight') light.fadingLightFlag = s.takeInt();
    else if (w === 'flareradius') light.flare.radius = s.takeNumber();
    else if (w === 'texturenames') {
      const n = s.takeInt();
      light.flare.textures = [];
      for (let i = 0; i < n; i++) light.flare.textures.push(cleanName(s.take().text));
    } else if (w === 'flaresizes') {
      const n = s.takeInt();
      for (let i = 0; i < n; i++) light.flare.sizes.push(s.takeNumber());
    } else if (w === 'flarepositions') {
      const n = s.takeInt();
      for (let i = 0; i < n; i++) light.flare.positions.push(s.takeNumber());
    } else if (w === 'flarecolorshifts') {
      const n = s.takeInt();
      for (let i = 0; i < n; i++) {
        light.flare.colorShifts.push(new THREE.Color(s.takeNumber(), s.takeNumber(), s.takeNumber()));
      }
    } else if (w === 'parent')
      (light as OdysseyModelNode & { _asciiParent?: string })._asciiParent = cleanName(s.take().text);
    else if (applyGeometryController(light, w, s)) {
      void 0;
    }
  }
}

function parseReferenceBody(ref: OdysseyModelNodeReference, s: MdlAsciiTokenStream): void {
  while (!s.eof) {
    const p = s.peek();
    if (!p) break;
    const w = p.text.toLowerCase();
    if (w === 'endnode') return;
    s.take();
    if (w === 'refmodel') ref.modelName = cleanName(s.take().text);
    else if (w === 'reattachable') ref.reattachable = s.takeInt();
    else if (w === 'parent')
      (ref as OdysseyModelNode & { _asciiParent?: string })._asciiParent = cleanName(s.take().text);
    else if (applyGeometryController(ref, w, s)) {
      void 0;
    }
  }
}

function parseDummyBody(node: OdysseyModelNode, s: MdlAsciiTokenStream): void {
  while (!s.eof) {
    const p = s.peek();
    if (!p) break;
    const w = p.text.toLowerCase();
    if (w === 'endnode') return;
    s.take();
    if (w === 'parent') (node as OdysseyModelNode & { _asciiParent?: string })._asciiParent = cleanName(s.take().text);
    else if (applyGeometryController(node, w, s)) {
      void 0;
    }
  }
}

function parseKeyedList(
  s: MdlAsciiTokenStream,
  geoNode: OdysseyModelNode | undefined,
  nodeType: number,
  ctrlWord: string
): ReturnType<typeof OdysseyControllerFactory.From> | undefined {
  const spec = parseControllerKeyHeader(ctrlWord);
  const mapped = asciiControllerBaseToType(spec.baseName, nodeType);
  if (!mapped) {
    while (!s.eof && s.peek()!.text.toLowerCase() !== 'endlist') s.take();
    if (s.peek()?.text.toLowerCase() === 'endlist') s.take();
    return undefined as any;
  }
  const { type, defaultCols } = mapped;
  let columnCount = defaultCols;
  if (spec.bezier && type === OdysseyModelControllerType.Position) {
    columnCount = 19;
  } else if (
    spec.bezier &&
    type !== OdysseyModelControllerType.Position &&
    type !== OdysseyModelControllerType.Orientation
  ) {
    columnCount = 16 + (defaultCols & 15);
  }
  const frames: IOdysseyControllerFrameGeneric[] = [];
  const gpos = geoNode?.position ?? new THREE.Vector3();

  while (!s.eof) {
    const t0 = s.peek()!;
    if (t0.text.toLowerCase() === 'endlist') {
      s.take();
      break;
    }
    const lineNum = t0.line;
    const time = s.takeNumber();
    const vals: number[] = [];
    while (s.peek() && s.peek()!.line === lineNum && s.peek()!.text.toLowerCase() !== 'endlist') {
      vals.push(s.takeNumber());
    }

    if (type === OdysseyModelControllerType.Orientation) {
      const ax = vals[0] ?? 0;
      const ay = vals[1] ?? 0;
      const az = vals[2] ?? 0;
      const ang = vals[3] ?? 0;
      const q = axisAngleToQuaternion(ax, ay, az, ang);
      frames.push({ time, x: q.x, y: q.y, z: q.z, w: q.w } as IOdysseyControllerFrameGeneric);
    } else if (type === OdysseyModelControllerType.Position) {
      if (spec.bezier) {
        const x = (vals[0] ?? 0) - gpos.x;
        const y = (vals[1] ?? 0) - gpos.y;
        const z = (vals[2] ?? 0) - gpos.z;
        const fr: IOdysseyControllerFrameGeneric = { time, x, y, z, isBezier: false } as any;
        if (vals.length >= 12) {
          fr.isBezier = true;
          fr.a = new THREE.Vector3(vals[3], vals[4], vals[5]);
          fr.b = new THREE.Vector3(vals[6], vals[7], vals[8]);
          fr.c = new THREE.Vector3(vals[9], vals[10], vals[11]);
        }
        frames.push(fr);
      } else {
        const x = (vals[0] ?? 0) - gpos.x;
        const y = (vals[1] ?? 0) - gpos.y;
        const z = (vals[2] ?? 0) - gpos.z;
        frames.push({ time, x, y, z } as IOdysseyControllerFrameGeneric);
      }
    } else if (type === OdysseyModelControllerType.Scale) {
      frames.push({ time, value: vals[0] ?? 0 } as IOdysseyControllerFrameGeneric);
    } else if (
      spec.bezier &&
      type !== OdysseyModelControllerType.Position &&
      type !== OdysseyModelControllerType.Orientation
    ) {
      if (defaultCols === 3) {
        frames.push({
          time,
          x: vals[0] ?? 0,
          y: vals[1] ?? 0,
          z: vals[2] ?? 0,
        } as IOdysseyControllerFrameGeneric);
      } else {
        frames.push({ time, value: vals[0] ?? 0 } as IOdysseyControllerFrameGeneric);
      }
    } else if (defaultCols === 3) {
      frames.push({
        time,
        x: vals[0] ?? 0,
        y: vals[1] ?? 0,
        z: vals[2] ?? 0,
      } as IOdysseyControllerFrameGeneric);
    } else {
      frames.push({ time, value: vals[0] ?? 0 } as IOdysseyControllerFrameGeneric);
    }
  }

  const gen: IOdysseyControllerGeneric = {
    type,
    nodeType,
    frameCount: frames.length,
    timeKeyIndex: 0,
    dataValueIndex: 0,
    columnCount,
    data: frames,
  };
  return OdysseyControllerFactory.From(gen);
}

function parseAnimationNode(
  model: OdysseyModel,
  anim: OdysseyModelAnimation,
  s: MdlAsciiTokenStream,
  parentAnim: OdysseyModelAnimationNode | undefined
): OdysseyModelAnimationNode {
  s.expectWord('node');
  s.expectWord('dummy');
  const nodeName = cleanName(s.take().text);
  const an = new OdysseyModelAnimationNode(anim);
  an.name = nodeName;
  an.parent = parentAnim as OdysseyModelAnimationNode;
  const geo = model.nodes.get(nodeName);

  while (!s.eof) {
    const p = s.peek()!;
    const w = p.text.toLowerCase();
    if (w === 'endnode') {
      s.take();
      break;
    }
    if (w === 'node') {
      const child = parseAnimationNode(model, anim, s, an);
      an.children.push(child);
      continue;
    }
    s.take();
    if (w === 'parent') {
      (an as OdysseyModelAnimationNode & { _animParentName?: string })._animParentName = cleanName(s.take().text);
    } else if (w.endsWith('key') || w.includes('bezier')) {
      const c = parseKeyedList(s, geo, geo?.nodeType ?? OdysseyModelNodeType.Header, w);
      if (c && (c as { type?: number }).type !== undefined) {
        an.controllers.set((c as { type: OdysseyModelControllerType }).type, c as any);
      }
    }
  }

  return an;
}

function parseAnimation(model: OdysseyModel, s: MdlAsciiTokenStream): void {
  s.expectWord('newanim');
  const animName = cleanName(s.take().text);
  const geomName = cleanName(s.take().text);
  const anim = new OdysseyModelAnimation();
  anim.odysseyModel = model;
  anim.name = animName;
  anim.modelName = geomName;
  anim.animRoot = geomName;
  anim.functionPointer0 = FN_PTR_PC_K1_MODEL;
  anim.functionPointer1 = FN_PTR_PC_K1_MODEL;

  while (!s.eof) {
    const p = s.peek()!;
    const w = p.text.toLowerCase();
    if (w === 'doneanim') {
      s.take();
      s.take();
      s.take();
      break;
    }
    if (w === 'node') {
      anim.rootNode = parseAnimationNode(model, anim, s, undefined);
      anim.nodes = flattenAnimNodes(anim.rootNode);
      continue;
    }
    s.take();
    if (w === 'length') anim.length = s.takeNumber();
    else if (w === 'transtime') anim.transition = s.takeNumber();
    else if (w === 'animroot') anim.animRoot = cleanName(s.take().text);
    else if (w === 'event') {
      const len = s.takeNumber();
      const evName = s.take().text;
      anim.events.push({ length: len, name: evName });
    }
  }

  resolveAnimParents(anim);
  model.animations.push(anim);
}

function flattenAnimNodes(root: OdysseyModelAnimationNode): OdysseyModelAnimationNode[] {
  const out: OdysseyModelAnimationNode[] = [];
  function walk(n: OdysseyModelAnimationNode) {
    out.push(n);
    for (const c of n.children) walk(c);
  }
  walk(root);
  return out;
}

function parseGeometry(model: OdysseyModel, s: MdlAsciiTokenStream): void {
  s.expectWord('beginmodelgeom');
  const gn = cleanName(s.take().text);
  model.geometryHeader.modelName = gn;

  const pending: { node: OdysseyModelNode; kind: string }[] = [];

  while (!s.eof) {
    const p = s.peek()!;
    const w = p.text.toLowerCase();
    if (w === 'endmodelgeom') {
      s.take();
      s.take();
      break;
    }
    if (w === 'bmin') {
      s.take();
      model.modelHeader.boundingMinX = s.takeNumber();
      model.modelHeader.boundingMinY = s.takeNumber();
      model.modelHeader.boundingMinZ = s.takeNumber();
      continue;
    }
    if (w === 'bmax') {
      s.take();
      model.modelHeader.boundingMaxX = s.takeNumber();
      model.modelHeader.boundingMaxY = s.takeNumber();
      model.modelHeader.boundingMaxZ = s.takeNumber();
      continue;
    }
    if (w === 'radius') {
      s.take();
      model.modelHeader.radius = s.takeNumber();
      continue;
    }
    if (w === 'layoutposition') {
      s.take();
      const lx = s.takeNumber();
      const ly = s.takeNumber();
      const lz = s.takeNumber();
      model.asciiLayoutPosition = { x: lx, y: ly, z: lz };
      continue;
    }
    if (w === 'node') {
      s.take();
      const kind = s.take().text;
      const nodeName = cleanName(s.take().text);
      const node = instantiateNode(kind, undefined);
      node.name = nodeName;
      node.setType(nodeKindToType(kind));
      const ni = model.names.indexOf(nodeName);
      node.nodePosition = ni >= 0 ? ni : 0;
      node.supernode = 0;
      node.padding = 0;
      node.offsetToRoot = 0;
      node.offsetToParent = 0;
      node.childArrayDefinition = { offset: 0, count: 0, count2: 0 };
      node.childOffsets = [];
      node.controllerArrayDefinition = { offset: 0, count: 0, count2: 0 };
      node.controllerDataArrayDefinition = { offset: 0, count: 0, count2: 0 };
      let parentName = 'null';
      if (kind.toLowerCase() === 'trimesh' || kind.toLowerCase() === 'skin' || kind.toLowerCase() === 'danglymesh') {
        parseMeshBody(model, node as OdysseyModelNodeMesh, s);
      } else if (kind.toLowerCase() === 'emitter') {
        parseEmitterBody(node as OdysseyModelNodeEmitter, s);
        syncEmitterFlagsFromNFlags(node as OdysseyModelNodeEmitter);
      } else if (kind.toLowerCase() === 'light') {
        const ln = node as OdysseyModelNodeLight;
        if (!ln.color) ln.color = new THREE.Color(1, 1, 1);
        parseLightBody(ln, s);
      } else if (kind.toLowerCase() === 'reference') {
        parseReferenceBody(node as OdysseyModelNodeReference, s);
      } else if (kind.toLowerCase() === 'dummy') {
        parseDummyBody(node, s);
      } else if (kind.toLowerCase() === 'aabb' || kind.toLowerCase() === 'lightsaber') {
        parseMeshBody(model, node as OdysseyModelNodeMesh, s);
      } else {
        parseDummyBody(node, s);
      }
      if (s.peek()?.text.toLowerCase() === 'endnode') s.take();
      pending.push({ node, kind });
      continue;
    }
    if (w === 'name') {
      s.take();
      s.take();
      continue;
    }
    s.take();
  }

  for (const { node } of pending) {
    model.nodes.set(node.name, node);
  }
  for (const { node } of pending) {
    const pn = (node as OdysseyModelNode & { _asciiParent?: string })._asciiParent;
    const parentName = pn ? cleanName(pn) : 'null';
    if (parentName === 'null' || parentName === '') {
      node.parent = null as any;
    } else {
      const p = model.nodes.get(parentName);
      if (p) {
        node.setParent(p);
        p.children.push(node);
      }
    }
  }

  let root: OdysseyModelNode | undefined;
  for (const { node } of pending) {
    if (!node.parent) root = node;
  }
  if (!root && pending.length) root = pending[0].node;
  if (!root) {
    throw new MdlAsciiParseError('No root geometry node (no node with parent NULL)', 0);
  }
  model.rootNode = root;
}

function resolveAnimParents(anim: OdysseyModelAnimation): void {
  if (!anim.rootNode) return;
  const byName = new Map<string, OdysseyModelAnimationNode>();
  function walk(n: OdysseyModelAnimationNode) {
    byName.set(n.name, n);
    for (const c of n.children) walk(c);
  }
  walk(anim.rootNode);
  for (const n of byName.values()) {
    const want = (n as OdysseyModelAnimationNode & { _animParentName?: string })._animParentName;
    if (!want || want.toLowerCase() === 'null') continue;
    const p = byName.get(cleanName(want));
    if (p) {
      n.parent = p;
      if (!p.children.includes(n)) p.children.push(n);
    }
  }
}

/**
 * Parse Aurora MDL ASCII into an {@link OdysseyModel} (no binary MDL/MDX bytes required when geometry is embedded).
 */
export function parseOdysseyModelAscii(source: string): OdysseyModel {
  const tokens = tokenizeMdlAscii(source);
  const names = collectGeometryNames(tokens);
  const model = createAsciiShell();
  model.names = names;
  model.namesArrayDefinition = { offset: 0, count: names.length, count2: 0 };

  const s = new MdlAsciiTokenStream(tokens);

  while (!s.eof && s.peek()!.text.toLowerCase() !== 'newmodel') {
    s.pos++;
  }
  if (s.eof) {
    throw new MdlAsciiParseError('newmodel not found', 0);
  }

  while (!s.eof && s.peek()!.text.toLowerCase() !== 'beginmodelgeom') {
    const w = s.take().text.toLowerCase();
    if (w === 'newmodel') {
      model.geometryHeader.modelName = cleanName(s.take().text);
    } else if (w === 'setsupermodel') {
      cleanName(s.take().text);
      model.modelHeader.superModelName = cleanName(s.take().text);
    } else if (w === 'classification') {
      model.modelHeader.classification = asciiClassificationToEnum(s.take().text);
    } else if (w === 'classification_unk1') {
      model.modelHeader.subClassification = s.takeInt();
    } else if (w === 'ignorefog') {
      model.modelHeader.fogged = s.takeNumber() === 0;
    } else if (w === 'setanimationscale') {
      model.modelHeader.scale = s.takeNumber();
    } else if (w === 'compress_quaternions') {
      model.asciiCompressQuaternions = s.takeNumber();
    } else if (w === 'headlink') {
      model.asciiHeadLink = s.takeNumber();
    } else if (w === 'functionpointer0') {
      model.geometryHeader.functionPointer0 = Math.floor(s.takeNumber()) >>> 0;
      applyEngineFromFunctionPointer0(model);
    } else if (w === 'functionpointer1') {
      model.geometryHeader.functionPointer1 = Math.floor(s.takeNumber()) >>> 0;
    }
  }

  if (!s.eof && s.peek()!.text.toLowerCase() === 'beginmodelgeom') {
    parseGeometry(model, s);
  }

  while (!s.eof) {
    const w = s.peek()!.text.toLowerCase();
    if (w === 'newanim') {
      parseAnimation(model, s);
      continue;
    }
    if (w === 'donemodel') {
      s.take();
      if (!s.eof) s.take();
      break;
    }
    s.pos++;
  }

  model.geometryHeader.nodeCount = model.names.length;
  return model;
}
