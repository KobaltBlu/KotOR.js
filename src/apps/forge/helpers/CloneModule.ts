/**
 * CloneModule – clone a KotOR module (MOD) with new identifier/name.
 * Ported from PyKotor toolset clone_module logic.
 */

import { ERFObject } from "../../../resource/ERFObject";
import { GFFObject } from "../../../resource/GFFObject";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { BinaryWriter } from "../../../utility/binary/BinaryWriter";

const ERF_HEADER_SIZE = 160;

export interface CloneModuleOptions {
  sourceBuffer: Uint8Array;
  identifier: string;
  prefix: string;
  name: string;
  copyTextures: boolean;
  copyLightmaps: boolean;
  keepDoors: boolean;
  keepPlaceables: boolean;
  keepSounds: boolean;
  keepPathing: boolean;
  outputPath: string;
}

/** Creates an empty ERF file header (160 bytes). For use with File > New > New ERF…. */
export function createEmptyErfHeader(): Uint8Array {
  const bw = new BinaryWriter(new Uint8Array(ERF_HEADER_SIZE));
  bw.writeString("ERF ");
  bw.writeString("V1.0");
  bw.writeUInt32(0); // languageCount
  bw.writeUInt32(0); // localizedStringSize
  bw.writeUInt32(0); // entryCount
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToLocalizedString
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToKeyList
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToResourceList
  bw.writeUInt32(new Date().getFullYear() - 1900);
  bw.writeUInt32(ERFObject.DayOfTheYear());
  bw.writeUInt32(0); // DescriptionStrRef
  bw.writeBytes(new Uint8Array(116)); // reserved
  return bw.buffer.slice(0, ERF_HEADER_SIZE);
}

/** Creates an empty MOD file header (160 bytes). For use with File > New > New MOD…. */
export function createEmptyModHeader(): Uint8Array {
  const bw = new BinaryWriter(new Uint8Array(ERF_HEADER_SIZE));
  bw.writeString("MOD ");
  bw.writeString("V1.0");
  bw.writeUInt32(0); // languageCount
  bw.writeUInt32(0); // localizedStringSize
  bw.writeUInt32(0); // entryCount
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToLocalizedString
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToKeyList
  bw.writeUInt32(ERF_HEADER_SIZE); // offsetToResourceList
  bw.writeUInt32(new Date().getFullYear() - 1900);
  bw.writeUInt32(ERFObject.DayOfTheYear());
  bw.writeUInt32(0); // DescriptionStrRef
  bw.writeBytes(new Uint8Array(116)); // reserved
  return bw.buffer.slice(0, ERF_HEADER_SIZE);
}

/**
 * Clones a MOD from a source buffer. copyTextures/copyLightmaps require game
 * installation context (textures/lightmaps are resolved from BIF/override);
 * when not available they are ignored and only core module resources are cloned.
 */
