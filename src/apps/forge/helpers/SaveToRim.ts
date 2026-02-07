/**
 * Build a minimal RIM buffer containing a single resource and optionally write to file.
 * RIMObject has no getExportBuffer/addResource(resRef, resType, data), so we build the RIM manually.
 * RIM format: 160-byte header, then resource table (34 bytes per entry), then resource data.
 */

import { BinaryWriter } from "../../../utility/binary/BinaryWriter";

const RIM_HEADER_LENGTH = 160;
const RIM_RESOURCE_ENTRY_SIZE = 34;

export interface SaveToRimOptions {
  resref: string;
  resType: number;
  data: Uint8Array;
  /** If set, write the RIM to this path (Electron/Node). */
  outputPath?: string;
}

/**
 * Build a RIM buffer with one resource. resRef is truncated/padded to 16 chars (null-padded).
 */
export function buildRimBuffer(options: SaveToRimOptions): Uint8Array {
  const { resref, resType, data } = options;
  const resRef16 = resref.toLowerCase().slice(0, 16).padEnd(16, "\0");
  const resourcesOffset = RIM_HEADER_LENGTH;
  const dataOffset = resourcesOffset + RIM_RESOURCE_ENTRY_SIZE;
  const totalSize = dataOffset + data.length;

  const buffer = new Uint8Array(totalSize);
  const bw = new BinaryWriter(buffer);

  bw.writeChars("RIM ");
  bw.writeChars("V1.0");
  bw.skip(4);
  bw.writeUInt32(1);
  bw.writeUInt32(resourcesOffset);
  bw.seek(RIM_HEADER_LENGTH);

  bw.writeChars(resRef16);
  bw.writeUInt16(resType & 0xffff);
  bw.writeUInt16(0);
  bw.writeUInt32(0);
  bw.writeUInt32(dataOffset);
  bw.writeUInt32(data.length);
  bw.skip(2);
  buffer.set(data, dataOffset);
  return buffer;
}

/**
 * Build RIM buffer and write to outputPath. Requires Node/Electron fs.
 */
export async function saveResourceToRim(options: SaveToRimOptions): Promise<string> {
  const { outputPath } = options;
  if (!outputPath) {
    throw new Error("outputPath is required for saveResourceToRim.");
  }
  const rimBuffer = buildRimBuffer(options);
  const fs =
    (typeof require !== "undefined" && require("fs")) ||
    (typeof window !== "undefined" && (window as any).require?.("fs"));
  if (!fs?.promises?.writeFile) {
    throw new Error("File system write not available (run in Electron for RIM save).");
  }
  const pathMod = typeof require !== "undefined" && require("path") ? require("path") : null;
  const dir = pathMod ? pathMod.dirname(outputPath) : outputPath.replace(/[/\\][^/\\]*$/, "");
  if (fs.promises.mkdir) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(outputPath, Buffer.from(rimBuffer));
  return outputPath;
}
