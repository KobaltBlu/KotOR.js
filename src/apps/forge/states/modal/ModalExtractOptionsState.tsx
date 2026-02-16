import React from "react";
import { ModalState } from "./ModalState";
import { ModalExtractOptions } from "../../components/modal/ModalExtractOptions";
import { DEFAULT_EXTRACT_OPTIONS } from "../../data/ExtractOptions";

export interface ExtractOptionsStateValues {
  tpcDecompile: boolean;
  tpcExtractTxi: boolean;
  mdlDecompile: boolean;
  mdlExtractTextures: boolean;
}

export interface ModalExtractOptionsStateOptions {
  defaultTpcDecompile?: boolean;
  defaultTpcExtractTxi?: boolean;
  defaultMdlDecompile?: boolean;
  defaultMdlExtractTextures?: boolean;
  onApply?: (options: ExtractOptionsStateValues) => void;
}

export class ModalExtractOptionsState extends ModalState {
  title: string = "Extract Options";

  #tpcDecompile: boolean;
  #tpcExtractTxi: boolean;
  #mdlDecompile: boolean;
  #mdlExtractTextures: boolean;
  #onApply?: (options: ExtractOptionsStateValues) => void;

  constructor(options: ModalExtractOptionsStateOptions = {}) {
    super();

    this.#tpcDecompile = options.defaultTpcDecompile ?? DEFAULT_EXTRACT_OPTIONS.tpcDecompile ?? false;
    this.#tpcExtractTxi = options.defaultTpcExtractTxi ?? DEFAULT_EXTRACT_OPTIONS.tpcExtractTxi ?? true;
    this.#mdlDecompile = options.defaultMdlDecompile ?? DEFAULT_EXTRACT_OPTIONS.mdlDecompile ?? false;
    this.#mdlExtractTextures = options.defaultMdlExtractTextures ?? DEFAULT_EXTRACT_OPTIONS.mdlExtractTextures ?? true;
    this.#onApply = options.onApply;

    this.setView(<ModalExtractOptions modal={this} />);
  }

  getTpcDecompile(): boolean {
    return this.#tpcDecompile;
  }

  setTpcDecompile(value: boolean): void {
    this.#tpcDecompile = value;
  }

  getTpcExtractTxi(): boolean {
    return this.#tpcExtractTxi;
  }

  setTpcExtractTxi(value: boolean): void {
    this.#tpcExtractTxi = value;
  }

  getMdlDecompile(): boolean {
    return this.#mdlDecompile;
  }

  setMdlDecompile(value: boolean): void {
    this.#mdlDecompile = value;
  }

  getMdlExtractTextures(): boolean {
    return this.#mdlExtractTextures;
  }

  setMdlExtractTextures(value: boolean): void {
    this.#mdlExtractTextures = value;
  }

  getOptions(): ExtractOptionsStateValues {
    return {
      tpcDecompile: this.#tpcDecompile,
      tpcExtractTxi: this.#tpcExtractTxi,
      mdlDecompile: this.#mdlDecompile,
      mdlExtractTextures: this.#mdlExtractTextures,
    };
  }

  apply(): void {
    if (this.#onApply) {
      this.#onApply(this.getOptions());
    }
    this.close();
  }
}