export async function cloneModuleFromBuffer(options: CloneModuleOptions): Promise<void> {
  const {
    sourceBuffer,
    identifier,
    name,
    keepDoors,
    keepPlaceables,
    keepSounds,
    keepPathing,
    outputPath,
    copyTextures: _copyTextures,
    copyLightmaps: _copyLightmaps,
  } = options;
  // copyTextures/copyLightmaps: full support would need LYT/MDL parsing and game installation texture lookup (see PyKotor module.clone_module)

  const sourceErf = new ERFObject(sourceBuffer);
  await sourceErf.load();

  const ifoBuffer = await sourceErf.getResourceBufferByResRef("module", ResourceTypes.ifo);
  if (!ifoBuffer || ifoBuffer.length === 0) {
    throw new Error("Source MOD has no module.ifo");
  }

  const ifoGff = new GFFObject(ifoBuffer);

  const areaList = ifoGff.RootNode.getFieldByLabel("Mod_Area_list");
  if (!areaList || !areaList.getChildStructs().length) {
    throw new Error("Source MOD has no Mod_Area_list");
  }
  const firstArea = areaList.getChildStructs()[0];
  const oldAreaName = firstArea.getFieldByLabel("Area_Name")?.getValue() ?? "module";

  const modResRef = ifoGff.RootNode.getFieldByLabel("Mod_ResRef");
  if (modResRef) modResRef.setValue(identifier);
  const modName = ifoGff.RootNode.getFieldByLabel("Mod_Name");
  if (modName) modName.setValue(identifier.toUpperCase());
  const modTag = ifoGff.RootNode.getFieldByLabel("Mod_Tag");
  if (modTag) modTag.setValue(identifier.toUpperCase());
  const areaNameField = firstArea.getFieldByLabel("Area_Name");
  if (areaNameField) areaNameField.setValue(identifier);

  const newIfoBuffer = ifoGff.getExportBuffer();

  let areBuffer: Uint8Array;
  const areBuf = await sourceErf.getResourceBufferByResRef(oldAreaName, ResourceTypes.are);
  if (areBuf && areBuf.length > 0) {
    const areGff = new GFFObject(areBuf);
    const nameField = areGff.RootNode.getFieldByLabel("Name");
    if (nameField && nameField.cexoLocString) {
      const loc = nameField.getCExoLocString();
      loc.strings = [];
      loc.addSubString(name || identifier, 0);
    }
    areBuffer = areGff.getExportBuffer();
  } else {
    throw new Error("Source MOD has no ARE file");
  }

  let gitBuffer: Uint8Array;
  const gitBuf = await sourceErf.getResourceBufferByResRef(oldAreaName, ResourceTypes.git);
  if (gitBuf && gitBuf.length > 0) {
    const gitGff = new GFFObject(gitBuf);
    if (!keepDoors) {
      const doors = gitGff.RootNode.getFieldByLabel("Door List");
      if (doors) doors.childStructs = [];
    }
    if (!keepPlaceables) {
      const placeables = gitGff.RootNode.getFieldByLabel("Placeable List");
      if (placeables) placeables.childStructs = [];
    }
    if (!keepSounds) {
      const sounds = gitGff.RootNode.getFieldByLabel("SoundList");
      if (sounds) sounds.childStructs = [];
    }
    const creatures = gitGff.RootNode.getFieldByLabel("Creature List");
    if (creatures) creatures.childStructs = [];
    const encounters = gitGff.RootNode.getFieldByLabel("Encounter List");
    if (encounters) encounters.childStructs = [];
    const stores = gitGff.RootNode.getFieldByLabel("StoreList");
    if (stores) stores.childStructs = [];
    const waypoints = gitGff.RootNode.getFieldByLabel("WaypointList");
    if (waypoints) waypoints.childStructs = [];
    const cameras = gitGff.RootNode.getFieldByLabel("CameraList");
    if (cameras) cameras.childStructs = [];
    gitBuffer = gitGff.getExportBuffer();
  } else {
    throw new Error("Source MOD has no GIT file");
  }

  let lytBuffer: Uint8Array | null = null;
  let visBuffer: Uint8Array | null = null;
  let pthBuffer: Uint8Array | null = null;
  const lytBuf = await sourceErf.getResourceBufferByResRef(oldAreaName, ResourceTypes.lyt);
  const visBuf = await sourceErf.getResourceBufferByResRef(oldAreaName, ResourceTypes.vis);
  if (lytBuf && lytBuf.length > 0) {
    lytBuffer = lytBuf;
    if (visBuf && visBuf.length > 0) visBuffer = visBuf;
  }
  if (keepPathing) {
    const pthBuf = await sourceErf.getResourceBufferByResRef(oldAreaName, ResourceTypes.pth);
    if (pthBuf && pthBuf.length > 0) pthBuffer = pthBuf;
  }

  const emptyHeader = createEmptyModHeader();
  const newErf = new ERFObject(emptyHeader);
  await newErf.load();

  newErf.addResource("module", ResourceTypes.ifo, newIfoBuffer);
  newErf.addResource(identifier, ResourceTypes.are, areBuffer);
  newErf.addResource(identifier, ResourceTypes.git, gitBuffer);
  if (lytBuffer) newErf.addResource(identifier, ResourceTypes.lyt, lytBuffer);
  if (visBuffer) newErf.addResource(identifier, ResourceTypes.vis, visBuffer);
  if (pthBuffer) newErf.addResource(identifier, ResourceTypes.pth, pthBuffer);

  const outBuffer = newErf.getExportBuffer();

  const fs = (typeof require !== "undefined" && require("fs")) || (typeof window !== "undefined" && (window as any).require?.("fs"));
  if (fs?.promises?.writeFile) {
    await fs.promises.writeFile(outputPath, Buffer.from(outBuffer));
  } else {
    throw new Error("File system write not available (run in Electron for Save dialog).");
  }
}
