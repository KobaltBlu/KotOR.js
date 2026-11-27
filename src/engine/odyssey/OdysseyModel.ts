import { BinaryReader } from "@core/binary/BinaryReader";
import { OdysseyModelEngine } from "@core/enums/odyssey/OdysseyModelEngine";
import { IOdysseyArrayDefinition } from "@core/interface/odyssey/IOdysseyArrayDefinition";
import { IOdysseyFileHeader } from "@core/interface/odyssey/IOdysseyFileHeader";
import { IOdysseyGeometryHeader } from "@core/interface/odyssey/IOdysseyGeometryHeader";
import { IOdysseyModelHeader } from "@core/interface/odyssey/IOdysseyModelHeader";
import { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import {
  OdysseyModelBinaryWriter,
  type OdysseyModelBinaryBuffers,
  type OdysseyModelBinaryWriteOptions,
} from "@engine/odyssey/binary/OdysseyModelBinaryWriter";
import {
  OdysseyModelBinaryReader,
  type OdysseyModelBinaryReadOptions,
} from "@engine/odyssey/binary/OdysseyModelBinaryReader";
import { MDL_FN_PTR_K1_PC } from "@engine/odyssey/binary/OdysseyModelBinaryLayout";

/**
 * OdysseyModel class.
 * 
 * The OdysseyModel class takes an MDL & MDX file and decode the values to later be passed to a 
 * OdysseyModel3D class to be converted into an object that can be added to the scene graph.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModel {

  mdlReader: BinaryReader;
  mdxReader: BinaryReader;

  fileHeader: IOdysseyFileHeader = {} as IOdysseyFileHeader;
  geometryHeader: IOdysseyGeometryHeader = {} as IOdysseyGeometryHeader;
  modelHeader: IOdysseyModelHeader = {} as IOdysseyModelHeader;

  animations: OdysseyModelAnimation[] = [];
  rootNode: OdysseyModelNode;
  engine: OdysseyModelEngine;

  names: string[];
  nodes: Map<string, OdysseyModelNode> = new Map();

  namesArrayDefinition: IOdysseyArrayDefinition;
  nameOffsetsArray: Uint32Array;

  /** Original file bytes when loaded with `preserveSourceBinary` (for MDL round-trip). */
  sourceMdl?: Uint8Array;
  sourceMdx?: Uint8Array;

  private changeListeners: Set<(event: OdysseyModelChangeEvent) => void> = new Set();

  /** Banner / optional geometry fields preserved when loading from {@link OdysseyModel.fromAscii}. */
  asciiCompressQuaternions?: number;
  asciiHeadLink?: number;
  /** MDLedit `layoutposition` (beginmodelgeom). */
  asciiLayoutPosition?: { x: number; y: number; z: number };
  
  constructor(
    mdlReader: BinaryReader,
    mdxReader: BinaryReader,
    options?: OdysseyModelBinaryReadOptions,
  ) {
    OdysseyModelBinaryReader.readInto(this, mdlReader, mdxReader, options);
  }

  getAnimationDummyNodeName(){
    return this.geometryHeader.modelName.trim().toLowerCase() + 'a';
  }

  static FromBuffers(
    mdl_buffer: Uint8Array,
    mdx_buffer: Uint8Array = new Uint8Array(0),
    options?: { preserveSourceBinary?: boolean },
  ): OdysseyModel {
    const mdlReader = new BinaryReader(mdl_buffer);
    const mdxReader = new BinaryReader(mdx_buffer);
    return new OdysseyModel(mdlReader, mdxReader, {
      preserveSourceBinary: options?.preserveSourceBinary ?? true,
    });
  }

  /** Serialize to paired MDL/MDX binary buffers. */
  toBinaryBuffers(options?: OdysseyModelBinaryWriteOptions): OdysseyModelBinaryBuffers {
    return OdysseyModelBinaryWriter.write(this, options);
  }

  /** Default K1 PC toolset function pointer for new binary models. */
  static defaultK1FunctionPointer0(): number {
    return MDL_FN_PTR_K1_PC;
  }

  addChangeListener(listener: (event: OdysseyModelChangeEvent) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.removeChangeListener(listener);
  }

  removeChangeListener(listener: (event: OdysseyModelChangeEvent) => void): void {
    this.changeListeners.delete(listener);
  }

  emitChange(event: OdysseyModelChangeEvent): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("OdysseyModel.emitChange listener error", e);
      }
    });
  }

  markMetaChanged(field?: string): void {
    this.emitChange({
      kind: "model.meta",
      model: this,
      field,
    });
  }

  markControllerKeyframesChanged(nodeUUID: string, animationName?: string): void {
    this.emitChange({
      kind: "controller.keyframes",
      model: this,
      nodeUUID,
      animationName,
    });
  }

  markNodeMaterialChanged(nodeUUID: string): void {
    this.emitChange({
      kind: "node.material",
      model: this,
      nodeUUID,
    });
  }

  markNodeGeometryChanged(nodeUUID: string): void {
    this.emitChange({
      kind: "node.geometry",
      model: this,
      nodeUUID,
    });
  }

  markNodeHierarchyChanged(nodeUUID: string): void {
    this.emitChange({
      kind: "node.hierarchy",
      model: this,
      nodeUUID,
    });
  }

  markNodeTransformChanged(nodeUUID: string): void {
    this.emitChange({
      kind: "node.transform",
      model: this,
      nodeUUID,
    });
  }
  
}

export type OdysseyModelChangeKind =
  | "node.transform"
  | "controller.keyframes"
  | "node.material"
  | "node.geometry"
  | "node.hierarchy"
  | "model.meta";

export interface OdysseyModelChangeEvent {
  kind: OdysseyModelChangeKind;
  model: OdysseyModel;
  nodeUUID?: string;
  animationName?: string;
  field?: string;
}
