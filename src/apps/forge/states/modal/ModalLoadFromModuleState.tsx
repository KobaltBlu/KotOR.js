import React from "react";
import { ModalState } from "./ModalState";
import { ModalLoadFromModule } from "../../components/modal/ModalLoadFromModule";
import {
  loadFromCapsuleBuffer,
  CapsuleResourceEntry,
  LoadFromCapsuleResult,
} from "../../helpers/LoadFromCapsule";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../../ForgeFileSystem";
import * as KotOR from "../../KotOR";

export interface ModalLoadFromModuleStateOptions {
  title?: string;
  /** Filter to only these resource type IDs (e.g. UTC, UTD, UTP). If empty, show all. */
  supportedTypes?: number[];
  onSelect?: (resref: string, ext: string, data: Uint8Array) => void;
}

export class ModalLoadFromModuleState extends ModalState {
  title: string = "Load Resource From Module";
  supportedTypes: number[] = [];
  onSelect?: (resref: string, ext: string, data: Uint8Array) => void;

  /** After loading a capsule file */
  capsuleResult: LoadFromCapsuleResult | null = null;
  capsuleFilePath: string = "";
  entries: CapsuleResourceEntry[] = [];
  selectedEntry: CapsuleResourceEntry | null = null;
  filterText: string = "";
  loading: boolean = false;
  error: string = "";

  constructor(options: ModalLoadFromModuleStateOptions = {}) {
    super();
    if (options.title) this.title = options.title;
    if (options.supportedTypes?.length) this.supportedTypes = options.supportedTypes;
    if (options.onSelect) this.onSelect = options.onSelect;
    this.setView(<ModalLoadFromModule modal={this} />);
  }

  /** Load a capsule from a file path (full path in Node, or relative to game root). */
  async loadCapsuleFromPath(filePath: string): Promise<void> {
    this.loading = true;
    this.error = "";
    this.processEventListener("onStateChange", [this]);
    try {
      this.capsuleFilePath = filePath;
      let buffer: Uint8Array;
      const isNode = typeof process !== "undefined" && process.versions?.node != null;
      const isAbsolute = /^[A-Za-z]:[\\/]|^\//.test(filePath);
      if (isNode && isAbsolute) {
        const fs = await import("fs");
        const buf = await fs.promises.readFile(filePath);
        buffer = new Uint8Array(buf);
      } else {
        const buf = await KotOR.GameFileSystem.readFile(filePath.replace(/\\/g, "/"));
        buffer = buf ? new Uint8Array(buf) : new Uint8Array(0);
      }
      if (!buffer || buffer.length === 0) {
        this.error = "Could not read file.";
        this.loading = false;
        this.processEventListener("onStateChange", [this]);
        return;
      }
      const result = await loadFromCapsuleBuffer(buffer, this.supportedTypes.length ? this.supportedTypes : null);
      if (!result) {
        this.error = "Not a valid MOD, ERF, or RIM file.";
        this.capsuleResult = null;
        this.entries = [];
      } else {
        this.capsuleResult = result;
        this.entries = result.entries;
        this.selectedEntry = null;
        this.error = "";
      }
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "Failed to load file.";
      this.capsuleResult = null;
      this.entries = [];
    }
    this.loading = false;
    this.processEventListener("onStateChange", [this]);
  }

  async browseCapsule(): Promise<void> {
    this.loading = true;
    this.error = "";
    this.processEventListener("onStateChange", [this]);
    try {
      const response = await ForgeFileSystem.OpenFile({
        ext: [".mod", ".erf", ".rim"],
      });
      if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
        if (response.paths && response.paths.length > 0) {
          this.capsuleFilePath = response.paths[0];
        }
      } else {
        if (response.handles && response.handles.length > 0) {
          const h = response.handles[0] as FileSystemFileHandle;
          this.capsuleFilePath = h.name;
        }
      }
      const buffer = await ForgeFileSystem.ReadFileBufferFromResponse(response);
      if (buffer.length === 0) {
        this.error = "Could not read file.";
        this.loading = false;
        this.processEventListener("onStateChange", [this]);
        return;
      }
      const result = await loadFromCapsuleBuffer(buffer, this.supportedTypes.length ? this.supportedTypes : null);
      if (!result) {
        this.error = "Not a valid MOD, ERF, or RIM file.";
        this.capsuleResult = null;
        this.entries = [];
      } else {
        this.capsuleResult = result;
        this.entries = result.entries;
        this.selectedEntry = null;
        this.error = "";
      }
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "Failed to load file.";
      this.capsuleResult = null;
      this.entries = [];
    }
    this.loading = false;
    this.processEventListener("onStateChange", [this]);
  }

  setFilter(text: string): void {
    this.filterText = text;
    this.processEventListener("onStateChange", [this]);
  }

  setSelected(entry: CapsuleResourceEntry | null): void {
    this.selectedEntry = entry;
    this.processEventListener("onStateChange", [this]);
  }

  getFilteredEntries(): CapsuleResourceEntry[] {
    if (!this.filterText.trim()) return this.entries;
    const q = this.filterText.toLowerCase();
    return this.entries.filter((e) => e.resref.toLowerCase().includes(q));
  }

  async confirm(): Promise<void> {
    if (!this.selectedEntry || !this.capsuleResult) return;
    try {
      const data = await this.capsuleResult.getResourceBuffer(
        this.selectedEntry.resref,
        this.selectedEntry.resType
      );
      if (this.onSelect) {
        this.onSelect(this.selectedEntry.resref, this.selectedEntry.ext, data);
      }
      this.close();
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "Failed to load resource.";
      this.processEventListener("onStateChange", [this]);
    }
  }
}
