import { OdysseyModelMDXFlag } from "@/enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModel } from "@/odyssey/OdysseyModel";
import { OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelNodeSkin } from "@/odyssey/OdysseyModelNodeSkin";
import {
  alignTo16,
  MDX_SENTINEL_NON_SKIN,
  MDX_SENTINEL_SKIN,
} from "@/odyssey/binary/OdysseyModelBinaryLayout";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";

type MdxMeshEntry = {
  mesh: OdysseyModelNodeMesh;
  isSkin: boolean;
};

/**
 * Builds an MDX blob: per-mesh interleaved vertex data, sentinel row, 16-byte alignment between meshes.
 */
export class OdysseyModelBinaryMdxWriter {
  static write(model: OdysseyModel): Uint8Array {
    const meshes = this.collectMeshes(model);
    if (meshes.length === 0) {
      return new Uint8Array(0);
    }

    const writer = new BinaryWriter();
    for (let i = 0; i < meshes.length; i++) {
      const { mesh, isSkin } = meshes[i];
      const stride = mesh.MDXDataSize || this.inferStride(mesh);
      if (stride <= 0 || mesh.verticesCount <= 0) {
        continue;
      }

      mesh.MDXNodeDataOffset = writer.tell();
      this.writeMeshVertices(writer, mesh, stride);

      const sentinel = isSkin ? MDX_SENTINEL_SKIN : MDX_SENTINEL_NON_SKIN;
      writer.writeSingle(sentinel);
      writer.writeSingle(0);
      writer.writeSingle(0);
      const padFloats = (stride / 4) - 3;
      for (let p = 0; p < padFloats; p++) {
        writer.writeSingle(0);
      }

      const isLast = i === meshes.length - 1;
      if (!isLast) {
        const aligned = alignTo16(writer.tell());
        while (writer.tell() < aligned) {
          writer.writeByte(0);
        }
      }
    }

    return writer.buffer.subarray(0, writer.tell());
  }

  private static collectMeshes(model: OdysseyModel): MdxMeshEntry[] {
    const nonSkin: MdxMeshEntry[] = [];
    const skin: MdxMeshEntry[] = [];

    const walk = (node: import("@/odyssey/OdysseyModelNode").OdysseyModelNode) => {
      if (node instanceof OdysseyModelNodeMesh) {
        const entry: MdxMeshEntry = {
          mesh: node,
          isSkin: (node.nodeType & OdysseyModelNodeType.Skin) === OdysseyModelNodeType.Skin,
        };
        if (entry.isSkin) {
          skin.push(entry);
        } else {
          nonSkin.push(entry);
        }
      }
      for (const child of node.children) {
        walk(child);
      }
    };

    if (model.rootNode) {
      walk(model.rootNode);
    }
    return [...nonSkin, ...skin];
  }

  private static inferStride(mesh: OdysseyModelNodeMesh): number {
    let stride = 0;
    const add = (n: number) => {
      stride += n;
    };
    const flags = mesh.MDXDataBitmap;
    if (flags & OdysseyModelMDXFlag.VERTEX) add(12);
    if (flags & OdysseyModelMDXFlag.NORMAL) add(12);
    if (mesh.MDXVertexColorsOffset >= 0) add(12);
    if (flags & OdysseyModelMDXFlag.UV1) add(8);
    if (flags & OdysseyModelMDXFlag.UV2) add(8);
    if (flags & OdysseyModelMDXFlag.UV3) add(8);
    if (flags & OdysseyModelMDXFlag.UV4) add(8);
    if (flags & OdysseyModelMDXFlag.TANGENT1) add(36);
    if (flags & OdysseyModelMDXFlag.TANGENT2) add(36);
    if (flags & OdysseyModelMDXFlag.TANGENT3) add(36);
    if (flags & OdysseyModelMDXFlag.TANGENT4) add(36);
    if (mesh instanceof OdysseyModelNodeSkin) {
      add(16);
      add(16);
    }
    return stride || mesh.MDXDataSize || 0;
  }

