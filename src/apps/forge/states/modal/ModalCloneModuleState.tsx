import React from "react";

import { ModalCloneModule } from "@/apps/forge/components/modal/ModalCloneModule";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import type { CloneModuleOptions } from "@/apps/forge/helpers/CloneModule";
import * as KotOR from "@/apps/forge/KotOR";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export interface ModalCloneModuleStateOptions {
  title?: string;
  /** Source MOD file path (Electron) or null to browse */
  sourceModPath?: string | null;
  onComplete?: (outputModPath: string) => void;
}

export class ModalCloneModuleState extends ModalState {
  title: string = "Clone Module";
  sourceModPath: string = "";
  sourceModBuffer: Uint8Array | null = null;
  identifier: string = "";
  prefix: string = "";
  name: string = "";
  copyTextures: boolean = true;
  copyLightmaps: boolean = true;
  keepDoors: boolean = true;
  keepPlaceables: boolean = true;
  keepSounds: boolean = true;
  keepPathing: boolean = true;
  loading: boolean = false;
  error: string = "";
  onComplete?: (outputModPath: string) => void;

  constructor(options: ModalCloneModuleStateOptions = {}) {
    super();
    if (options.title) this.title = options.title;
    if (options.onComplete) this.onComplete = options.onComplete;
    this.setView(<ModalCloneModule modal={this} />);
  }

  setIdentifier(value: string): void {
    this.identifier = value.toLowerCase().slice(0, 16);
    if (!this.prefix) this.prefix = this.identifier.slice(0, 3).toUpperCase();
    this.processEventListener("onStateChange", [this]);
  }

  setPrefix(value: string): void {
    this.prefix = value.slice(0, 3).toUpperCase();
    this.processEventListener("onStateChange", [this]);
  }

  setName(value: string): void {
    this.name = value;
    this.processEventListener("onStateChange", [this]);
  }

  setCopyTextures(v: boolean): void {
    this.copyTextures = v;
    this.processEventListener("onStateChange", [this]);
  }
  setCopyLightmaps(v: boolean): void {
    this.copyLightmaps = v;
    this.processEventListener("onStateChange", [this]);
  }
  setKeepDoors(v: boolean): void {
    this.keepDoors = v;
    this.processEventListener("onStateChange", [this]);
  }
  setKeepPlaceables(v: boolean): void {
    this.keepPlaceables = v;
    this.processEventListener("onStateChange", [this]);
  }
  setKeepSounds(v: boolean): void {
    this.keepSounds = v;
    this.processEventListener("onStateChange", [this]);
  }
  setKeepPathing(v: boolean): void {
    this.keepPathing = v;
    this.processEventListener("onStateChange", [this]);
  }

  async browseSource(): Promise<void> {
    const response = await ForgeFileSystem.OpenFile({ ext: [".mod"] });
    if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
      if (response.paths && response.paths.length > 0) {
        this.sourceModPath = response.paths[0];
      }
    } else {
      if (response.handles && response.handles.length > 0) {
        const h = response.handles[0] as FileSystemFileHandle;
        this.sourceModPath = h.name;
      }
    }
    const buffer = (await ForgeFileSystem.ReadFileBufferFromResponse(response)) as Uint8Array;
    if (buffer.length > 0) {
      this.sourceModBuffer = buffer;
      this.error = "";
    } else {
      this.sourceModBuffer = null;
      this.error = "Could not read file.";
    }
    this.processEventListener("onStateChange", [this]);
  }

  async runClone(outputPath: string): Promise<boolean> {
    const cloneMod = (await import("@/apps/forge/helpers/CloneModule")) as {
      cloneModuleFromBuffer: (opts: CloneModuleOptions) => Promise<void>;
    };
    const sourceBuffer = this.sourceModBuffer;
    if (!sourceBuffer) {
      this.error = "No source buffer.";
      return false;
    }
    try {
      await cloneMod.cloneModuleFromBuffer({
        sourceBuffer,
        identifier: this.identifier,
        prefix: this.prefix,
        name: this.name || this.identifier,
        copyTextures: this.copyTextures,
        copyLightmaps: this.copyLightmaps,
        keepDoors: this.keepDoors,
        keepPlaceables: this.keepPlaceables,
        keepSounds: this.keepSounds,
        keepPathing: this.keepPathing,
        outputPath,
      });
      if (this.onComplete) this.onComplete(outputPath);
      return true;
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "Clone failed.";
      this.processEventListener("onStateChange", [this]);
      return false;
    }
  }
}
