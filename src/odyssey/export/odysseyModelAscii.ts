import * as THREE from "three";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelMDXFlag } from "@/enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import type { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import type { OdysseyModel } from "@/odyssey/OdysseyModel";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationNode } from "@/odyssey/OdysseyModelAnimationNode";
import type { OdysseyModelNode } from "@/odyssey/OdysseyModelNode";
import { OdysseyModelNodeAABB } from "@/odyssey/OdysseyModelNodeAABB";
import { OdysseyModelNodeDangly } from "@/odyssey/OdysseyModelNodeDangly";
import { OdysseyModelNodeEmitter } from "@/odyssey/OdysseyModelNodeEmitter";
import { OdysseyModelNodeLight } from "@/odyssey/OdysseyModelNodeLight";
import { OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelNodeReference } from "@/odyssey/OdysseyModelNodeReference";
import { OdysseyModelNodeSaber } from "@/odyssey/OdysseyModelNodeSaber";
import { OdysseyModelNodeSkin } from "@/odyssey/OdysseyModelNodeSkin";
import type { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { IOdysseyModelAABBNode } from "@/interface/odyssey/IOdysseyModelAABBNode";
import { OdysseyModelEmitterFlag } from "@/enums/odyssey/OdysseyModelEmitterFlag";
import {
  classificationToAscii,
  controllerTypeToAscii,
  prepareFloat,
  quaternionToAxisAngleFromXYZW,
} from "./odysseyModelAsciiHelpers";

export {
  classificationToAscii,
  controllerTypeToAscii,
  prepareFloat,
  quaternionToAxisAngleFromXYZW,
  roundDec,
  truncateDec,
} from "./odysseyModelAsciiHelpers";

const NL = "\r\n";

export function quaternionToAxisAngle(qin: THREE.Quaternion): { ax: number; ay: number; az: number; angle: number } {
  const q = qin.clone().normalize();
  return quaternionToAxisAngleFromXYZW(q.x, q.y, q.z, q.w);
}

export interface ExportOdysseyModelAsciiOptions {
  includeAnimations?: boolean;
  /** If false, export full bezier blocks when present. */
  bezierToLinear?: boolean;
}

function collectCompressedQuaternionUsage(model: OdysseyModel): boolean {
  const checkNode = (node: OdysseyModelNode) => {
    for (const [, c] of node.controllers) {
      const ctrl = c as OdysseyController & { type: OdysseyModelControllerType; columnCount?: number };
      if (ctrl.type === OdysseyModelControllerType.Orientation && ctrl.columnCount === 2) return true;
    }
    for (const ch of node.children) {
      if (checkNode(ch)) return true;
    }
    return false;
  };
  if (model.rootNode && checkNode(model.rootNode)) return true;
  for (const anim of model.animations) {
    for (const n of anim.nodes) {
      for (const [, c] of n.controllers) {
        const ctrl = c as OdysseyController & { type: OdysseyModelControllerType; columnCount?: number };
        if (ctrl.type === OdysseyModelControllerType.Orientation && ctrl.columnCount === 2) return true;
      }
    }
  }
  return false;
}

function recursiveAabbAscii(node: IOdysseyModelAABBNode, indent: string): string {
  const min = node.box.min;
  const max = node.box.max;
  let s =
    NL +
    indent +
    prepareFloat(min.x) +
    " " +
    prepareFloat(min.y) +
    " " +
    prepareFloat(min.z) +
    " " +
    prepareFloat(max.x) +
    " " +
    prepareFloat(max.y) +
    " " +
    prepareFloat(max.z) +
    " " +
    node.faceIdx;
  if (node.leftNodeOffset > 0 && node.leftNode) s += recursiveAabbAscii(node.leftNode, indent);
  if (node.rightNodeOffset > 0 && node.rightNode) s += recursiveAabbAscii(node.rightNode, indent);
  return s;
}

function emitMeshAscii(mesh: OdysseyModelNodeMesh, model: OdysseyModel, nl: string): string {
  let s = "";
  s += nl + "  diffuse " + prepareFloat(mesh.diffuse.r) + " " + prepareFloat(mesh.diffuse.g) + " " + prepareFloat(mesh.diffuse.b);
  s += nl + "  ambient " + prepareFloat(mesh.ambient.r) + " " + prepareFloat(mesh.ambient.g) + " " + prepareFloat(mesh.ambient.b);
  s += nl + "  transparencyhint " + (mesh.transparencyHint ? 1 : 0);
  s += nl + "  animateuv " + (mesh.nAnimateUV ? 1 : 0);
  if (!mesh.nAnimateUV) {
    s += nl + "  uvdirectionx 0.0";
    s += nl + "  uvdirectiony 0.0";
    s += nl + "  uvjitter 0.0";
    s += nl + "  uvjitterspeed 0.0";
  } else {
    s += nl + "  uvdirectionx " + prepareFloat(mesh.fUVDirectionX);
    s += nl + "  uvdirectiony " + prepareFloat(mesh.fUVDirectionY);
    s += nl + "  uvjitter " + prepareFloat(mesh.fUVJitter);
    s += nl + "  uvjitterspeed " + prepareFloat(mesh.fUVJitterSpeed);
  }
  s += nl + "  lightmapped " + (mesh.hasLightmap ? 1 : 0);
  s += nl + "  rotatetexture " + (mesh.rotateTexture ? 1 : 0);
  s += nl + "  m_bIsBackgroundGeometry " + (mesh.backgroundGeometry ? 1 : 0);
  s += nl + "  shadow " + (mesh.flagShadow ? 1 : 0);
  s += nl + "  beaming " + (mesh.beaming ? 1 : 0);
  s += nl + "  render " + (mesh.flagRender ? 1 : 0);
  s += nl + "  dirt_enabled " + (mesh.dirtEnabled ?? 0);
  s += nl + "  dirt_texture " + (mesh.dirtTexture ?? 0);
  s += nl + "  dirt_worldspace " + (mesh.dirtCoordSpace ?? 0);
  s += nl + "  hologram_donotdraw " + (mesh.hideInHolograms ?? 0);
  s += nl + "  tangentspace " + (mesh.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1 ? 1 : 0);
  s += nl + "  inv_count " + (mesh.meshInvertedCounter >>> 0);

  if (mesh.textureMap1) s += nl + "  bitmap " + mesh.textureMap1;
  if (mesh.textureMap2) s += nl + "  bitmap2 " + mesh.textureMap2;
  if (mesh.textureMap3) s += nl + "  texture0 " + mesh.textureMap3;
  if (mesh.textureMap4) s += nl + "  texture1 " + mesh.textureMap4;

  const verts = mesh.vertices;
  const vertFloats = verts.length;
  s += nl + "  verts " + vertFloats / 3;
  for (let i = 0; i < vertFloats; i += 3) {
    s += nl + "    " + prepareFloat(verts[i]) + " " + prepareFloat(verts[i + 1]) + " " + prepareFloat(verts[i + 2]);
  }

  s += nl + "  faces " + mesh.faces.length;
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const f = mesh.faces[fi];
    const sg = f.smoothingGroup !== undefined ? f.smoothingGroup : 1;
    const sgOut = sg === 0 ? 1 : sg;
    s += nl + "    ";
    s += f.a + " " + f.b + " " + f.c + "  " + sgOut;
    if (mesh.MDXDataBitmap & OdysseyModelMDXFlag.UV1) {
      s += "  " + f.a + " " + f.b + " " + f.c;
    } else {
      s += "  0 0 0";
    }
    s += "  " + f.materialIndex;
  }

  if (mesh.MDXDataBitmap & OdysseyModelMDXFlag.UV1 && mesh.tvectors[0]?.length) {
    const tv = mesh.tvectors[0];
    s += nl + "  tverts " + mesh.verticesCount;
    for (let i = 0; i < mesh.verticesCount; i++) {
      s += nl + "    " + prepareFloat(tv[i * 2]) + " " + prepareFloat(tv[i * 2 + 1]);
    }
  }
  if (mesh.MDXDataBitmap & OdysseyModelMDXFlag.UV2 && mesh.tvectors[1]?.length) {
    s += nl + "  texindices1 " + mesh.faces.length;
    for (let fi = 0; fi < mesh.faces.length; fi++) {
      const f = mesh.faces[fi];
      s += nl + "    " + f.a + " " + f.b + " " + f.c;
    }
    const tv = mesh.tvectors[1];
    s += nl + "  tverts1 " + mesh.verticesCount;
    for (let i = 0; i < mesh.verticesCount; i++) {
      s += nl + "    " + prepareFloat(tv[i * 2]) + " " + prepareFloat(tv[i * 2 + 1]);
    }
  }
  if (mesh.MDXDataBitmap & OdysseyModelMDXFlag.UV3 && mesh.tvectors[2]?.length) {
    s += nl + "  texindices2 " + mesh.faces.length;
    for (let fi = 0; fi < mesh.faces.length; fi++) {
      const f = mesh.faces[fi];
      s += nl + "    " + f.a + " " + f.b + " " + f.c;
    }
    const tv = mesh.tvectors[2];
    s += nl + "  tverts2 " + mesh.verticesCount;
    for (let i = 0; i < mesh.verticesCount; i++) {
      s += nl + "    " + prepareFloat(tv[i * 2]) + " " + prepareFloat(tv[i * 2 + 1]);
    }
  }
  if (mesh.MDXDataBitmap & OdysseyModelMDXFlag.UV4 && mesh.tvectors[3]?.length) {
    s += nl + "  texindices3 " + mesh.faces.length;
    for (let fi = 0; fi < mesh.faces.length; fi++) {
      const f = mesh.faces[fi];
      s += nl + "    " + f.a + " " + f.b + " " + f.c;
    }
    const tv = mesh.tvectors[3];
    s += nl + "  tverts3 " + mesh.verticesCount;
    for (let i = 0; i < mesh.verticesCount; i++) {
      s += nl + "    " + prepareFloat(tv[i * 2]) + " " + prepareFloat(tv[i * 2 + 1]);
    }
  }

  return s;
}

