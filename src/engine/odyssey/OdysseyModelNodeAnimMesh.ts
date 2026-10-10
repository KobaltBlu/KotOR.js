import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "@core/interface/odyssey/IOdysseyArrayDefinition";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";
import { populateAnimMeshFromDecoded } from "@engine/odyssey/domain/populateMeshFromDecoded";

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
  /** AnimMesh sampling period. */
  samplePeriod: number = 0;

  /** Animated vertex positions. */
  animVerts: [number, number, number][] = [];

  /** Animated texture coordinates, 3 floats per entry. */
  animTVerts: [number, number, number][] = [];

  /** Relocated when {@link dataCount1} is non-zero. */
  dataPtr1: number = 0;
  dataCount1: number = 0;
  dataPtr1Payload: Float32Array | undefined;

  /** Padding on disk. */
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

    const samplePeriod = this.odysseyModel.mdlReader.readSingle();

    this.animVertsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.animTVertsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    const animVerts = this.readVec3Array(base, this.animVertsArrayDefinition);
    const animTVerts = this.readVec3Array(base, this.animTVertsArrayDefinition);

    const dataPtr1 = this.odysseyModel.mdlReader.readUInt32();
    const dataCount1 = this.odysseyModel.mdlReader.readUInt32();

    let dataPtr1Payload: Float32Array | undefined;
    if (dataCount1 > 0 && dataPtr1 > 0) {
      dataPtr1Payload = OdysseyModelUtility.ReadArrayFloats(
        this.odysseyModel.mdlReader,
        base + dataPtr1,
        dataCount1,
      );
    }

    const padding24 = this.odysseyModel.mdlReader.readUInt32();
    const animVerticesPtr = this.odysseyModel.mdlReader.readUInt32();
    const animTexVerticesPtr = this.odysseyModel.mdlReader.readUInt32();
    const animVerticesCount = this.odysseyModel.mdlReader.readUInt32();
    const animTexVerticesCount = this.odysseyModel.mdlReader.readUInt32();

    populateAnimMeshFromDecoded(this, {
      samplePeriod,
      animVerts,
      animTVerts,
      dataPtr1,
      dataCount1,
      dataPtr1Payload,
      padding24,
      animVerticesPtr,
      animTexVerticesPtr,
      animVerticesCount,
      animTexVerticesCount,
    });
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