  private static writeMeshVertices(
    writer: BinaryWriter,
    mesh: OdysseyModelNodeMesh,
    stride: number,
  ): void {
    const flags = mesh.MDXDataBitmap;
    const n = mesh.verticesCount;
    const row = new Uint8Array(stride);
    const dv = new DataView(row.buffer);

    const putF32 = (byteOff: number, value: number) => {
      if (byteOff < 0 || byteOff + 4 > stride) return;
      dv.setFloat32(byteOff, value, true);
    };

    for (let i = 0; i < n; i++) {
      row.fill(0);
      const vi = i * 3;
      const ui = i * 2;

      if (flags & OdysseyModelMDXFlag.VERTEX) {
        putF32(mesh.MDXVertexOffset, mesh.vertices[vi] ?? 0);
        putF32(mesh.MDXVertexOffset + 4, mesh.vertices[vi + 1] ?? 0);
        putF32(mesh.MDXVertexOffset + 8, mesh.vertices[vi + 2] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.NORMAL) {
        putF32(mesh.MDXVertexNormalsOffset, mesh.normals[vi] ?? 0);
        putF32(mesh.MDXVertexNormalsOffset + 4, mesh.normals[vi + 1] ?? 0);
        putF32(mesh.MDXVertexNormalsOffset + 8, mesh.normals[vi + 2] ?? 0);
      }
      if (mesh.MDXVertexColorsOffset >= 0) {
        putF32(mesh.MDXVertexColorsOffset, mesh.colors[vi] ?? 0);
        putF32(mesh.MDXVertexColorsOffset + 4, mesh.colors[vi + 1] ?? 0);
        putF32(mesh.MDXVertexColorsOffset + 8, mesh.colors[vi + 2] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.UV1 && mesh.MDXUVOffset1 >= 0) {
        putF32(mesh.MDXUVOffset1, mesh.tvectors[0][ui] ?? 0);
        putF32(mesh.MDXUVOffset1 + 4, mesh.tvectors[0][ui + 1] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.UV2 && mesh.MDXUVOffset2 >= 0) {
        putF32(mesh.MDXUVOffset2, mesh.tvectors[1][ui] ?? 0);
        putF32(mesh.MDXUVOffset2 + 4, mesh.tvectors[1][ui + 1] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.UV3 && mesh.MDXUVOffset3 >= 0 && mesh.tvectors[2]?.length) {
        putF32(mesh.MDXUVOffset3, mesh.tvectors[2][ui] ?? 0);
        putF32(mesh.MDXUVOffset3 + 4, mesh.tvectors[2][ui + 1] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.UV4 && mesh.MDXUVOffset4 >= 0 && mesh.tvectors[3]?.length) {
        putF32(mesh.MDXUVOffset4, mesh.tvectors[3][ui] ?? 0);
        putF32(mesh.MDXUVOffset4 + 4, mesh.tvectors[3][ui + 1] ?? 0);
      }
      if (flags & OdysseyModelMDXFlag.TANGENT1 && mesh.tangent1) {
        this.putTangentRow(putF32, mesh.offsetToMdxTangent1, mesh.tangent1, i);
      }
      if (flags & OdysseyModelMDXFlag.TANGENT2 && mesh.tangent2) {
        this.putTangentRow(putF32, mesh.offsetToMdxTangent2, mesh.tangent2, i);
      }
      if (flags & OdysseyModelMDXFlag.TANGENT3 && mesh.tangent3) {
        this.putTangentRow(putF32, mesh.offsetToMdxTangent3, mesh.tangent3, i);
      }
      if (flags & OdysseyModelMDXFlag.TANGENT4 && mesh.tangent4) {
        this.putTangentRow(putF32, mesh.offsetToMdxTangent4, mesh.tangent4, i);
      }
      if (mesh instanceof OdysseyModelNodeSkin) {
        const wi = i * 4;
        putF32(mesh.MDXBoneWeightOffset, mesh.weights[wi] ?? 0);
        putF32(mesh.MDXBoneWeightOffset + 4, mesh.weights[wi + 1] ?? 0);
        putF32(mesh.MDXBoneWeightOffset + 8, mesh.weights[wi + 2] ?? 0);
        putF32(mesh.MDXBoneWeightOffset + 12, mesh.weights[wi + 3] ?? 0);
        putF32(mesh.MDXBoneIndexOffset, mesh.boneIdx[wi] ?? 0);
        putF32(mesh.MDXBoneIndexOffset + 4, mesh.boneIdx[wi + 1] ?? 0);
        putF32(mesh.MDXBoneIndexOffset + 8, mesh.boneIdx[wi + 2] ?? 0);
        putF32(mesh.MDXBoneIndexOffset + 12, mesh.boneIdx[wi + 3] ?? 0);
      }

      writer.writeBytes(row);
    }
  }

  private static putTangentRow(
    putF32: (byteOff: number, value: number) => void,
    baseOff: number,
    tangent: { tangents: number[]; bitangents: number[]; normals: number[] },
    i: number,
  ): void {
    if (baseOff < 0) return;
    const j = i * 3;
    putF32(baseOff, tangent.tangents[j] ?? 0);
    putF32(baseOff + 4, tangent.tangents[j + 1] ?? 0);
    putF32(baseOff + 8, tangent.tangents[j + 2] ?? 0);
    putF32(baseOff + 12, tangent.bitangents[j] ?? 0);
    putF32(baseOff + 16, tangent.bitangents[j + 1] ?? 0);
    putF32(baseOff + 20, tangent.bitangents[j + 2] ?? 0);
    putF32(baseOff + 24, tangent.normals[j] ?? 0);
    putF32(baseOff + 28, tangent.normals[j + 1] ?? 0);
    putF32(baseOff + 32, tangent.normals[j + 2] ?? 0);
  }
}
