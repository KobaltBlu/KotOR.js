import * as path from "path";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { KEYManager } from "@/managers/KEYManager";
import { TLKManager } from "@/managers/TLKManager";
import { BIFObject } from "@/resource/BIFObject";
import { ERFObject } from "@/resource/ERFObject";
import { GFFObject } from "@/resource/GFFObject";
import { KEYObject } from "@/resource/KEYObject";
import { LIPObject } from "@/resource/LIPObject";
import { LTRObject } from "@/resource/LTRObject";
import { LYTObject } from "@/resource/LYTObject";
import { RIMObject } from "@/resource/RIMObject";
import { SSFObject } from "@/resource/SSFObject";
import { TLKObject } from "@/resource/TLKObject";
import { TPCObject } from "@/resource/TPCObject";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { VISObject } from "@/resource/VISObject";
import { NWScript } from "@/nwscript/NWScript";

export interface GameResourceDumpResult {
  ok: boolean;
  cancelled?: boolean;
  path?: string;
  filesProcessed: number;
  archivesProcessed: number;
  jsonFilesWritten: number;
  failed: number;
  message: string;
  errors?: string[];
}

export interface GameResourceDumpProgress {
  phase: "scanning" | "preparing" | "file" | "archive" | "complete";
  current: number;
  total: number;
  percent: number;
  currentPath?: string;
  archivePath?: string;
  archiveCurrent?: number;
  archiveTotal?: number;
  archivesProcessed: number;
  jsonFilesWritten: number;
  failed: number;
  message: string;
}

export interface GameResourceDumpOptions {
  skipAudio?: boolean;
  skipLip?: boolean;
  skipModels?: boolean;
  skipTextures?: boolean;
}

type OutputTarget =
  | { kind: "fs"; rootPath: string; displayPath: string }
  | { kind: "handle"; rootHandle: FileSystemDirectoryHandle; displayPath: string };

interface ResourceSerializationContext {
  sourcePath: string;
  archivePath?: string;
  resRef?: string;
  resType?: number;
}

export class GameResourceDumper {
  static readonly FILE_CONCURRENCY = 8;
  static readonly ARCHIVE_ENTRY_CONCURRENCY = 16;
  static readonly AUDIO_EXTENSIONS = new Set(["wav", "mp3", "ogg", "bmu", "wma"]);
  static readonly LIP_EXTENSIONS = new Set(["lip"]);
  static readonly MODEL_EXTENSIONS = new Set(["mdl", "mdx"]);
  static readonly TEXTURE_EXTENSIONS = new Set(["tpc", "tga", "txi", "dds", "txb", "bmp", "png", "jpg", "plt"]);
  static readonly ARCHIVE_EXTENSIONS = new Set(["bif", "erf", "mod", "rim", "sav"]);

  static readonly GFF_EXTENSIONS = new Set([
    "are",
    "bic",
    "dlg",
    "fac",
    "gff",
    "gic",
    "git",
    "gui",
    "ifo",
    "itp",
    "jrl",
    "utc",
    "utd",
    "ute",
    "uti",
    "utm",
    "utp",
    "uts",
    "utt",
    "utw",
  ]);

  static readonly TEXT_EXTENSIONS = new Set([
    "css",
    "ini",
    "json",
    "lua",
    "lyt",
    "nss",
    "txt",
    "txi",
    "vis",
    "xml",
  ]);

