import React from "react";
import { ModalState } from "./ModalState";
import { ModalLIPBatchProcessor } from "../../components/modal/ModalLIPBatchProcessor";

export interface ModalLIPBatchProcessorStateOptions {
  title?: string;
  onComplete?: (processedCount: number, errorCount: number) => void;
}

export interface AudioFileEntry {
  name: string;
  path?: string;
  handle?: FileSystemFileHandle;
  buffer?: ArrayBuffer;
}

export class ModalLIPBatchProcessorState extends ModalState {
  title: string = "LIP Batch Processor";
  audioFiles: AudioFileEntry[] = [];
  outputDirPath: string = "";
  outputDirHandle: FileSystemDirectoryHandle | null = null;
  loading: boolean = false;
  error: string = "";
  lastProcessedCount: number = 0;
  lastErrorCount: number = 0;
  onComplete?: (processedCount: number, errorCount: number) => void;

  constructor(options: ModalLIPBatchProcessorStateOptions = {}) {
    super();
    if (options.title) this.title = options.title;
    if (options.onComplete) this.onComplete = options.onComplete;
    this.setView(<ModalLIPBatchProcessor modal={this} />);
  }

  addAudioFiles(entries: AudioFileEntry[]): void {
    const seen = new Set(this.audioFiles.map((f) => f.name.toLowerCase()));
    for (const e of entries) {
      if (!seen.has(e.name.toLowerCase())) {
        this.audioFiles.push(e);
        seen.add(e.name.toLowerCase());
      }
    }
    this.processEventListener("onStateChange", [this]);
  }

  removeAudioFile(index: number): void {
    this.audioFiles.splice(index, 1);
    this.processEventListener("onStateChange", [this]);
  }

  clearAudioFiles(): void {
    this.audioFiles = [];
    this.processEventListener("onStateChange", [this]);
  }

  setOutputDir(path: string, handle?: FileSystemDirectoryHandle | null): void {
    this.outputDirPath = path;
    this.outputDirHandle = handle ?? null;
    this.processEventListener("onStateChange", [this]);
  }

  setError(msg: string): void {
    this.error = msg;
    this.processEventListener("onStateChange", [this]);
  }

  setLoading(v: boolean): void {
    this.loading = v;
    this.processEventListener("onStateChange", [this]);
  }

  setLastResult(processed: number, errors: number): void {
    this.lastProcessedCount = processed;
    this.lastErrorCount = errors;
    if (this.onComplete) this.onComplete(processed, errors);
    this.processEventListener("onStateChange", [this]);
  }
}