function emitSkinWeights(skin: OdysseyModelNodeSkin, model: OdysseyModel, nl: string): string {
  const nVerts = skin.verticesCount;
  let s = nl + "  weights " + nVerts;
  for (let vi = 0; vi < nVerts; vi++) {
    s += nl + "    ";
    let any = false;
    for (let j = 0; j < 4; j++) {
      const w = skin.weights[vi * 4 + j];
      if (w <= 0) continue;
      const slot = Math.round(skin.boneIdx[vi * 4 + j]);
      const nameIdx = skin.bone_parts[slot];
      if (nameIdx === undefined || nameIdx >= model.names.length) continue;
      const boneName = model.names[nameIdx];
      s += " " + boneName + " " + prepareFloat(w);
      any = true;
    }
    if (!any) {
      s += " root 1.0";
    }
  }
  return s;
}

function emitDangly(d: OdysseyModelNodeDangly, nl: string): string {
  let s = "";
  s += nl + "  displacement " + prepareFloat(d.danglyDisplacement);
  s += nl + "  tightness " + prepareFloat(d.danglyTightness);
  s += nl + "  period " + prepareFloat(d.danglyPeriod);
  s += nl + "  constraints " + d.constraints.length;
  for (let i = 0; i < d.constraints.length; i++) {
    s += nl + "    " + prepareFloat(d.constraints[i]);
  }
  return s;
}

