import * as THREE from "three";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelEngine } from "@/enums/odyssey/OdysseyModelEngine";
import type { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import type { IOdysseyGeometryHeader } from "@/interface/odyssey/IOdysseyGeometryHeader";
import type { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModel } from "@/odyssey/OdysseyModel";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { OdysseyModelAnimationNode } from "@/odyssey/OdysseyModelAnimationNode";
import { OdysseyModelNode } from "@/odyssey/OdysseyModelNode";
import { OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";

function vec3ToJson(v: THREE.Vector3 | undefined): { x: number; y: number; z: number } | undefined {
  if (!v) return undefined;
  return { x: v.x, y: v.y, z: v.z };
}

function colorToJson(c: THREE.Color | undefined): { r: number; g: number; b: number } | undefined {
  if (!c) return undefined;
  return { r: c.r, g: c.g, b: c.b };
}

function quatToJson(q: THREE.Quaternion): { x: number; y: number; z: number; w: number } {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

function controllerTypeName(type: OdysseyModelControllerType): string {
  const name = OdysseyModelControllerType[type];
  return typeof name === "string" ? name : String(type);
}

function serializeFrame(f: IOdysseyControllerFrameGeneric): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (f.time !== undefined) o.time = f.time;
  if (f.x !== undefined) o.x = f.x;
  if (f.y !== undefined) o.y = f.y;
  if (f.z !== undefined) o.z = f.z;
  if (f.w !== undefined) o.w = f.w;
  if (f.lastFrame !== undefined) o.lastFrame = f.lastFrame;
  if (f.isBezier !== undefined) o.isBezier = f.isBezier;
  if (f.isLinearBezier !== undefined) o.isLinearBezier = f.isLinearBezier;
  if (f.value !== undefined && (typeof f.value !== "object" || f.value === null)) o.value = f.value;
  const a = vec3ToJson(f.a);
  const b = vec3ToJson(f.b);
  const c = vec3ToJson(f.c);
  if (a) o.a = a;
  if (b) o.b = b;
  if (c) o.c = c;
  return o;
}

function serializeController(ctrl: OdysseyController): object {
  const c = ctrl as OdysseyController & {
    type: OdysseyModelControllerType;
    frameCount: number;
    timeKeyIndex?: number;
    dataValueIndex?: number;
    columnCount?: number;
    nodeType?: number;
  };
  return {
    type: controllerTypeName(c.type),
    typeId: c.type,
    frameCount: c.frameCount,
    timeKeyIndex: c.timeKeyIndex,
    dataValueIndex: c.dataValueIndex,
    columnCount: c.columnCount,
    nodeType: c.nodeType,
    data: (c.data || []).map(serializeFrame),
  };
}

function serializeNodeExtra(node: OdysseyModelNode): Record<string, unknown> | undefined {
  if (node instanceof OdysseyModelNodeMesh) {
    return {
      nodeKind: "mesh",
      textureMap1: node.textureMap1,
      textureMap2: node.textureMap2,
      textureMap3: node.textureMap3,
      textureMap4: node.textureMap4,
      verticesCount: node.verticesCount,
      textureCount: node.textureCount,
      faceCount: node.faces?.length ?? 0,
      boundingBox: {
        min: vec3ToJson(node.boundingBox?.min),
        max: vec3ToJson(node.boundingBox?.max),
      },
      radius: node.radius,
      transparencyHint: node.transparencyHint,
      hasLightmap: node.hasLightmap,
      MDXDataSize: node.MDXDataSize,
      MDXNodeDataOffset: node.MDXNodeDataOffset,
      diffuse: colorToJson(node.diffuse),
      ambient: colorToJson(node.ambient),
    };
  }
  const ctor = node.constructor?.name;
  if (ctor && ctor !== "OdysseyModelNode") {
    return { nodeKind: ctor.replace(/^OdysseyModelNode/, "") || ctor };
  }
  return undefined;
}

function serializeModelNode(node: OdysseyModelNode, parentName: string | null): object {
  const controllers: object[] = [];
  for (const [, ctrl] of node.controllers) {
    controllers.push(serializeController(ctrl));
  }
  const extra = serializeNodeExtra(node);
  return {
    name: node.name,
    nodeType: node.nodeType,
    parentName,
    isRootNode: node.isRootNode,
    isAnimDummyNode: node.isAnimDummyNode,
    roomStatic: node.roomStatic,
    supernode: node.supernode,
    nodePosition: node.nodePosition,
    childOffsets: node.childOffsets,
    position: vec3ToJson(node.position),
    quaternion: quatToJson(node.quaternion),
    childArrayDefinition: node.childArrayDefinition,
    controllerArrayDefinition: node.controllerArrayDefinition,
    controllerDataArrayDefinition: node.controllerDataArrayDefinition,
    ...(extra ? { extra } : {}),
    controllers,
    children: node.children.map((ch) => serializeModelNode(ch, node.name)),
  };
}

function serializeAnimationNode(node: OdysseyModelAnimationNode, parentName: string | null): object {
  return serializeModelNode(node, parentName) as object;
}

function serializeAnimation(anim: OdysseyModelAnimation): object {
  return {
    name: anim.name,
    modelName: anim.modelName,
    length: anim.length,
    transition: anim.transition,
    functionPointer0: anim.functionPointer0,
    functionPointer1: anim.functionPointer1,
    rootNodeOffset: anim.rootNodeOffset,
    nodeCount: anim.nodeCount,
    refCount: anim.refCount,
    geometryType: anim.geometryType,
    unknown4: anim.unknown4 ? Array.from(anim.unknown4) : [],
    events: anim.events,
    rootNode: anim.rootNode ? serializeAnimationNode(anim.rootNode, null) : undefined,
  };
}

function cloneGeometryHeader(gh: IOdysseyGeometryHeader): object {
  return {
    functionPointer0: gh.functionPointer0,
    functionPointer1: gh.functionPointer1,
    modelName: gh.modelName,
    rootNodeOffset: gh.rootNodeOffset,
    nodeCount: gh.nodeCount,
    unknown1ArrayDefinition: gh.unknown1ArrayDefinition,
    unknown2ArrayDefinition: gh.unknown2ArrayDefinition,
    refCount: gh.refCount,
    geometryType: gh.geometryType,
    unknown4: gh.unknown4 ? Array.from(gh.unknown4) : [],
    rootNodeOffset2: gh.rootNodeOffset2,
    padding: gh.padding,
    mdxLength: gh.mdxLength,
    mdxOffset: gh.mdxOffset,
  };
}

/**
 * Serializes a parsed {@link OdysseyModel} (MDL/MDX) to a plain JSON-compatible object.
 * Mesh nodes include metadata and texture names but not raw vertex buffers.
 */
export function odysseyModelToJSON(model: OdysseyModel): object {
  const engineName = OdysseyModelEngine[model.engine];
  return {
    format: "KotOR.OdysseyModel",
    version: 1,
    engine: model.engine,
    engineName: typeof engineName === "string" ? engineName : String(model.engine),
    fileHeader: { ...model.fileHeader },
    geometryHeader: cloneGeometryHeader(model.geometryHeader),
    modelHeader: { ...model.modelHeader },
    names: model.names,
    rootNode: serializeModelNode(model.rootNode, null),
    animations: model.animations.map(serializeAnimation),
  };
}
