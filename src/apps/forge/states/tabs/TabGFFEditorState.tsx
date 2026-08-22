import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabGFFEditor } from "@/apps/forge/components/tabs/tab-gff-editor/TabGFFEditor";
import { UTX_TEMPLATE_EXTENSIONS } from "@/apps/forge/commands/editorCommandGuards";
import { gffFromSnapshot, snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";
import {
  collectGffPaths,
  filterValidGffPaths,
  findGffNode,
  GFF_ROOT_PATH,
  gffAncestorPaths,
  gffPathKind,
  isGffField,
  isGffStruct,
  parentGffPath,
  searchGffPaths,
  visibleGffPathsForSearch,
} from "@/apps/forge/helpers/gffTreePath";
import { fieldPreview } from "@/apps/forge/helpers/gffFieldValue";
import {
  clipboardToJson,
  createDefaultField,
  fieldFromSerialized,
  getGffMemoryClipboard,
  gffFromDocumentJson,
  gffToDocumentJson,
  GffClipboardPayload,
  GffDocumentJson,
  insertChildStructAfter,
  insertFieldAfter,
  parseGffClipboardPayload,
  parseGffDocumentJson,
  replaceFieldKeepingLabel,
  serializeGffField,
  serializeGffStruct,
  setGffMemoryClipboard,
  structFromSerialized,
  uniqueFieldLabel,
} from "@/apps/forge/helpers/gffJsonCodec";
import { createUntitledModuleGffForExt } from "@/apps/forge/helpers/createUntitledModuleGff";

function gffSaveTypesForExt(ext?: string): FilePickerAcceptType[] {
  const key = (ext || "gff").replace(/^\./, "").toLowerCase() || "gff";
  return [
    {
      description: `${key.toUpperCase()} File`,
      accept: {
        "application/octet-stream": [`.${key}`],
      },
    },
  ];
}

async function writeTextFile(suggestedName: string, text: string, description: string): Promise<void> {
  const bytes = new TextEncoder().encode(text);
  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description, accept: { "application/json": [".json"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return;
  }
  const blob = new Blob([bytes], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

async function readTextFile(acceptExt: string): Promise<string | undefined> {
  if (typeof window !== "undefined" && typeof window.showOpenFilePicker === "function") {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
    });
    const file = await handles[0].getFile();
    return await file.text();
  }
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptExt;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(undefined);
      reader.readAsText(file);
    };
    input.click();
  });
}

export type TabGFFEditorStateEventListenerTypes =
TabStateEventListenerTypes &
  ''|'onEditorFileLoad'|'onNodeSelected'|'onTreeChanged'|'onFocusSearch'|'onKeyDown';

export interface TabGFFEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: Function[],
  onNodeSelected: Function[],
  onTreeChanged: Function[],
  onFocusSearch: Function[],
}

export class TabGFFEditorState extends TabState {