function emitEmitter(em: OdysseyModelNodeEmitter, nl: string): string {
  let s = "";
  s += nl + "  deadspace " + prepareFloat(em.deadSpace);
  s += nl + "  blastRadius " + prepareFloat(em.blastRadius);
  s += nl + "  blastLength " + prepareFloat(em.blastLength);
  s += nl + "  numBranches " + em.branchCount;
  s += nl + "  controlptsmoothing " + prepareFloat(em.controlPTSmoothing);
  s += nl + "  xgrid " + em.gridX;
  s += nl + "  ygrid " + em.gridY;
  s += nl + "  spawntype " + em.spaceType;
  s += nl + "  update " + em.updateMode;
  s += nl + "  render " + em.renderMode;
  s += nl + "  blend " + em.blendMode;
  s += nl + "  texture " + em.textureResRef;
  s += nl + "  chunkname " + em.chunkResRef;
  s += nl + "  twosidedtex " + em.twoSidedTex;
  s += nl + "  loop " + em.loop;
  s += nl + "  renderorder " + em.renderOrder;
  s += nl + "  m_bFrameBlending " + em.padding1;
  s += nl + "  m_sDepthTextureName ";
  const F = OdysseyModelEmitterFlag;
  const nf = em.nFlags;
  s += nl + "  p2p " + (nf & F.P2P ? 1 : 0);
  s += nl + "  p2p_sel " + (nf & F.P2P_SEL ? 1 : 0);
  s += nl + "  affectedByWind " + (nf & F.AFFECTED_WIND ? 1 : 0);
  s += nl + "  m_isTinted " + (nf & F.TINTED ? 1 : 0);
  s += nl + "  bounce " + (nf & F.BOUNCE ? 1 : 0);
  s += nl + "  random " + (nf & F.RANDOM ? 1 : 0);
  s += nl + "  inherit " + (nf & F.INHERIT ? 1 : 0);
  s += nl + "  inheritvel " + (nf & F.INHERIT_VEL ? 1 : 0);
  s += nl + "  inherit_local " + (nf & F.INHERIT_LOCAL ? 1 : 0);
  s += nl + "  splat " + (nf & F.SPLAT ? 1 : 0);
  s += nl + "  inherit_part " + (nf & F.INHERIT_PART ? 1 : 0);
  s += nl + "  depth_texture " + (nf & F.DEPTH_TEXTURE ? 1 : 0);
  s += nl + "  emitterflag13 0";
  return s;
}

