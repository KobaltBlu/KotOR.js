import React from "react";
import { ModalState } from "./ModalState";
import { ModalSaveToModule } from "../../components/modal/ModalSaveToModule";
import { SaveDestination } from "../../enum/SaveDestination";

export interface ModalSaveToModuleStateOptions {
  title?: string;
  resref: string;
  resType: number;
  data: Uint8Array;
  destination?: SaveDestination;
  onSaved?: (modPath: string) => void;
}

export class ModalSaveToModuleState extends ModalState {
  title: string = "Save to MOD / Override / RIM";
  resref: string = "";
  resType: number = 0;
  data: Uint8Array = new Uint8Array(0);
  /** Where to save (Holocron BifSaveOption: MOD, Override, RIM). */
  destination: SaveDestination = SaveDestination.MOD;
  modPath: string = "";
  modBuffer: Uint8Array | null = null;
  /** Override folder path (game Override or user-picked). Used when destination is Override. */
  overridePath: string = "";
  /** Override folder handle (browser). Used when destination is Override in browser. */
  overrideDirHandle?: FileSystemDirectoryHandle;
  /** RIM output file path. Used when destination is RIM. */
  rimPath: string = "";
  error: string = "";
  onSaved?: (modPath: string) => void;

  constructor(options: ModalSaveToModuleStateOptions) {
    super();
    if (options.title) this.title = options.title;
    this.resref = options.resref;
    this.resType = options.resType;
    this.data = options.data;
    if (options.destination !== undefined) this.destination = options.destination;
    if (options.onSaved) this.onSaved = options.onSaved;
    this.setView(<ModalSaveToModule modal={this} />);
  }

  setDestination(dest: SaveDestination): void {
    this.destination = dest;
    this.processEventListener("onStateChange", [this]);
  }

  setModPath(path: string): void {
    this.modPath = path;
    this.processEventListener("onStateChange", [this]);
  }

  setModBuffer(buffer: Uint8Array): void {
    this.modBuffer = buffer;
    this.processEventListener("onStateChange", [this]);
  }

  setError(msg: string): void {
    this.error = msg;
    this.processEventListener("onStateChange", [this]);
  }

  setOverridePath(path: string): void {
    this.overridePath = path;
    this.processEventListener("onStateChange", [this]);
  }

  setOverrideDirHandle(handle: FileSystemDirectoryHandle | undefined): void {
    this.overrideDirHandle = handle;
    this.processEventListener("onStateChange", [this]);
  }

  setRimPath(path: string): void {
    this.rimPath = path;
    this.processEventListener("onStateChange", [this]);
  }
}
