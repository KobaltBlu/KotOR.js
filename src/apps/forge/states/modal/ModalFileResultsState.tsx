import React from "react";

import { ModalFileResults } from "@/apps/forge/components/modal/ModalFileResults";
import type { EditorFile } from "@/apps/forge/EditorFile";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { ReferenceSearchResult } from "@/apps/forge/helpers/ReferenceFinder";
import type { EditorFileOptions } from "@/apps/forge/interfaces/EditorFileOptions";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ResourceTypes } from "@/resource/ResourceTypes";

export interface ModalFileResultsStateOptions {
  results: ReferenceSearchResult[];
  title?: string;
}

export class ModalFileResultsState extends ModalState {
  title: string = "Search Results";
  results: ReferenceSearchResult[] = [];

  constructor(options: ModalFileResultsStateOptions) {
    super();
    this.results = options.results ?? [];
    if (options.title) {
      this.title = options.title;
    }
    this.setView(<ModalFileResults modal={this} />);
  }

  setResults(results: ReferenceSearchResult[]): void {
    this.results = results;
    this.processEventListener("onResultsChanged", [this.results]);
  }

  getDisplayText(result: ReferenceSearchResult): string {
    const ext = result.fileResource.extension;
    return `${result.fileResource.resRef}.${ext} [${result.fieldPath}]`;
  }

  getTooltip(result: ReferenceSearchResult): string {
    const lines = [`Field: ${result.fieldPath}`, `Value: ${result.matchedValue}`];
    if (typeof result.byteOffset === "number") {
      lines.push(`Byte offset: 0x${result.byteOffset.toString(16)}`);
    }
    return lines.join("\n");
  }

  getEditorFileOptions(result: ReferenceSearchResult): EditorFileOptions {
    const ext = result.fileResource.extension.toLowerCase();
    const reskey = ResourceTypes[ext];
    const resref = result.fileResource.resRef;
    const container = result.fileResource.containerPath;

    if (container) {
      const lower = container.toLowerCase();
      let protocol = EditorFileProtocol.BIF;
      if (lower.endsWith(".erf") || lower.endsWith(".sav")) protocol = EditorFileProtocol.ERF;
      else if (lower.endsWith(".mod")) protocol = EditorFileProtocol.MOD;
      else if (lower.endsWith(".rim")) protocol = EditorFileProtocol.RIM;
      else if (lower.endsWith(".bif")) protocol = EditorFileProtocol.BIF;

      const archivePath = `${protocol}//game.dir/${container}?resref=${resref}&restype=${ext}`;
      return {
        path: archivePath,
        resref,
        reskey,
        ext,
        archive_path: container,
        useGameFileSystem: true,
      };
    }

    return {
      path: `${EditorFileProtocol.FILE}//game.dir/${resref}.${ext}`,
      resref,
      reskey,
      ext,
      useGameFileSystem: true,
    };
  }

  createEditorFile(result: ReferenceSearchResult): EditorFile {
    // Lazy require to avoid circular deps (EditorFile → Project → ForgeState → EditorFile)
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- circular dep break
    const EditorFileCtor = (require("@/apps/forge/EditorFile") as { EditorFile: new (opts: EditorFileOptions) => EditorFile }).EditorFile;
    return new EditorFileCtor(this.getEditorFileOptions(result));
  }

  openResult(result: ReferenceSearchResult): void {
    const editorFile = this.createEditorFile(result);
    // Lazy require to avoid pulling UI/tab dependencies into test compilation
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- lazy load
    const { FileTypeManager } = require("@/apps/forge/FileTypeManager") as { FileTypeManager: { onOpenResource: (f: EditorFile) => void } };
    FileTypeManager.onOpenResource(editorFile);
  }
}