function emitLight(light: OdysseyModelNodeLight, nl: string): string {
  let s = "";
  s += nl + "  lightpriority " + light.lightPriority;
  s += nl + "  ndynamictype " + light.dynamicFlag;
  s += nl + "  ambientonly " + light.ambientFlag;
  s += nl + "  affectdynamic " + light.affectDynamicFlag;
  s += nl + "  shadow " + light.shadowFlag;
  s += nl + "  flare " + light.generateFlareFlag;
  s += nl + "  fadinglight " + light.fadingLightFlag;
  s += nl + "  flareradius " + prepareFloat(light.flare.radius);
  s += nl + "  texturenames " + light.flare.textures.length;
  for (const t of light.flare.textures) s += nl + "    " + t;
  s += nl + "  flaresizes " + light.flare.sizes.length;
  for (const z of light.flare.sizes) s += nl + "    " + z;
  s += nl + "  flarepositions " + light.flare.positions.length;
  for (const z of light.flare.positions) s += nl + "    " + z;
  s += nl + "  flarecolorshifts " + light.flare.colorShifts.length;
  for (const c of light.flare.colorShifts) {
    s += nl + "    " + prepareFloat(c.r) + " " + prepareFloat(c.g) + " " + prepareFloat(c.b);
  }
  return s;
}

function parentNameOrNull(node: OdysseyModelNode): string {
  if (!node.parent) return "NULL";
  return node.parent.name || "NULL";
}