  static async dumpAllToSelectedDirectory(
    options: GameResourceDumpOptions = {},
    onProgress?: (progress: GameResourceDumpProgress) => void
  ): Promise<GameResourceDumpResult> {
    const dumpOptions = this.normalizeOptions(options);
    const excludedExtensions = this.getExcludedExtensions(dumpOptions);
    let target: OutputTarget | null;
    try {
      target = await this.selectOutputDirectory();
    } catch (error: any) {
      return {
        ok: false, filesProcessed: 0, archivesProcessed: 0,
        jsonFilesWritten: 0, failed: 1,
        message: `Unable to select export directory: ${this.getErrorMessage(error)}`,
      };
    }
    if (!target) {
      return {
        ok: false,
        cancelled: true,
        filesProcessed: 0,
        archivesProcessed: 0,
        jsonFilesWritten: 0,
        failed: 0,
        message: "Game file dump cancelled.",
      };
    }

    const errors: string[] = [];
    let filesProcessed = 0;
    let archivesProcessed = 0;
    let jsonFilesWritten = 0;
    let failed = 0;

    try {
      this.reportProgress(onProgress, {
        phase: "scanning",
        current: 0,
        total: 1,
        percent: 0,
        archivesProcessed,
        jsonFilesWritten,
        failed,
        message: "Scanning game files...",
      });

      const rawFiles = await GameFileSystem.readdir("", { recursive: true });
      const normalizedFiles = rawFiles
        .map((file) => this.normalizeGameRelativePath(file))
        .filter((file) => !!file)
        .sort((a, b) => a.localeCompare(b));

      const files = normalizedFiles.filter((file) => {
        const ext = this.getExtension(file);
        return !(excludedExtensions.has(ext) && !this.ARCHIVE_EXTENSIONS.has(ext));
      });
      const skippedTopLevelFiles = normalizedFiles.length - files.length;

      this.reportProgress(onProgress, {
        phase: "preparing",
        current: 0,
        total: Math.max(files.length, 1),
        percent: 0,
        archivesProcessed,
        jsonFilesWritten,
        failed,
        message: skippedTopLevelFiles > 0
          ? `Preparing JSON dump for ${files.length} game files (${skippedTopLevelFiles} skipped by filters)...`
          : `Preparing JSON dump for ${files.length} game files...`,
      });

      await this.writeJSON(target, "__dump_manifest.json", {
        status: "running",
        generatedAt: new Date().toISOString(),
        rootDirectory: target.displayPath,
        options: dumpOptions,
        totalInputFiles: files.length,
        skippedTopLevelFiles,
      });
      jsonFilesWritten++;

      const looseFiles = files.filter((file) => !this.ARCHIVE_EXTENSIONS.has(this.getExtension(file)));
      const archiveFiles = files.filter((file) => this.ARCHIVE_EXTENSIONS.has(this.getExtension(file)));

      await this.forEachConcurrent(looseFiles, this.FILE_CONCURRENCY, async (file, i) => {
        const ext = this.getExtension(file);

        this.reportProgress(onProgress, {
          phase: "file",
          current: Math.min(filesProcessed + 1, Math.max(files.length, 1)),
          total: Math.max(files.length, 1),
          percent: files.length ? (filesProcessed / files.length) : 1,
          currentPath: file,
          archivesProcessed,
          jsonFilesWritten,
          failed,
          message: `Dumping file ${i + 1}/${looseFiles.length}: ${file}`,
        });

        try {
          const buffer = await GameFileSystem.readFile(file);
          const payload = await this.serializeBuffer(buffer, ext, {
            sourcePath: file,
          });
          await this.writeJSON(target, `${this.normalizeOutputPath(file)}.json`, payload);
          jsonFilesWritten++;
          filesProcessed++;

          this.reportProgress(onProgress, {
            phase: "file",
            current: filesProcessed,
            total: Math.max(files.length, 1),
            percent: files.length ? (filesProcessed / files.length) : 1,
            currentPath: file,
            archivesProcessed,
            jsonFilesWritten,
            failed,
            message: `Processed ${filesProcessed}/${files.length} game files`,
          });
        } catch (error: any) {
          failed++;
          errors.push(`${file}: ${this.getErrorMessage(error)}`);

          this.reportProgress(onProgress, {
            phase: "file",
            current: Math.min(filesProcessed + failed, Math.max(files.length, 1)),
            total: Math.max(files.length, 1),
            percent: files.length ? ((filesProcessed + failed) / files.length) : 1,
            currentPath: file,
            archivesProcessed,
            jsonFilesWritten,
            failed,
            message: `Failed to dump ${file}`,
          });
        }
      });

      for (let i = 0; i < archiveFiles.length; i++) {
        const file = archiveFiles[i];
        const ext = this.getExtension(file);

        this.reportProgress(onProgress, {
          phase: "archive",
          current: Math.min(filesProcessed + 1, Math.max(files.length, 1)),
          total: Math.max(files.length, 1),
          percent: files.length ? (filesProcessed / files.length) : 1,
          currentPath: file,
          archivePath: file,
          archivesProcessed,
          jsonFilesWritten,
          failed,
          message: `Opening archive ${i + 1}/${archiveFiles.length}: ${file}`,
        });

        try {
          archivesProcessed++;
          jsonFilesWritten += await this.dumpArchive(target, file, ext, excludedExtensions, onProgress, {
            completedFiles: filesProcessed,
            totalFiles: files.length,
            currentPath: file,
            archivesProcessed,
            jsonFilesWritten,
            failed,
          });
          filesProcessed++;

          this.reportProgress(onProgress, {
            phase: "archive",
            current: filesProcessed,
            total: Math.max(files.length, 1),
            percent: files.length ? (filesProcessed / files.length) : 1,
            currentPath: file,
            archivePath: file,
            archivesProcessed,
            jsonFilesWritten,
            failed,
            message: `Processed ${filesProcessed}/${files.length} game files`,
          });
        } catch (error: any) {
          failed++;
          errors.push(`${file}: ${this.getErrorMessage(error)}`);

          this.reportProgress(onProgress, {
            phase: "archive",
            current: Math.min(filesProcessed + failed, Math.max(files.length, 1)),
            total: Math.max(files.length, 1),
            percent: files.length ? ((filesProcessed + failed) / files.length) : 1,
            currentPath: file,
            archivePath: file,
            archivesProcessed,
            jsonFilesWritten,
            failed,
            message: `Failed to dump ${file}`,
          });
        }
      }

      const result: GameResourceDumpResult = {
        ok: failed === 0,
        path: target.displayPath,
        filesProcessed,
        archivesProcessed,
        jsonFilesWritten,
        failed,
        message: failed === 0
          ? `Game files exported to ${target.displayPath}`
          : `Game files exported to ${target.displayPath} with ${failed} error${failed === 1 ? "" : "s"}.`,
        errors,
      };

      await this.writeJSON(target, "__dump_manifest.json", {
        status: result.ok ? "complete" : "complete_with_errors",
        generatedAt: new Date().toISOString(),
        rootDirectory: target.displayPath,
        options: dumpOptions,
        skippedTopLevelFiles,
        ...result,
      });

      this.reportProgress(onProgress, {
        phase: "complete",
        current: Math.max(files.length, 1),
        total: Math.max(files.length, 1),
        percent: 1,
        archivesProcessed,
        jsonFilesWritten,
        failed,
        message: result.message,
      });

      return result;
    } catch (error: any) {
      return {
        ok: false,
        path: target.displayPath,
        filesProcessed,
        archivesProcessed,
        jsonFilesWritten,
        failed: failed + 1,
        message: `Failed to dump game files: ${this.getErrorMessage(error)}`,
        errors: [...errors, this.getErrorMessage(error)],
      };
    }
  }

