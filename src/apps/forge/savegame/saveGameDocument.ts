/**
 * Save-folder document for the Forge savegame editor.
 *
 * @file saveGameDocument.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as path from "path";
import { EditorFile } from "@/apps/forge/EditorFile";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ERFObject } from "@/resource/ERFObject";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { TGAObject } from "@/resource/TGAObject";
import { GameFileSystem } from "@/utility/GameFileSystem";
import {
  compareSaveModuleGffKeys,
  isSaveModuleGffExt,
  normalizeGameRelPath,
  resolveSaveFolderListedPath,
} from "@/apps/forge/savegame/saveGamePaths";
import {
  applyNfoFields,
  applyPartyTable,
  cloneGlobals,
  cloneNfo,
  cloneParty,
  emptyGlobals,
  emptyNfo,
  emptyParty,
  encodeGlobalVars,
  parseGlobalVars,
  parsePartyTable,
  readNfoFields,
  type SaveErfKey,
  type SaveFsKind,
  type SaveGameDocumentSnapshot,
  type SaveGlobals,
  type SaveLooseFile,
  type SaveNfoFields,
  type SavePackedModule,
  type SavePartyTable,
  type SaveThumbnail,
} from "@/apps/forge/savegame/saveGameCodecs";

export * from "@/apps/forge/savegame/saveGameCodecs";

export function listErfKeys(erf: ERFObject): SaveErfKey[] {
  const keys: SaveErfKey[] = [];
  const list = erf?.keyList || [];
  for (let i = 0; i < list.length; i++) {
    const key = list[i];
    const ext = ResourceTypes.getKeyByValue(key.resType) || "res";
    keys.push({
      resRef: key.resRef,
      resType: key.resType,
      ext,
      name: `${key.resRef}.${ext}`,
    });
  }
  keys.sort((a, b) => a.name.localeCompare(b.name));
  return keys;
}

function dirnameRel(rel: string): string {
  const n = normalizeGameRelPath(rel);
  const idx = n.lastIndexOf("/");
  return idx >= 0 ? n.slice(0, idx) : "";
}

function basenameRel(rel: string): string {
  const n = normalizeGameRelPath(rel);
  const idx = n.lastIndexOf("/");
  return idx >= 0 ? n.slice(idx + 1) : n;
}

function joinRel(dir: string, name: string): string {
  const base = normalizeGameRelPath(dir);
  const file = normalizeGameRelPath(name);
  return base ? `${base}/${file}` : file;
}

const CANONICAL_LOOSE_FILES = [
  "savenfo.res",
  "PARTYTABLE.res",
  "GLOBALVARS.res",
  "Screen.tga",
  "pifo.ifo",
  "SAVEGAME.sav",
];

async function listFolderFilePaths(kind: SaveFsKind, folderRel: string): Promise<string[]> {
  try {
    if (kind === "game") {
      return await GameFileSystem.readdir(folderRel, { recursive: false });
    }
    if (kind === "project") {
      return await ProjectFileSystem.readdir(folderRel, { recursive: false });
    }
    const fs = await import("fs");
    const names = await fs.promises.readdir(folderRel);
    return names.map((name) => path.join(folderRel, name));
  } catch (e) {
    console.warn("SaveGameDocument: failed to list save folder", folderRel, e);
    return [];
  }
}

async function readSidecarFile(doc: SaveGameDocument, fileName: string): Promise<Uint8Array | undefined> {
  const uri = doc.looseFileUri(fileName);
  try {
    const editorFile = new EditorFile({
      path: uri,
      useGameFileSystem: doc.kind === "game",
      useProjectFileSystem: doc.kind === "project",
    });
    const response = await editorFile.readFile();
    if (response?.buffer?.length) {
      return response.buffer;
    }
  } catch (e) {
    console.warn("SaveGameDocument.readSidecarFile", uri, e);
  }
  return await readFsFile(doc.kind, doc.siblingRel(fileName));
}

async function readFsFile(kind: SaveFsKind, relOrAbs: string): Promise<Uint8Array | undefined> {
  const target = kind === "disk" ? relOrAbs : normalizeGameRelPath(relOrAbs);
  try {
    if (kind === "game") {
      return await GameFileSystem.readFile(target);
    }
    if (kind === "project") {
      return await ProjectFileSystem.readFile(target);
    }
    const fs = await import("fs");
    return new Uint8Array(await fs.promises.readFile(target));
  } catch (e) {
    console.warn("SaveGameDocument.readFsFile", target, e);
    return undefined;
  }
}

async function writeEditorFile(kind: SaveFsKind, relOrAbs: string, data: Uint8Array): Promise<boolean> {
  if (kind === "disk") {
    const target = relOrAbs;
    try {
      const fs = await import("fs");
      await fs.promises.writeFile(target, data);
      return true;
    } catch (e) {
      console.error("SaveGameDocument.writeEditorFile", target, e);
      return false;
    }
  }
  const rel = normalizeGameRelPath(relOrAbs);
  const uri = kind === "project"
    ? EditorFile.referenceURIForProjectRelative(rel)
    : EditorFile.referenceURIForGameRelative(rel);
  const editorFile = new EditorFile({ path: uri });
  return await editorFile.writeBuffer(data);
}

function tgaToRgba(buffer: Uint8Array): SaveThumbnail | undefined {
  try {
    const tga = new TGAObject({ file: buffer, filename: "Screen" });
    const width = tga.header?.width || 0;
    const height = tga.header?.height || 0;
    if (!width || !height) {
      return undefined;
    }
    let raw: Uint8Array | undefined;
    tga.getPixelData((pixels: Uint8Array) => {
      raw = pixels;
    });
    if (!(raw instanceof Uint8Array) || !raw.length) {
      return undefined;
    }
    const bpp = tga.header.bitsPerPixel || 32;
    const rgba = new Uint8ClampedArray(width * height * 4);
    if (bpp === 32) {
      for (let i = 0, j = 0; i < raw.length && j < rgba.length; i += 4, j += 4) {
        rgba[j] = raw[i + 2];
        rgba[j + 1] = raw[i + 1];
        rgba[j + 2] = raw[i];
        rgba[j + 3] = raw[i + 3];
      }
    } else if (bpp === 24) {
      for (let i = 0, j = 0; i < raw.length && j < rgba.length; i += 3, j += 4) {
        rgba[j] = raw[i + 2];
        rgba[j + 1] = raw[i + 1];
        rgba[j + 2] = raw[i];
        rgba[j + 3] = 255;
      }
    } else {
      return undefined;
    }
    TGAObject.FlipY(rgba as unknown as Uint8Array, width, height);
    return { width, height, rgba };
  } catch {
    return undefined;
  }
}

export class SaveGameDocument {
  kind: SaveFsKind = "game";
  folderRel = "";
  folderName = "";
  savRel = "";
  nfo?: GFFObject;
  partyTable?: GFFObject;
  globalVars?: GFFObject;
  pifo?: GFFObject;
  erf?: ERFObject;
  nfoFields: SaveNfoFields = emptyNfo();
  globals: SaveGlobals = emptyGlobals();
  party: SavePartyTable = emptyParty();
  erfKeys: SaveErfKey[] = [];
  looseFiles: SaveLooseFile[] = [];
  packedModules: SavePackedModule[] = [];
  thumbnail?: SaveThumbnail;
  erfDirty = false;
  loadWarnings: string[] = [];
  nfoRel = "";
  partyRel = "";
  globalVarsRel = "";
  private packedErfs = new Map<string, ERFObject>();

  snapshot(): SaveGameDocumentSnapshot {
    return {
      nfo: cloneNfo(this.nfoFields),
      globals: cloneGlobals(this.globals),
      party: cloneParty(this.party),
    };
  }

  restore(snapshot: SaveGameDocumentSnapshot): void {
    this.nfoFields = cloneNfo(snapshot.nfo);
    this.globals = cloneGlobals(snapshot.globals);
    this.party = cloneParty(snapshot.party);
  }

  siblingRel(fileName: string): string {
    if (this.kind === "disk") {
      return path.join(this.folderRel, fileName);
    }
    return joinRel(this.folderRel, fileName);
  }

  archiveResourceUri(resRef: string, ext: string): string {
    if (this.kind === "project") {
      return `erf://project.dir/${normalizeGameRelPath(this.savRel)}?resref=${resRef}&restype=${ext}`;
    }
    if (this.kind === "game") {
      return EditorFile.referenceURIForArchiveResource("erf", this.savRel, resRef, ext);
    }
    return `erf://${normalizeGameRelPath(this.savRel)}?resref=${resRef}&restype=${ext}`;
  }

  looseFileUri(fileName: string): string {
    const rel = this.siblingRel(fileName);
    if (this.kind === "project") {
      return EditorFile.referenceURIForProjectRelative(normalizeGameRelPath(rel));
    }
    if (this.kind === "game") {
      return EditorFile.referenceURIForGameRelative(rel);
    }
    return rel;
  }

  findErfKey(resRef: string, ext: string): SaveErfKey | undefined {
    const want = `${resRef}.${ext}`.toLowerCase();
    return this.erfKeys.find((key) => key.name.toLowerCase() === want);
  }

  applyDecodedToGff(): void {
    if (!this.nfo) {
      this.nfo = new GFFObject();
      this.nfo.FileType = "NFO ";
    }
    applyNfoFields(this.nfo, this.nfoFields);

    if (!this.globalVars) {
      this.globalVars = new GFFObject();
      this.globalVars.FileType = "GVT ";
    }
    encodeGlobalVars(this.globalVars, this.globals);

    if (!this.partyTable) {
      this.partyTable = new GFFObject();
      this.partyTable.FileType = "PT  ";
    }
    applyPartyTable(this.partyTable, this.party);
  }

  async write(): Promise<boolean> {
    this.applyDecodedToGff();
    const jobs: Array<{ path: string; data: Uint8Array }> = [];
    if (this.nfo) {
      jobs.push({
        path: this.nfoRel || this.siblingRel("savenfo.res"),
        data: this.nfo.getExportBuffer(),
      });
    }
    if (this.globalVars) {
      jobs.push({
        path: this.globalVarsRel || this.siblingRel("GLOBALVARS.res"),
        data: this.globalVars.getExportBuffer(),
      });
    }
    if (this.partyTable) {
      jobs.push({
        path: this.partyRel || this.siblingRel("PARTYTABLE.res"),
        data: this.partyTable.getExportBuffer(),
      });
    }
    if (this.erfDirty && this.erf) {
      await this.erf.ensureResourceDataLoaded();
      jobs.push({
        path: this.savRel,
        data: this.erf.getExportBuffer(),
      });
    }
    for (let i = 0; i < jobs.length; i++) {
      const ok = await writeEditorFile(this.kind, jobs[i].path, jobs[i].data);
      if (!ok) {
        console.error("SaveGameDocument.write failed", jobs[i].path);
        return false;
      }
    }
    return true;
  }

  packedModuleGffKeys(moduleResRef: string): SaveErfKey[] {
    const packed = this.packedModules.find((row) => row.resRef.toLowerCase() === moduleResRef.toLowerCase());
    if (!packed) {
      return [];
    }
    return packed.resources.filter((key) => isSaveModuleGffExt(key.ext)).sort(compareSaveModuleGffKeys);
  }

  async getPackedResourceBuffer(moduleResRef: string, resRef: string, ext: string): Promise<Uint8Array> {
    const nested = this.packedErfs.get(moduleResRef.toLowerCase());
    if (!nested) {
      return new Uint8Array(0);
    }
    const resType = ResourceTypes[ext] ?? ResourceTypes.res;
    return await nested.getResourceBufferByResRef(resRef, resType);
  }

  async replacePackedResource(moduleResRef: string, resRef: string, ext: string, buffer: Uint8Array): Promise<boolean> {
    if (!this.erf) {
      return false;
    }
    const nested = this.packedErfs.get(moduleResRef.toLowerCase());
    if (!nested) {
      return false;
    }
    const resType = ResourceTypes[ext] ?? ResourceTypes.res;
    nested.setResource(resRef, resType, buffer);
    await nested.ensureResourceDataLoaded();
    const savBuffer = nested.getExportBuffer();
    this.erf.setResource(moduleResRef, ResourceTypes.sav, savBuffer);
    this.erfDirty = true;
    await this.erf.ensureResourceDataLoaded();
    return writeFsFile(this.kind, this.savRel, this.erf.getExportBuffer());
  }

  private async loadPackedModules(): Promise<void> {
    this.packedModules = [];
    this.packedErfs.clear();
    if (!this.erf) {
      return;
    }
    const keys = this.erf.keyList || [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.resType !== ResourceTypes.sav) {
        continue;
      }
      try {
        const buf = await this.erf.getResourceBufferByResRef(key.resRef, key.resType);
        if (!buf?.length) {
          this.loadWarnings.push(`Packed module ${key.resRef}.sav is empty.`);
          continue;
        }
        const nested = new ERFObject(buf);
        await nested.load();
        const resources = listErfKeys(nested);
        this.packedErfs.set(key.resRef.toLowerCase(), nested);
        this.packedModules.push({
          resRef: key.resRef,
          name: `${key.resRef}.sav`,
          resources,
        });
      } catch (e) {
        console.error("SaveGameDocument: failed to parse packed module", key.resRef, e);
        this.loadWarnings.push(`Could not parse packed module ${key.resRef}.sav.`);
      }
    }
    this.packedModules.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async loadFromEditorFile(file: EditorFile): Promise<SaveGameDocument> {
    const doc = new SaveGameDocument();
    if (file.useProjectFileSystem) {
      doc.kind = "project";
    } else if (file.useGameFileSystem) {
      doc.kind = "game";
    } else {
      doc.kind = "disk";
    }

    const savPath = String(file.path || "").replace(/\\/g, "/");
    doc.savRel = doc.kind === "disk" ? (file.path || savPath) : normalizeGameRelPath(savPath);
    doc.folderRel = doc.kind === "disk" ? path.dirname(doc.savRel) : dirnameRel(doc.savRel);
    doc.folderName = basenameRel(doc.folderRel) || "Save";
    doc.nfoRel = doc.siblingRel("savenfo.res");
    doc.partyRel = doc.siblingRel("PARTYTABLE.res");
    doc.globalVarsRel = doc.siblingRel("GLOBALVARS.res");

    const listed = await listFolderFilePaths(doc.kind, doc.folderRel);
    const listedNamesByLower = new Map<string, string>();
    for (let i = 0; i < listed.length; i++) {
      const resolved = resolveSaveFolderListedPath(doc.folderRel, listed[i]);
      if (!resolved.fileName) {
        continue;
      }
      listedNamesByLower.set(resolved.fileName.toLowerCase(), resolved.fileName);
    }

    if (listedNamesByLower.size) {
      doc.looseFiles = Array.from(listedNamesByLower.values()).map((fileName) => ({
        fileName,
        relPath: doc.kind === "disk" ? path.join(doc.folderRel, fileName) : doc.siblingRel(fileName),
      })).sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
      const nfoHit = listedNamesByLower.get("savenfo.res");
      const partyHit = listedNamesByLower.get("partytable.res");
      const gvtHit = listedNamesByLower.get("globalvars.res");
      if (nfoHit) doc.nfoRel = doc.siblingRel(nfoHit);
      if (partyHit) doc.partyRel = doc.siblingRel(partyHit);
      if (gvtHit) doc.globalVarsRel = doc.siblingRel(gvtHit);
    } else {
      doc.looseFiles = CANONICAL_LOOSE_FILES.map((fileName) => ({
        fileName,
        relPath: doc.siblingRel(fileName),
      }));
    }

    const sidecarName = (canonical: string): string => {
      return listedNamesByLower.get(canonical.toLowerCase()) || canonical;
    };

    const response = await file.readFile();
    if (response?.buffer?.length) {
      try {
        doc.erf = new ERFObject(response.buffer);
        await doc.erf.load();
        doc.erfKeys = listErfKeys(doc.erf);
      } catch (e) {
        console.error("SaveGameDocument: failed to parse SAVEGAME.sav", e);
        doc.loadWarnings.push("Could not parse SAVEGAME.sav.");
      }
    } else {
      doc.loadWarnings.push("SAVEGAME.sav could not be read.");
    }

    const nfoBytes = await readSidecarFile(doc, sidecarName("savenfo.res"));
    if (nfoBytes?.length) {
      try {
        doc.nfo = new GFFObject(nfoBytes);
        doc.nfoFields = readNfoFields(doc.nfo);
      } catch (e) {
        console.error("SaveGameDocument: failed to parse savenfo.res", e);
        doc.loadWarnings.push("Could not parse savenfo.res.");
      }
    } else {
      doc.loadWarnings.push(`Missing savenfo.res in ${doc.folderRel || "save folder"}.`);
    }

    const gvtBytes = await readSidecarFile(doc, sidecarName("GLOBALVARS.res"));
    if (gvtBytes?.length) {
      try {
        doc.globalVars = new GFFObject(gvtBytes);
        doc.globals = parseGlobalVars(doc.globalVars);
      } catch (e) {
        console.error("SaveGameDocument: failed to parse GLOBALVARS.res", e);
        doc.loadWarnings.push("Could not parse GLOBALVARS.res.");
      }
    } else {
      doc.loadWarnings.push(`Missing GLOBALVARS.res in ${doc.folderRel || "save folder"}.`);
    }

    const ptBytes = await readSidecarFile(doc, sidecarName("PARTYTABLE.res"));
    if (ptBytes?.length) {
      try {
        doc.partyTable = new GFFObject(ptBytes);
        doc.party = parsePartyTable(doc.partyTable);
      } catch (e) {
        console.error("SaveGameDocument: failed to parse PARTYTABLE.res", e);
        doc.loadWarnings.push("Could not parse PARTYTABLE.res.");
      }
    } else {
      doc.loadWarnings.push(`Missing PARTYTABLE.res in ${doc.folderRel || "save folder"}.`);
    }

    const pifoBytes = await readSidecarFile(doc, sidecarName("pifo.ifo"));
    if (pifoBytes?.length) {
      try {
        doc.pifo = new GFFObject(pifoBytes);
      } catch {
        doc.pifo = undefined;
      }
    }

    const tgaBytes = await readSidecarFile(doc, sidecarName("Screen.tga"));
    if (tgaBytes?.length) {
      doc.thumbnail = tgaToRgba(tgaBytes);
      if (!doc.thumbnail) {
        doc.loadWarnings.push("Screen.tga was read but could not be decoded for the preview.");
      }
    }

    await doc.loadPackedModules();

    return doc;
  }
}