function emitGeometryControllers(node: OdysseyModelNode, nl: string): string {
  let s = "";
  for (const [, c] of node.controllers) {
    const ctrl = c as OdysseyController & {
      type: OdysseyModelControllerType;
      columnCount?: number;
      data: IOdysseyControllerFrameGeneric[];
    };
    if (!ctrl.data?.length) continue;
    const name = controllerTypeToAscii(ctrl.type, node.nodeType);
    if (ctrl.type === OdysseyModelControllerType.Orientation) {
      const fr = ctrl.data[0];
      const q = new THREE.Quaternion(fr.x, fr.y, fr.z, fr.w);
      const aa = quaternionToAxisAngle(q);
      s += nl + "  " + name + " " + prepareFloat(aa.ax) + " " + prepareFloat(aa.ay) + " " + prepareFloat(aa.az) + " " + prepareFloat(aa.angle);
    } else if (ctrl.type === OdysseyModelControllerType.Position) {
      const fr = ctrl.data[0];
      s += nl + "  " + name + " " + prepareFloat(fr.x) + " " + prepareFloat(fr.y) + " " + prepareFloat(fr.z);
    } else if (ctrl.type === OdysseyModelControllerType.Scale) {
      const fr = ctrl.data[0];
      s += nl + "  " + name + " " + prepareFloat(fr.value as number);
    } else {
      const fr = ctrl.data[0];
      if (fr.value !== undefined && fr.value !== null && typeof fr.value === "number") {
        s += nl + "  " + name + " " + prepareFloat(fr.value);
      } else if (fr.x !== undefined) {
        s += nl + "  " + name + " " + prepareFloat(fr.x) + " " + prepareFloat(fr.y) + " " + prepareFloat(fr.z);
      }
    }
  }
  return s;
}

function nodeHeaderKeyword(node: OdysseyModelNode): string {
  const t = node.nodeType;
  const M = OdysseyModelNodeType.Mesh;
  if ((t & OdysseyModelNodeType.Saber) && (t & M)) return "lightsaber";
  if ((t & OdysseyModelNodeType.Skin) && (t & M)) return "skin";
  if ((t & OdysseyModelNodeType.Dangly) && (t & M)) return "danglymesh";
  if ((t & OdysseyModelNodeType.AABB) && (t & M)) return "aabb";
  if ((t & M) && (t & OdysseyModelNodeType.Header)) return "trimesh";
  if ((t & OdysseyModelNodeType.Reference) && (t & OdysseyModelNodeType.Header)) return "reference";
  if ((t & OdysseyModelNodeType.Emitter) && (t & OdysseyModelNodeType.Header)) return "emitter";
  if ((t & OdysseyModelNodeType.Light) && (t & OdysseyModelNodeType.Header)) return "light";
  if (t & OdysseyModelNodeType.Header) return "dummy";
  return "dummy";
}

function emitGeometryNode(model: OdysseyModel, node: OdysseyModelNode, nl: string): string {
  let s = "";
  const kw = nodeHeaderKeyword(node);
  s += nl + "node " + kw + " " + node.name;
  s += nl + "  parent " + parentNameOrNull(node);
  s += emitGeometryControllers(node, nl);
  if (node instanceof OdysseyModelNodeMesh) {
    const mesh = node as OdysseyModelNodeMesh;
    s += emitMeshAscii(mesh, model, nl);
    if (node instanceof OdysseyModelNodeSkin) {
      s += emitSkinWeights(node as OdysseyModelNodeSkin, model, nl);
    }
    if (node instanceof OdysseyModelNodeDangly) {
      s += emitDangly(node as OdysseyModelNodeDangly, nl);
    }
    if (node instanceof OdysseyModelNodeAABB && (node as OdysseyModelNodeAABB).rootAABBNode) {
      const aabbNode = node as OdysseyModelNodeAABB;
      s += nl + "  aabb";
      s += recursiveAabbAscii(aabbNode.rootAABBNode, "    ");
      s += nl + "  roomlinks" + nl + "  endlist";
    }
    if (node instanceof OdysseyModelNodeSaber) {
      const sab = node as OdysseyModelNodeSaber;
      s += nl + "  inv_count " + sab.invCount1 + " " + sab.invCount2;
    }
  }
  if (node instanceof OdysseyModelNodeEmitter) s += emitEmitter(node, nl);
  if (node instanceof OdysseyModelNodeLight) s += emitLight(node, nl);
  if (node instanceof OdysseyModelNodeReference) {
    const ref = node as OdysseyModelNodeReference;
    s += nl + "  refModel " + ref.modelName;
    s += nl + "  reattachable " + ref.reattachable;
  }
  s += nl + "endnode";
  return s;
}

function geometryNodeForName(model: OdysseyModel, name: string): OdysseyModelNode | undefined {
  return model.nodes.get(name);
}

