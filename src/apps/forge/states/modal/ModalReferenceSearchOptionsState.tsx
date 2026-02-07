import React from "react";
import { ModalState } from "./ModalState";
import { ModalReferenceSearchOptions } from "../../components/modal/ModalReferenceSearchOptions";
import { getAllSearchableFileTypes } from "../../data/ReferenceSearchConfig";

export interface ReferenceSearchOptionsStateDefaults {
  defaultPartialMatch?: boolean;
  defaultCaseSensitive?: boolean;
  defaultFilePattern?: string | null;
  defaultFileTypes?: Set<string> | null;
  onApply?: (options: ReferenceSearchOptionsStateValues) => void;
}

export interface ReferenceSearchOptionsStateValues {
  partialMatch: boolean;
  caseSensitive: boolean;
  filePattern: string | null;
  fileTypes: Set<string> | null;
}

export class ModalReferenceSearchOptionsState extends ModalState {
  title: string = "Reference Search Options";
  /** File types from ReferenceSearchConfig (Holocron-aligned). */
  fileTypeOptions: string[] = getAllSearchableFileTypes();

  #partialMatch: boolean;
  #caseSensitive: boolean;
  #filePattern: string | null;
  #selectedFileTypes: Set<string>;
  #onApply?: (options: ReferenceSearchOptionsStateValues) => void;

  constructor(options: ReferenceSearchOptionsStateDefaults = {}) {
    super();

    this.#partialMatch = options.defaultPartialMatch ?? false;
    this.#caseSensitive = options.defaultCaseSensitive ?? false;
    this.#filePattern = options.defaultFilePattern ?? null;
    this.#selectedFileTypes = new Set(options.defaultFileTypes ?? []);
    this.#onApply = options.onApply;

    this.setView(<ModalReferenceSearchOptions modal={this} />);
  }

  getPartialMatch(): boolean {
    return this.#partialMatch;
  }

  setPartialMatch(value: boolean): void {
    this.#partialMatch = value;
    this.processEventListener("onOptionsChanged", [this.getOptions()]);
  }

  getCaseSensitive(): boolean {
    return this.#caseSensitive;
  }

  setCaseSensitive(value: boolean): void {
    this.#caseSensitive = value;
    this.processEventListener("onOptionsChanged", [this.getOptions()]);
  }

  getFilePattern(): string | null {
    return this.#filePattern && this.#filePattern.trim().length ? this.#filePattern : null;
  }

  setFilePattern(value: string | null): void {
    this.#filePattern = value && value.trim().length ? value : null;
    this.processEventListener("onOptionsChanged", [this.getOptions()]);
  }

  toggleFileType(type: string): void {
    if (this.#selectedFileTypes.has(type)) {
      this.#selectedFileTypes.delete(type);
    } else {
      this.#selectedFileTypes.add(type);
    }
    this.processEventListener("onOptionsChanged", [this.getOptions()]);
  }

  setFileTypes(types: Set<string> | null): void {
    this.#selectedFileTypes = new Set(types ?? []);
    this.processEventListener("onOptionsChanged", [this.getOptions()]);
  }

  getFileTypes(): Set<string> | null {
    if (this.#selectedFileTypes.size === 0) {
      return new Set();
    }
    if (this.#selectedFileTypes.size >= this.fileTypeOptions.length) {
      return null;
    }
    return new Set(this.#selectedFileTypes);
  }

  isFileTypeSelected(type: string): boolean {
    return this.#selectedFileTypes.has(type);
  }

  getOptions(): ReferenceSearchOptionsStateValues {
    return {
      partialMatch: this.getPartialMatch(),
      caseSensitive: this.getCaseSensitive(),
      filePattern: this.getFilePattern(),
      fileTypes: this.getFileTypes(),
    };
  }

  apply(): void {
    if (this.#onApply) {
      this.#onApply(this.getOptions());
    }
    this.close();
  }
}