  private static async dumpArchive(
    target: OutputTarget,
    archivePath: string,
    ext: string,
    excludedExtensions: Set<string>,
    onProgress?: (progress: GameResourceDumpProgress) => void,
    overall?: {
      completedFiles: number;
      totalFiles: number;
      currentPath: string;
      archivesProcessed: number;
      jsonFilesWritten: number;
      failed: number;
    }
  ): Promise<number> {
    switch (ext) {
      case "bif":
        return await this.dumpBIFArchive(target, archivePath, excludedExtensions, onProgress, overall);
      case "rim":
        return await this.dumpRIMArchive(target, archivePath, excludedExtensions, onProgress, overall);
      case "erf":
      case "mod":
      case "sav":
        return await this.dumpERFArchive(target, archivePath, excludedExtensions, onProgress, overall);
      default:
        return 0;
    }
  }

  private static async dumpBIFArchive(
    target: OutputTarget,
    archivePath: string,
    excludedExtensions: Set<string>,
    onProgress?: (progress: GameResourceDumpProgress) => void,
    overall?: {
      completedFiles: number;
      totalFiles: number;
      currentPath: string;
      archivesProcessed: number;
      jsonFilesWritten: number;
      failed: number;
    }
  ): Promise<number> {
    const archive = new BIFObject(archivePath);
    try {
    await archive.load();

    const resourcesToDump = archive.resources
      .map((resource, index) => {
        const key = KEYManager.Key.getFileKeyByRes(resource);
        const resType = key?.resType ?? resource.resType;
        const resExt = (ResourceTypes.getKeyByValue(resType) || `restype_${resType}`).toLowerCase();
        const resRef = (key?.resRef || `resource_${index}`).toLowerCase();
        return { resource, resType, resExt, resRef };
      })
      .filter((entry) => !excludedExtensions.has(entry.resExt));

    let written = 0;
    await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/__archive.json`, {
      format: "bif",
      sourcePath: archivePath,
      fileType: archive.fileType,
      fileVersion: archive.fileVersion,
      variableResourceCount: archive.variableResourceCount,
      fixedResourceCount: archive.fixedResourceCount,
      variableTableOffset: archive.variableTableOffset,
      dumpedEntryCount: resourcesToDump.length,
      skippedEntryCount: archive.resources.length - resourcesToDump.length,
      resources: archive.resources.map((resource, index) => {
        const key = KEYManager.Key.getFileKeyByRes(resource);
        const resType = key?.resType ?? resource.resType;
        return {
          index,
          id: resource.Id,
          offset: resource.offset,
          size: resource.size,
          resRef: key?.resRef ?? null,
          resType,
          resTypeName: ResourceTypes.getKeyByValue(resType) || null,
        };
      }),
    });
    written++;

    let completed = 0;
    await this.forEachConcurrent(resourcesToDump, this.ARCHIVE_ENTRY_CONCURRENCY, async (entry) => {
      const { resource, resType, resExt, resRef } = entry;

      if (overall) {
        this.reportProgress(onProgress, {
          phase: "archive",
          current: Math.min(overall.completedFiles + 1, Math.max(overall.totalFiles, 1)),
          total: Math.max(overall.totalFiles, 1),
          percent: overall.totalFiles ? ((overall.completedFiles + (completed / Math.max(resourcesToDump.length, 1))) / overall.totalFiles) : 1,
          currentPath: `${archivePath}/${resRef}.${resExt}`,
          archivePath,
          archiveCurrent: completed + 1,
          archiveTotal: resourcesToDump.length,
          archivesProcessed: overall.archivesProcessed,
          jsonFilesWritten: overall.jsonFilesWritten + written,
          failed: overall.failed,
          message: `Dumping archive entry ${completed + 1}/${resourcesToDump.length}: ${resRef}.${resExt}`,
        });
      }

      const buffer = await archive.getResourceBuffer(resource);
      const payload = await this.serializeBuffer(buffer, resExt, {
        sourcePath: `${archivePath}:${resRef}.${resExt}`,
        archivePath,
        resRef,
        resType,
      });
      await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/${resRef}.${resExt}.json`, payload);
      written++;
      completed++;
    });

    return written;
    } finally {
      await archive.dispose();
    }
  }

  private static async dumpRIMArchive(
    target: OutputTarget,
    archivePath: string,
    excludedExtensions: Set<string>,
    onProgress?: (progress: GameResourceDumpProgress) => void,
    overall?: {
      completedFiles: number;
      totalFiles: number;
      currentPath: string;
      archivesProcessed: number;
      jsonFilesWritten: number;
      failed: number;
    }
  ): Promise<number> {
    const archive = new RIMObject(archivePath);
    try {
    await archive.load();

    const resourcesToDump = archive.resources
      .map((resource, index) => {
        const resExt = (ResourceTypes.getKeyByValue(resource.resType) || `restype_${resource.resType}`).toLowerCase();
        const resRef = (resource.resRef || `resource_${index}`).toLowerCase();
        return { resource, resExt, resRef };
      })
      .filter((entry) => !excludedExtensions.has(entry.resExt));

    let written = 0;
    await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/__archive.json`, {
      format: "rim",
      sourcePath: archivePath,
      header: archive.header,
      resourceCount: archive.resources.length,
      dumpedEntryCount: resourcesToDump.length,
      skippedEntryCount: archive.resources.length - resourcesToDump.length,
      resources: archive.resources.map((resource, index) => ({
        index,
        resRef: resource.resRef,
        resType: resource.resType,
        resTypeName: ResourceTypes.getKeyByValue(resource.resType) || null,
        offset: resource.offset,
        size: resource.size,
      })),
    });
    written++;

    let completed = 0;
    await this.forEachConcurrent(resourcesToDump, this.ARCHIVE_ENTRY_CONCURRENCY, async (entry) => {
      const { resource, resExt, resRef } = entry;

      if (overall) {
        this.reportProgress(onProgress, {
          phase: "archive",
          current: Math.min(overall.completedFiles + 1, Math.max(overall.totalFiles, 1)),
          total: Math.max(overall.totalFiles, 1),
          percent: overall.totalFiles ? ((overall.completedFiles + (completed / Math.max(resourcesToDump.length, 1))) / overall.totalFiles) : 1,
          currentPath: `${archivePath}/${resRef}.${resExt}`,
          archivePath,
          archiveCurrent: completed + 1,
          archiveTotal: resourcesToDump.length,
          archivesProcessed: overall.archivesProcessed,
          jsonFilesWritten: overall.jsonFilesWritten + written,
          failed: overall.failed,
          message: `Dumping archive entry ${completed + 1}/${resourcesToDump.length}: ${resRef}.${resExt}`,
        });
      }

      const buffer = await archive.getResourceBuffer(resource);
      const payload = await this.serializeBuffer(buffer, resExt, {
        sourcePath: `${archivePath}:${resRef}.${resExt}`,
        archivePath,
        resRef,
        resType: resource.resType,
      });
      await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/${resRef}.${resExt}.json`, payload);
      written++;
      completed++;
    });

    return written;
    } finally {
      await archive.dispose();
    }
  }

  private static async dumpERFArchive(
    target: OutputTarget,
    archivePath: string,
    excludedExtensions: Set<string>,
    onProgress?: (progress: GameResourceDumpProgress) => void,
    overall?: {
      completedFiles: number;
      totalFiles: number;
      currentPath: string;
      archivesProcessed: number;
      jsonFilesWritten: number;
      failed: number;
    }
  ): Promise<number> {
    const archive = new ERFObject(archivePath);
    try {
    await archive.load();

    const resourcesToDump = archive.keyList
      .map((key, index) => {
        const resExt = (ResourceTypes.getKeyByValue(key.resType) || `restype_${key.resType}`).toLowerCase();
        const resRef = (key.resRef || `resource_${index}`).toLowerCase();
        return { key, resExt, resRef };
      })
      .filter((entry) => !excludedExtensions.has(entry.resExt));

    let written = 0;
    await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/__archive.json`, {
      format: archive.header?.fileType?.trim().toLowerCase() || "erf",
      sourcePath: archivePath,
      header: archive.header,
      localizedStrings: archive.localizedStrings,
      resourceCount: archive.keyList.length,
      dumpedEntryCount: resourcesToDump.length,
      skippedEntryCount: archive.keyList.length - resourcesToDump.length,
      resources: archive.keyList.map((key, index) => ({
        index,
        resRef: key.resRef,
        resId: key.resId,
        resType: key.resType,
        resTypeName: ResourceTypes.getKeyByValue(key.resType) || null,
        offset: archive.resources[key.resId]?.offset ?? null,
        size: archive.resources[key.resId]?.size ?? null,
      })),
    });
    written++;

    let completed = 0;
    await this.forEachConcurrent(resourcesToDump, this.ARCHIVE_ENTRY_CONCURRENCY, async (entry) => {
      const { key, resExt, resRef } = entry;

      if (overall) {
        this.reportProgress(onProgress, {
          phase: "archive",
          current: Math.min(overall.completedFiles + 1, Math.max(overall.totalFiles, 1)),
          total: Math.max(overall.totalFiles, 1),
          percent: overall.totalFiles ? ((overall.completedFiles + (completed / Math.max(resourcesToDump.length, 1))) / overall.totalFiles) : 1,
          currentPath: `${archivePath}/${resRef}.${resExt}`,
          archivePath,
          archiveCurrent: completed + 1,
          archiveTotal: resourcesToDump.length,
          archivesProcessed: overall.archivesProcessed,
          jsonFilesWritten: overall.jsonFilesWritten + written,
          failed: overall.failed,
          message: `Dumping archive entry ${completed + 1}/${resourcesToDump.length}: ${resRef}.${resExt}`,
        });
      }

      const buffer = await archive.getResourceBufferByResRef(key.resRef, key.resType);
      const payload = await this.serializeBuffer(buffer, resExt, {
        sourcePath: `${archivePath}:${resRef}.${resExt}`,
        archivePath,
        resRef,
        resType: key.resType,
      });
      await this.writeJSON(target, `${this.normalizeOutputPath(archivePath)}/${resRef}.${resExt}.json`, payload);
      written++;
      completed++;
    });

    return written;
    } finally {
      await archive.dispose();
    }
  }

  private static async forEachConcurrent<T>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>
  ): Promise<void> {
    if (!items.length) {
      return;
    }

    const limit = Math.max(1, Math.min(concurrency, items.length));
    let nextIndex = 0;

    const runWorker = async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex++;

        if (currentIndex >= items.length) {
          return;
        }

        await worker(items[currentIndex], currentIndex);
      }
    };

    // Drain in-flight reads before the caller disposes its archive handle.
    const results = await Promise.allSettled(Array.from({ length: limit }, () => runWorker()));
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
  }

  private static async serializeBuffer(buffer: Uint8Array, ext: string, context: ResourceSerializationContext): Promise<any> {
    const base = {
      sourcePath: context.sourcePath,
      archivePath: context.archivePath || null,
      resRef: context.resRef || null,
      resType: context.resType ?? null,
      extension: ext,
      size: buffer.length,
    };

    try {
      switch (ext) {
        case "2da": {
          const table = new TwoDAObject(buffer);
          return {
            ...base,
            format: "2da",
            fileType: table.FileType,
            fileVersion: table.FileVersion,
            columnCount: table.ColumnCount,
            rowCount: table.RowCount,
            columns: table.columns,
            rows: table.rows,
          };
        }
        case "tlk": {
          const talkTable = new TLKObject();
          talkTable.loadFromBuffer(buffer);
          return {
            ...base,
            format: "tlk",
            fileType: talkTable.FileType,
            fileVersion: talkTable.FileVersion,
            languageId: talkTable.LanguageID,
            stringCount: talkTable.StringCount,
            strings: talkTable.TLKStrings.map((entry, index) => ({
              index,
              flags: entry.flags,
              soundResRef: entry.SoundResRef,
              volumeVariance: entry.VolumeVariance,
              pitchVariance: entry.PitchVariance,
              stringOffset: entry.StringOffset,
              stringLength: entry.StringLength,
              soundLength: entry.SoundLength,
              value: entry.Value,
            })),
          };
        }
        case "key": {
          const key = new KEYObject();
          await key.loadFile(context.sourcePath);
          return {
            ...base,
            format: "key",
            fileType: key.fileType,
            fileVersion: key.FileVersion,
            bifCount: key.bifCount,
            keyCount: key.keyCount,
            offsetToFileTable: key.offsetToFileTable,
            offsetToKeyTable: key.offsetToKeyTable,
            buildYear: key.buildYear,
            buildDay: key.buildDay,
            bifs: key.bifs,
            keys: key.keys.map((entry) => ({
              resRef: entry.resRef,
              resType: entry.resType,
              resTypeName: ResourceTypes.getKeyByValue(entry.resType) || null,
              resId: entry.resId,
            })),
          };
        }
        case "tpc": {
          const texture = new TPCObject({ file: buffer, filename: context.sourcePath, pack: 0 });
          return {
            ...base,
            format: "tpc",
            header: texture.header,
            txi: texture.getTXIData(),
            dataLength: texture.getDataLength(),
          };
        }
        case "ncs": {
          const script = new NWScript(buffer);
          script.name = path.parse(context.sourcePath).name;
          const instructions = Array.from(script.instructions?.values?.() || [])
            .sort((a, b) => a.address - b.address)
            .map((instruction) => ({
              index: instruction.index,
              address: instruction.address,
              addressHex: instruction.address_hex,
              opcode: instruction.code,
              opcodeHex: instruction.code_hex,
              opcodeName: instruction.codeName,
              type: instruction.type,
              typeHex: instruction.type_hex,
              instructionSize: instruction.instructionSize,
              offset: instruction.offset,
              size: instruction.size,
              pointer: instruction.pointer,
              bpOffset: instruction.bpOffset,
              spOffset: instruction.spOffset,
              sizeOfStructure: instruction.sizeOfStructure,
              sizeToDestroy: instruction.sizeToDestroy,
              offsetToSaveElement: instruction.offsetToSaveElement,
              sizeOfElementToSave: instruction.sizeOfElementToSave,
              action: instruction.action,
              actionName: instruction.actionDefinition?.name || null,
              argCount: instruction.argCount,
              integer: instruction.integer,
              float: instruction.float,
              object: instruction.object,
              string: instruction.string,
              previousAddress: instruction.prevInstr?.address,
              nextAddress: instruction.nextInstr?.address,
            }));

          return {
            ...base,
            format: "ncs",
            verified: script.isVerified,
            programType: script.prog,
            programSize: script.progSize,
            instructionCount: instructions.length,
            assembly: script.toAssembly(),
            instructions,
          };
        }
        case "lip": {
          const lip = new LIPObject(buffer);
          return {
            ...base,
            format: "lip",
            duration: lip.duration,
            keyframes: lip.keyframes.map((frame) => ({
              time: frame.time,
              shape: frame.shape,
              shapeLabel: LIPObject.GetLIPShapeLabels()[frame.shape] || null,
            })),
          };
        }
        case "lyt": {
          const layout = new LYTObject(buffer);
          return {
            ...base,
            format: "lyt",
            filedependancy: layout.filedependancy,
            rooms: layout.rooms.map((room) => ({
              name: room.name,
              position: { x: room.position.x, y: room.position.y, z: room.position.z },
            })),
            tracks: layout.tracks.map((track) => ({
              name: track.name,
              position: { x: track.position.x, y: track.position.y, z: track.position.z },
            })),
            obstacles: layout.obstacles.map((obstacle) => ({
              name: obstacle.name,
              position: { x: obstacle.position.x, y: obstacle.position.y, z: obstacle.position.z },
            })),
            doorhooks: layout.doorhooks.map((doorhook) => ({
              room: doorhook.room,
              name: doorhook.name,
              position: { x: doorhook.position.x, y: doorhook.position.y, z: doorhook.position.z },
              quaternion: {
                x: doorhook.quaternion.x,
                y: doorhook.quaternion.y,
                z: doorhook.quaternion.z,
                w: doorhook.quaternion.w,
              },
            })),
            rawText: layout.text,
          };
        }
        case "vis": {
          const vis = new VISObject(buffer);
          vis.read();
          return {
            ...base,
            format: "vis",
            rooms: vis.getRooms(),
          };
        }
        case "ltr": {
          const ltr = new LTRObject(buffer);
          return {
            ...base,
            format: "ltr",
            fileType: ltr.fileType,
            fileVersion: ltr.fileVersion,
            charCount: ltr.charCount,
            singleArray: ltr.singleArray,
            doubleArray: ltr.doubleArray,
            tripleArray: ltr.tripleArray,
            sampleNames: Array.from({ length: 10 }).map(() => ltr.getName()),
          };
        }
        case "ssf": {
          const ssf = new SSFObject(buffer);
          return {
            ...base,
            format: "ssf",
            fileType: ssf.FileType,
            fileVersion: ssf.FileVersion,
            sounds: ssf.sound_refs.map((strRef, index) => ({
              index,
              stringRef: strRef,
              soundResRef: ssf.GetSoundResRef(index),
              text: TLKManager.TLKStrings?.[strRef]?.Value || null,
            })),
          };
        }
        default: {
          if (this.GFF_EXTENSIONS.has(ext)) {
            const gff = new GFFObject(buffer);
            return {
              ...base,
              format: "gff",
              fileType: gff.FileType,
              fileVersion: gff.FileVersion,
              json: gff.toJSON(),
            };
          }

          if (ext === "json") {
            const text = this.decodeText(buffer);
            return {
              ...base,
              format: "json",
              text,
              json: JSON.parse(text),
            };
          }

          if (ext === "ini") {
            const text = this.decodeText(buffer);
            return {
              ...base,
              format: "ini",
              text,
              sections: this.parseIniText(text),
            };
          }

          if (this.TEXT_EXTENSIONS.has(ext)) {
            return {
              ...base,
              format: "text",
              text: this.decodeText(buffer),
            };
          }

          return {
            ...base,
            ...this.createFallbackRepresentation(buffer),
          };
        }
      }
    } catch (error: any) {
      return {
        ...base,
        format: "error",
        error: this.getErrorMessage(error),
        fallback: this.createFallbackRepresentation(buffer),
      };
    }
  }

  private static createFallbackRepresentation(buffer: Uint8Array): any {
    const previewBytes = Array.from(buffer.slice(0, 128));
    const previewText = this.tryDecodeText(buffer.slice(0, 4096));

    return {
      format: "binary",
      previewBytes,
      previewText,
      truncated: buffer.length > 4096,
    };
  }

  private static parseIniText(raw: string): any {
    const lines = raw.split(/\r?\n/);
    const parsed: any = {};
    let currentSection: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.length) continue;
      if (line.startsWith(";") || line.startsWith("#")) continue;

      const section = line.match(/^\[(.*)\]$/);
      if (section) {
        currentSection = section[1].trim();
        parsed[currentSection] = parsed[currentSection] || {};
        continue;
      }

      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const name = line.slice(0, eq).trim();
      if (!name.length) continue;

      let value: any = line.slice(eq + 1).trim();
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string.
      }

      if (currentSection) {
        parsed[currentSection][name] = value;
      } else {
        parsed[name] = value;
      }
    }

    return parsed;
  }

  private static decodeText(buffer: Uint8Array): string {
    return new TextDecoder("utf-8").decode(buffer);
  }

  private static tryDecodeText(buffer: Uint8Array): string | null {
    try {
      const text = this.decodeText(buffer);
      if (!text.length) {
        return "";
      }

      let printable = 0;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) {
          printable++;
        }
      }

      const ratio = printable / Math.max(text.length, 1);
      return ratio >= 0.8 ? text : null;
    } catch {
      return null;
    }
  }

  private static async selectOutputDirectory(): Promise<OutputTarget | null> {
    const windowAny = typeof window !== "undefined" ? window as any : undefined;

    if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
      const result = await windowAny?.dialog?.showOpenDialog?.({
        title: "Choose folder for JSON game dump",
        properties: ["openDirectory", "createDirectory", "promptToCreate"],
      });

      if (!result || result.canceled || !result.filePaths?.length) {
        return null;
      }

      if (ApplicationProfile.directory) {
        const relative = path.relative(path.resolve(ApplicationProfile.directory), path.resolve(result.filePaths[0]));
        if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
          throw new Error("Choose an export directory outside the game installation to avoid recursively exporting previous dumps.");
        }
      }

      return {
        kind: "fs",
        rootPath: result.filePaths[0],
        displayPath: result.filePaths[0],
      };
    }

    if (typeof windowAny?.showDirectoryPicker === "function") {
      try {
        const handle = await windowAny.showDirectoryPicker({ mode: "readwrite" });
        if (!handle) {
          return null;
        }

        const gameRoot = ApplicationProfile.directoryHandle;
        if (gameRoot && (await gameRoot.isSameEntry(handle) || await gameRoot.resolve(handle) !== null)) {
          throw new Error("Choose an export directory outside the game installation to avoid recursively exporting previous dumps.");
        }

        return {
          kind: "handle",
          rootHandle: handle,
          displayPath: handle.name,
        };
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return null;
        }
        throw error;
      }
    }

    return null;
  }

  private static reportProgress(
    onProgress: ((progress: GameResourceDumpProgress) => void) | undefined,
    progress: Omit<GameResourceDumpProgress, "percent"> & { percent?: number }
  ): void {
    if (typeof onProgress !== "function") {
      return;
    }

    const total = Math.max(progress.total, 1);
    const percent = Math.max(0, Math.min(1, typeof progress.percent === "number" ? progress.percent : (progress.current / total)));

    onProgress({
      ...progress,
      total,
      percent,
    });
  }

  private static async writeJSON(target: OutputTarget, relativePath: string, value: any): Promise<void> {
    const normalizedPath = this.normalizeOutputPath(relativePath);
    const text = JSON.stringify(value, null, 2);

    if (target.kind === "fs") {
      const outputPath = path.join(target.rootPath, ...normalizedPath.split("/"));
      const dirPath = path.dirname(outputPath);
      await this.fsMkdir(dirPath);
      await this.fsWriteFile(outputPath, text);
      return;
    }

    const segments = normalizedPath.split("/").filter((segment) => !!segment);
    const filename = segments.pop();
    if (!filename) {
      return;
    }

    let directory = target.rootHandle;
    for (let i = 0; i < segments.length; i++) {
      directory = await directory.getDirectoryHandle(segments[i], { create: true });
    }

    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  private static async fsMkdir(dirPath: string): Promise<void> {
    const windowAny = window as any;
    await new Promise<void>((resolve, reject) => {
      windowAny.fs.mkdir(dirPath, { recursive: true }, (error: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private static async fsWriteFile(filePath: string, text: string): Promise<void> {
    const windowAny = window as any;
    await new Promise<void>((resolve, reject) => {
      windowAny.fs.writeFile(filePath, text, "utf8", (error: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private static normalizeGameRelativePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const rootNames = [
      ApplicationProfile.directoryHandle?.name,
      ApplicationProfile.directory ? path.basename(ApplicationProfile.directory) : undefined,
    ].filter((name): name is string => !!name);

    for (let i = 0; i < rootNames.length; i++) {
      const rootName = rootNames[i].replace(/\\/g, "/");
      if (normalized === rootName) {
        return "";
      }
      if (normalized.startsWith(`${rootName}/`)) {
        return normalized.slice(rootName.length + 1);
      }
    }

    return normalized;
  }

  private static normalizeOptions(options: GameResourceDumpOptions): Required<GameResourceDumpOptions> {
    return {
      skipAudio: !!options.skipAudio,
      skipLip: !!options.skipLip,
      skipModels: !!options.skipModels,
      skipTextures: !!options.skipTextures,
    };
  }

  private static getExcludedExtensions(options: Required<GameResourceDumpOptions>): Set<string> {
    const excluded = new Set<string>();

    if (options.skipAudio) {
      this.AUDIO_EXTENSIONS.forEach((ext) => excluded.add(ext));
    }

    if (options.skipLip) {
      this.LIP_EXTENSIONS.forEach((ext) => excluded.add(ext));
    }

    if (options.skipModels) {
      this.MODEL_EXTENSIONS.forEach((ext) => excluded.add(ext));
    }

    if (options.skipTextures) {
      this.TEXTURE_EXTENSIONS.forEach((ext) => excluded.add(ext));
    }

    return excluded;
  }

  private static normalizeOutputPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);
    if (normalized.startsWith("/") || !segments.length || segments.some((segment) => (
      segment === "." || segment === ".." || segment.includes(":") || segment.includes("\0")
    ))) {
      throw new Error(`Unsafe resource export path: ${filePath}`);
    }
    return segments.join("/");
  }

  private static getExtension(filePath: string): string {
    return path.extname(filePath).replace(/^\./, "").toLowerCase();
  }

  private static getErrorMessage(error: any): string {
    if (typeof error === "string") {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