function emitKeyedController(
  ctrl: OdysseyController & {
    type: OdysseyModelControllerType;
    columnCount?: number;
    data: IOdysseyControllerFrameGeneric[];
  },
  geoNode: OdysseyModelNode | undefined,
  nl: string,
  opts: ExportOdysseyModelAsciiOptions,
): string {
  let s = "";
  const posBase = geoNode ? geoNode.position : new THREE.Vector3();
  const name = controllerTypeToAscii(ctrl.type, geoNode?.nodeType ?? OdysseyModelNodeType.Header);
  const col = ctrl.columnCount ?? 0;
  const bezierFlag = col > 15;
  const colLow = col & 15;
  s +=
    nl +
    "      " +
    name +
    (bezierFlag && !opts.bezierToLinear ? "bezier" : "") +
    "key";

  if (ctrl.type === OdysseyModelControllerType.Orientation && (col === 2 || col === 4)) {
    for (let r = 0; r < ctrl.data.length; r++) {
      const fr = ctrl.data[r];
      const q = new THREE.Quaternion(fr.x, fr.y, fr.z, fr.w);
      const aa = quaternionToAxisAngle(q);
      s += nl + "        " + prepareFloat(fr.time) + " ";
      s += prepareFloat(aa.ax) + " " + prepareFloat(aa.ay) + " " + prepareFloat(aa.az) + " " + prepareFloat(aa.angle);
    }
  } else if (ctrl.type === OdysseyModelControllerType.Position && bezierFlag && !opts.bezierToLinear) {
    for (let r = 0; r < ctrl.data.length; r++) {
      const fr = ctrl.data[r];
      s += nl + "        " + prepareFloat(fr.time);
      s +=
        " " +
        prepareFloat(posBase.x + (fr.x ?? 0)) +
        " " +
        prepareFloat(posBase.y + (fr.y ?? 0)) +
        " " +
        prepareFloat(posBase.z + (fr.z ?? 0));
      if (fr.isBezier && fr.a && fr.b && fr.c) {
        s +=
          "  " +
          prepareFloat(fr.a.x) +
          " " +
          prepareFloat(fr.a.y) +
          " " +
          prepareFloat(fr.a.z) +
          " " +
          prepareFloat(fr.b.x) +
          " " +
          prepareFloat(fr.b.y) +
          " " +
          prepareFloat(fr.b.z) +
          " " +
          prepareFloat(fr.c.x) +
          " " +
          prepareFloat(fr.c.y) +
          " " +
          prepareFloat(fr.c.z);
      }
    }
  } else if (ctrl.type === OdysseyModelControllerType.Position) {
    for (let r = 0; r < ctrl.data.length; r++) {
      const fr = ctrl.data[r];
      s += nl + "        " + prepareFloat(fr.time) + " ";
      s +=
        prepareFloat(posBase.x + (fr.x ?? 0)) +
        " " +
        prepareFloat(posBase.y + (fr.y ?? 0)) +
        " " +
        prepareFloat(posBase.z + (fr.z ?? 0));
    }
  } else if (bezierFlag && !opts.bezierToLinear && colLow > 0) {
    for (let r = 0; r < ctrl.data.length; r++) {
      const fr = ctrl.data[r];
      s += nl + "        " + prepareFloat(fr.time) + " ";
      const parts: string[] = [];
      for (let i = 0; i < colLow * 3; i++) {
        parts.push("0");
      }
      s += parts.join(" ");
    }
  } else {
    for (let r = 0; r < ctrl.data.length; r++) {
      const fr = ctrl.data[r];
      s += nl + "        " + prepareFloat(fr.time) + " ";
      if (fr.value !== undefined && fr.value !== null && typeof fr.value === "number") {
        s += prepareFloat(fr.value);
      } else if (fr.x !== undefined) {
        const cols = Math.max(1, colLow || 1);
        if (cols === 1) s += prepareFloat(fr.x);
        else if (cols === 3) s += prepareFloat(fr.x) + " " + prepareFloat(fr.y) + " " + prepareFloat(fr.z);
        else s += prepareFloat(fr.x);
      }
    }
  }
  s += nl + "      endlist";
  return s;
}

