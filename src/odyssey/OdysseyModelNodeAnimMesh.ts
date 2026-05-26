import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "@/interface/odyssey/IOdysseyArrayDefinition";
import type { OdysseyModel } from "@/odyssey/OdysseyModel";
import type { OdysseyModelNode } from "@/odyssey/OdysseyModelNode";
import { OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelUtility } from "@/odyssey/OdysseyModelUtility";

/**
 * Animated mesh (AnimMesh, node type 0x00A1).
 *
 * Extends TriMesh with time-sampled vertex positions and texture coordinates.
 * Binary layout: 332-byte TriMesh extra + 56-byte AnimMesh extra (468 bytes total
 * beyond the 80-byte base node header).
 * 
 * @see <https://synchro.codeberg.page/rakata/api/rakata_formats/mdl/types/struct.MdlAnimMesh.html>
 */
export class OdysseyModelNodeAnimMesh extends OdysseyModelNodeMesh {
  /** AnimMesh extra +0x00 — animation sampling period. */
  samplePeriod: number = 0;

  /** Animated vertex positions (CExoArrayList at extra +0x04). */
  animVerts: [number, number, number][] = [];

  /** Animated texture coordinates, 3 floats per entry (extra +0x10). */
  animTVerts: [number, number, number][] = [];

  /** Relocated when {@link dataCount1} is non-zero (extra +0x1C). */
  dataPtr1: number = 0;
  dataCount1: number = 0;
  dataPtr1Payload: Float32Array | undefined;

  /** Extra +0x24 — padding on disk. */
  padding24: number = 0;

  /** Runtime-only fields (zero on disk); preserved for round-trip fidelity. */
  animVerticesPtr: number = 0;
  animTexVerticesPtr: number = 0;
  animVerticesCount: number = 0;
  animTexVerticesCount: number = 0;

  animVertsArrayDefinition: IOdysseyArrayDefinition;
  animTVertsArrayDefinition: IOdysseyArrayDefinition;

  constructor(parent: OdysseyModelNode) {
    super(parent);
    this.type |= OdysseyModelNodeType.Anim;
  }

  readBinary(odysseyModel: OdysseyModel) {
    super.readBinary(odysseyModel);

    const base = odysseyModel.fileHeader.modelDataOffset;

    this.samplePeriod = this.odysseyModel.mdlReader.readSingle();

    this.animVertsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.animTVertsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.animVerts = this.readVec3Array(base, this.animVertsArrayDefinition);
    this.animTVerts = this.readVec3Array(base, this.animTVertsArrayDefinition);

    this.dataPtr1 = this.odysseyModel.mdlReader.readUInt32();
    this.dataCount1 = this.odysseyModel.mdlReader.readUInt32();

    if (this.dataCount1 > 0 && this.dataPtr1 > 0) {
      this.dataPtr1Payload = OdysseyModelUtility.ReadArrayFloats(
        this.odysseyModel.mdlReader,
        base + this.dataPtr1,
        this.dataCount1,
      );
    }

    this.padding24 = this.odysseyModel.mdlReader.readUInt32();
    this.animVerticesPtr = this.odysseyModel.mdlReader.readUInt32();
    this.animTexVerticesPtr = this.odysseyModel.mdlReader.readUInt32();
    this.animVerticesCount = this.odysseyModel.mdlReader.readUInt32();
    this.animTexVerticesCount = this.odysseyModel.mdlReader.readUInt32();
  }

  private readVec3Array(
    modelDataOffset: number,
    def: IOdysseyArrayDefinition,
  ): [number, number, number][] {
    if (!def?.count) {
      return [];
    }

    const floats = OdysseyModelUtility.ReadArrayFloats(
      this.odysseyModel.mdlReader,
      modelDataOffset + def.offset,
      def.count * 3,
    );

    const out: [number, number, number][] = new Array(def.count);
    for (let i = 0; i < def.count; i++) {
      const j = i * 3;
      out[i] = [floats[j], floats[j + 1], floats[j + 2]];
    }
    return out;
  }
}