  tabName: string = `GFF`;
  gff: KotOR.GFFObject;

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;
  selectedPath: string = GFF_ROOT_PATH;
  expandedPaths: Set<string> = new Set([GFF_ROOT_PATH]);
  generation: number = 0;
  treeWidthPercent: number = 50;
  searchQuery: string = "";
  searchMatches: string[] = [];
  searchMatchSet: Set<string> = new Set();
  searchVisiblePaths: Set<string> = new Set([GFF_ROOT_PATH]);
  searchMatchIndex: number = -1;
  renamingPath: string | null = null;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabGFFEditor tab={this}></TabGFFEditor>);
    this.openFile();
    this.saveTypes = gffSaveTypesForExt(this.file?.ext);
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        const ext = String(this.file.ext || "").toLowerCase().replace(/^\./, "");
        if ((UTX_TEMPLATE_EXTENSIONS as readonly string[]).indexOf(ext) >= 0) {
          this.tabName = `${this.tabName} [GFF]`;
        }
        this.saveTypes = gffSaveTypesForExt(ext);

        file.readFile().then( (response) => {
          const emptyNew = !(response.buffer instanceof Uint8Array && response.buffer.length)
            && !file.path
            && !file.archive_path;
          const untitledModule = emptyNew
            ? createUntitledModuleGffForExt(ext, file.resref || "new_area")
            : undefined;
          this.gff = untitledModule || new KotOR.GFFObject(response.buffer);
          if (!String(this.gff.FileType || "").trim() && ext) {
            this.gff.FileType = (ext.toUpperCase() + "    ").slice(0, 4);
          }
          this.clearUndoHistory();
          this.selectedPath = GFF_ROOT_PATH;
          this.expandedPaths = new Set([GFF_ROOT_PATH]);
          this.selectedNode = this.gff.RootNode;
          this.renamingPath = null;
          this.notifyTree();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.gff);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.gff) {
      return this.gff.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  notifyTree(): void {
    if (this.searchQuery.trim() && this.gff?.RootNode) {
      this.searchMatches = searchGffPaths(this.gff.RootNode, this.searchQuery, fieldPreview);
      this.searchMatchSet = new Set(this.searchMatches);
      this.searchVisiblePaths = visibleGffPathsForSearch(this.gff.RootNode, this.searchMatches);
    }
    this.generation += 1;
    this.processEventListener('onTreeChanged', [this]);
  }

  markUnsaved(): void {
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.editorFileUpdated();
  }

  beginMutation(): void {
    this.captureUndoSnapshot();
    this.markUnsaved();
  }

  setSelectedPath(path: string, node?: KotOR.GFFField | KotOR.GFFStruct): void {
    const resolved = node || findGffNode(this.gff?.RootNode, path);
    this.selectedPath = path;
    if (resolved) {
      this.selectedNode = resolved;
      this.processEventListener('onNodeSelected', [resolved, path]);
    }
    this.notifyTree();
  }

  setSelectedField(node: KotOR.GFFField|KotOR.GFFStruct): void {
    if(!node){
      return;
    }
    this.selectedNode = node;
    this.processEventListener('onNodeSelected', [node, this.selectedPath]);
  }

  isExpanded(path: string): boolean {
    return this.expandedPaths.has(path);
  }

  setExpanded(path: string, expanded: boolean): void {
    if (expanded) {
      this.expandedPaths.add(path);
    } else if (path !== GFF_ROOT_PATH) {
      this.expandedPaths.delete(path);
    }
    this.notifyTree();
  }

  toggleExpanded(path: string): void {
    this.setExpanded(path, !this.isExpanded(path));
  }

  expandAncestors(path: string): void {
    const ancestors = gffAncestorPaths(path);
    for (let i = 0; i < ancestors.length; i++) {
      this.expandedPaths.add(ancestors[i]);
    }
  }

  expandAll(): void {
    if (!this.gff?.RootNode) {
      return;
    }
    this.expandedPaths = new Set(collectGffPaths(this.gff.RootNode));
    this.notifyTree();
  }

  collapseAll(): void {
    this.expandedPaths = new Set([GFF_ROOT_PATH]);
    this.notifyTree();
  }

  isSearchFiltering(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  isSearchVisible(path: string): boolean {
    return !this.isSearchFiltering() || this.searchVisiblePaths.has(path);
  }

  isSearchMatch(path: string): boolean {
    return this.searchMatchSet.has(path);
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.refreshSearchMatches();
  }

  refreshSearchMatches(): void {
    if (!this.gff?.RootNode) {
      this.searchMatches = [];
      this.searchMatchSet = new Set();
      this.searchVisiblePaths = new Set([GFF_ROOT_PATH]);
      this.searchMatchIndex = -1;
      this.notifyTree();
      return;
    }
    this.searchMatches = searchGffPaths(this.gff.RootNode, this.searchQuery, fieldPreview);
    this.searchMatchSet = new Set(this.searchMatches);
    this.searchVisiblePaths = this.isSearchFiltering()
      ? visibleGffPathsForSearch(this.gff.RootNode, this.searchMatches)
      : new Set([GFF_ROOT_PATH]);
    for (let i = 0; i < this.searchMatches.length; i++) {
      this.expandAncestors(this.searchMatches[i]);
    }
    const selectedMatch = this.searchMatches.indexOf(this.selectedPath);
    if (selectedMatch >= 0) {
      this.searchMatchIndex = selectedMatch;
    } else if (this.searchMatches.length) {
      this.searchMatchIndex = 0;
      if (!this.isSearchVisible(this.selectedPath)) {
        this.setSelectedPath(this.searchMatches[0]);
        return;
      }
    } else {
      this.searchMatchIndex = -1;
    }
    this.notifyTree();
  }

  revealMatch(index: number): void {
    if (!this.searchMatches.length) {
      return;
    }
    const wrapped = ((index % this.searchMatches.length) + this.searchMatches.length) % this.searchMatches.length;
    this.searchMatchIndex = wrapped;
    const path = this.searchMatches[wrapped];
    this.expandAncestors(path);
    this.setSelectedPath(path);
  }

  nextSearchMatch(): void {
    this.revealMatch(this.searchMatchIndex + 1);
  }

  prevSearchMatch(): void {
    this.revealMatch(this.searchMatchIndex - 1);
  }

  selectedStruct(): KotOR.GFFStruct | undefined {
    const node = findGffNode(this.gff?.RootNode, this.selectedPath);
    if (isGffStruct(node)) {
      return node;
    }
    const parent = parentGffPath(this.selectedPath);
    const parentNode = parent === undefined ? this.gff?.RootNode : findGffNode(this.gff?.RootNode, parent);
    return isGffStruct(parentNode) ? parentNode : this.gff?.RootNode;
  }

  addField(type: number, parentPath?: string): void {
    const path = parentPath ?? (gffPathKind(this.selectedPath) === "struct" ? this.selectedPath : parentGffPath(this.selectedPath) ?? GFF_ROOT_PATH);
    const parent = findGffNode(this.gff?.RootNode, path);
    if (!isGffStruct(parent)) {
      return;
    }
    this.beginMutation();
    const field = createDefaultField(type, uniqueFieldLabel(parent, "NewField"));
    parent.addField(field);
    this.expandedPaths.add(path);
    this.setSelectedPath(path ? `${path}.${field.getLabel()}` : field.getLabel(), field);
  }

  addListStruct(listPath?: string): void {
    const path = listPath ?? this.selectedPath;
    const field = findGffNode(this.gff?.RootNode, path);
    if (!isGffField(field) || field.getType() !== KotOR.GFFDataType.LIST) {
      return;
    }
    this.beginMutation();
    const struct = new KotOR.GFFStruct(-1);
    field.addChildStruct(struct);
    const index = field.getChildStructs().length - 1;
    this.expandedPaths.add(path);
    this.setSelectedPath(`${path}[${index}]`, struct);
  }

  deletePath(path: string): boolean {
    if (!path) {
      return false;
    }
    const parentPath = parentGffPath(path);
    if (parentPath === undefined) {
      return false;
    }
    const node = findGffNode(this.gff?.RootNode, path);
    const parent = findGffNode(this.gff?.RootNode, parentPath);
    if (!node || !parent) {
      return false;
    }
    if (isGffField(node) && isGffStruct(parent)) {
      this.beginMutation();
      parent.removeField(node);
    } else if (isGffStruct(node) && isGffField(parent)) {
      this.beginMutation();
      parent.removeChildStruct(node);
    } else {
      return false;
    }
    this.renamingPath = null;
    this.setSelectedPath(parentPath);
    return true;
  }

  copyPath(path: string): GffClipboardPayload | undefined {
    const node = findGffNode(this.gff?.RootNode, path);
    if (!node) {
      return undefined;
    }
    if (!isGffField(node) && !isGffStruct(node)) {
      return undefined;
    }
    const payload: GffClipboardPayload = isGffField(node)
      ? { kind: "field", field: serializeGffField(node) }
      : { kind: "struct", struct: serializeGffStruct(node) };
    setGffMemoryClipboard(payload);
    const text = clipboardToJson(payload);
    void navigator.clipboard?.writeText?.(text);
    return payload;
  }

  cutPath(path: string): void {
    if (!path) {
      return;
    }
    this.copyPath(path);
    this.deletePath(path);
  }

  async pasteInto(path?: string): Promise<boolean> {
    const targetPath = path ?? this.selectedPath;
    let payload = getGffMemoryClipboard();
    try {
      const text = await navigator.clipboard?.readText?.();
      const fromSystem = text ? parseGffClipboardPayload(text) : undefined;
      if (fromSystem) {
        payload = fromSystem;
        setGffMemoryClipboard(fromSystem);
      }
    } catch {
      /* clipboard permission */
    }
    if (!payload) {
      return false;
    }
    const target = findGffNode(this.gff?.RootNode, targetPath);
    if (!target) {
      return false;
    }
    if (payload.kind === "field") {
      const parent = isGffStruct(target)
        ? target
        : findGffNode(this.gff?.RootNode, parentGffPath(targetPath) ?? GFF_ROOT_PATH);
      if (!isGffStruct(parent)) {
        return false;
      }
      this.beginMutation();
      const clone = fieldFromSerialized({
        ...payload.field,
        label: uniqueFieldLabel(parent, payload.field.label),
      });
      const after = isGffField(target) ? target : undefined;
      insertFieldAfter(parent, clone, after);
      const parentPath = isGffStruct(target) ? targetPath : (parentGffPath(targetPath) ?? GFF_ROOT_PATH);
      this.setSelectedPath(parentPath ? `${parentPath}.${clone.getLabel()}` : clone.getLabel(), clone);
      return true;
    }
    const listField = isGffField(target) && target.getType() === KotOR.GFFDataType.LIST
      ? target
      : findGffNode(this.gff?.RootNode, parentGffPath(targetPath) ?? "");
    if (!isGffField(listField) || listField.getType() !== KotOR.GFFDataType.LIST) {
      return false;
    }
    this.beginMutation();
    const clone = structFromSerialized(payload.struct);
    const after = isGffStruct(target) ? target : undefined;
    insertChildStructAfter(listField, clone, after);
    const listPath = listField === target ? targetPath : (parentGffPath(targetPath) ?? targetPath);
    const index = listField.getChildStructs().indexOf(clone);
    this.expandedPaths.add(listPath);
    this.setSelectedPath(`${listPath}[${index}]`, clone);
    return true;
  }

  duplicatePath(path: string): void {
    const payload = this.copyPath(path);
    if (!payload) {
      return;
    }
    void this.pasteInto(path);
  }

  changeFieldType(path: string, type: number): void {
    const field = findGffNode(this.gff?.RootNode, path);
    const parent = findGffNode(this.gff?.RootNode, parentGffPath(path) ?? GFF_ROOT_PATH);
    if (!isGffField(field) || !isGffStruct(parent) || field.getType() === type) {
      return;
    }
    this.beginMutation();
    const next = replaceFieldKeepingLabel(parent, field, type);
    const nextPath = path.endsWith(next.getLabel()) ? path : (parentGffPath(path) ? `${parentGffPath(path)}.${next.getLabel()}` : next.getLabel());
    this.setSelectedPath(nextPath, next);
  }

  renameField(path: string, label: string): void {
    const field = findGffNode(this.gff?.RootNode, path);
    if (!isGffField(field)) {
      return;
    }
    this.beginMutation();
    field.setLabel(label.slice(0, 16));
    const parentPath = parentGffPath(path) ?? GFF_ROOT_PATH;
    this.renamingPath = null;
    this.setSelectedPath(parentPath ? `${parentPath}.${field.getLabel()}` : field.getLabel(), field);
  }

  setStructType(path: string, type: number): void {
    const struct = findGffNode(this.gff?.RootNode, path);
    if (!isGffStruct(struct)) {
      return;
    }
    this.beginMutation();
    struct.setType(type);
    this.notifyTree();
    this.processEventListener('onNodeSelected', [struct, path]);
  }

  async exportJson(): Promise<void> {
    if (!this.gff) {
      return;
    }
    try {
      const doc = gffToDocumentJson(this.gff);
      const base = this.file?.resref || this.file?.getFilename?.() || "gff";
      await writeTextFile(`${base}.json`, JSON.stringify(doc, null, 2) + "\n", "GFF JSON");
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        return;
      }
      throw error;
    }
  }

  async importJson(): Promise<void> {
    try {
      const text = await readTextFile(".json");
      if (text === undefined) {
        return;
      }
      this.applyDocumentJson(parseGffDocumentJson(text));
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        return;
      }
      window.alert("Could not import GFF JSON.");
    }
  }

  applyDocumentJson(doc: GffDocumentJson): void {
    this.beginMutation();
    this.gff = gffFromDocumentJson(doc);
    this.selectedPath = GFF_ROOT_PATH;
    this.expandedPaths = new Set([GFF_ROOT_PATH]);
    this.selectedNode = this.gff.RootNode;
    this.notifyTree();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  handleEditorKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || "").toLowerCase();
    const inField = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
    const inVoidHex = !!target?.closest?.(".gff-void-hex");
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      this.processEventListener('onFocusSearch', [this]);
      return;
    }
    if (inField || inVoidHex) {
      return;
    }
    if (e.key === "F2") {
      if (gffPathKind(this.selectedPath) === "field") {
        e.preventDefault();
        this.renamingPath = this.selectedPath;
        this.notifyTree();
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (this.selectedPath) {
        e.preventDefault();
        this.deletePath(this.selectedPath);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        this.copyPath(this.selectedPath);
      } else if (key === "x") {
        e.preventDefault();
        this.cutPath(this.selectedPath);
      } else if (key === "v") {
        e.preventDefault();
        void this.pasteInto(this.selectedPath);
      } else if (key === "d") {
        e.preventDefault();
        this.duplicatePath(this.selectedPath);
      }
    }
  }

  protected captureUndoState(): Uint8Array | undefined {
    return snapshotGff(this.gff);
  }

  protected applyUndoState(state: Uint8Array): void {
    const selected = this.selectedPath;
    const expanded = Array.from(this.expandedPaths);
    this.gff = gffFromSnapshot(state);
    this.expandedPaths = filterValidGffPaths(this.gff.RootNode, expanded);
    const restored = findGffNode(this.gff.RootNode, selected);
    this.selectedPath = restored ? selected : GFF_ROOT_PATH;
    this.selectedNode = (restored || this.gff.RootNode) as KotOR.GFFField | KotOR.GFFStruct;
    this.renamingPath = null;
    this.markUnsaved();
    this.notifyTree();
    this.processEventListener('onEditorFileLoad', [this]);
    this.processEventListener('onNodeSelected', [this.selectedNode, this.selectedPath]);
  }

}