function emitAnimationNode(model: OdysseyModel, anode: OdysseyModelAnimationNode, nl: string, opts: ExportOdysseyModelAsciiOptions): string {
  let s = "";
  s += nl + "    node dummy " + anode.name;
  s += nl + "      parent " + (anode.parent ? anode.parent.name : "NULL");
  const geo = geometryNodeForName(model, anode.name);
  for (const [, c] of anode.controllers) {
    s += emitKeyedController(c as OdysseyController & { data: IOdysseyControllerFrameGeneric[] }, geo, nl, opts);
  }
  s += nl + "    endnode";
  for (const ch of anode.children) {
    s += emitAnimationNode(model, ch, nl, opts);
  }
  return s;
}

function emitAnimation(model: OdysseyModel, anim: OdysseyModelAnimation, nl: string, opts: ExportOdysseyModelAsciiOptions): string {
  let s = "";
  const geomName = model.geometryHeader.modelName;
  s += nl + "newanim " + anim.name + " " + geomName;
  s += nl + "  length " + prepareFloat(anim.length);
  s += nl + "  transtime " + prepareFloat(anim.transition);
  const ar = anim.animRoot || anim.modelName || geomName;
  s += nl + "  animroot " + ar;
  for (const ev of anim.events) {
    s += nl + "  event " + prepareFloat(ev.length) + " " + ev.name;
  }
  if (anim.rootNode) {
    s += emitAnimationNode(model, anim.rootNode, nl, opts);
  }
  s += nl + "doneanim " + anim.name + " " + geomName;
  return s;
}

/**
 * Export a parsed {@link OdysseyModel} to Aurora MDL ASCII (MDLedit-compatible subset).
 */
export function exportOdysseyModelAscii(model: OdysseyModel, options: ExportOdysseyModelAsciiOptions = {}): string {
  const includeAnimations = options.includeAnimations !== false;
  const nl = NL;
  const geomName = model.geometryHeader.modelName;
  const superName = model.modelHeader.superModelName || "null";
  const headLink =
    model.geometryHeader.rootNodeOffset !== model.geometryHeader.rootNodeOffset2 ? 1 : 0;
  const compress = collectCompressedQuaternionUsage(model) ? 1 : 0;

  let out = "";
  out += "# Exported with KotOR.js";
  out += nl + "# MODEL ASCII";
  out += nl + "newmodel " + geomName;
  out += nl + "setsupermodel " + geomName + " " + superName;
  out += nl + "classification " + classificationToAscii(model.modelHeader.classification as number);
  out += nl + "classification_unk1 " + model.modelHeader.subClassification;
  out += nl + "ignorefog " + (model.modelHeader.fogged ? 0 : 1);
  out += nl + "setanimationscale " + prepareFloat(model.modelHeader.scale);
  out += nl + "compress_quaternions " + compress;
  out += nl + "headlink " + headLink;
  out += nl;
  out += nl + "# GEOM ASCII";
  out += nl + "beginmodelgeom " + geomName;
  out += nl + "  bmin " + prepareFloat(model.modelHeader.boundingMinX) + " " + prepareFloat(model.modelHeader.boundingMinY) + " " + prepareFloat(model.modelHeader.boundingMinZ);
  out += nl + "  bmax " + prepareFloat(model.modelHeader.boundingMaxX) + " " + prepareFloat(model.modelHeader.boundingMaxY) + " " + prepareFloat(model.modelHeader.boundingMaxZ);
  out += nl + "  radius " + prepareFloat(model.modelHeader.radius);

  for (const entryName of model.names) {
    const node = geometryNodeForName(model, entryName);
    if (!node) {
      out += nl + "name " + entryName;
      continue;
    }
    out += emitGeometryNode(model, node, nl);
  }

  out += nl + "endmodelgeom " + geomName + nl;

  if (includeAnimations) {
    for (const anim of model.animations) {
      out += emitAnimation(model, anim, nl, options);
    }
  }

  out += nl + nl + "donemodel " + geomName + nl;
  return out;
}
