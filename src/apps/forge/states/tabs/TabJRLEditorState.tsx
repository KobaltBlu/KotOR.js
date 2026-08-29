/**
 * Journal (JRL) blueprint editor state.
 *
 * @file TabJRLEditorState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, UpdateFileOptions } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { TabJRLEditor } from "@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor";
import { gffFromSnapshot, snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";

export interface JournalCategory {
  tag: string;
  name: string;
  priority: number;
  comment: string;
  entries: JournalEntry[];
}

export interface JournalEntry {
  id: number;
  text: string;
  end: number;
  xp_percentage: number;
}

export class TabJRLEditorState extends TabState {
  tabName = "Journal";
  gff: KotOR.GFFObject = new KotOR.GFFObject();
  categories: JournalCategory[] = [];
  selectedCategoryIndex = 0;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabJRLEditor tab={this} />);
    void this.openFile();
  }

  async openFile(file?: EditorFile): Promise<void> {
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }
    if (!(file instanceof EditorFile)) {
      return;
    }
    this.file = file;
    this.tabName = file.getFilename();
    const response = await file.readFile();
    this.gff = new KotOR.GFFObject(response.buffer || new Uint8Array());
    if (!String(this.gff.FileType || "").trim()) {
      this.gff.FileType = "JRL ";
    }
    this.loadFromGff();
    this.clearUndoHistory();
    this.processEventListener("onEditorFileLoad", [this]);
  }

  loadFromGff(): void {
    const root = this.gff.RootNode;
    this.categories = [];
    if (!root?.hasField("Categories")) {
      this.processEventListener("onJournalChanged", [this]);
      return;
    }
    const structs = root.getFieldByLabel("Categories").getChildStructs();
    for (const struct of structs) {
      const entries: JournalEntry[] = [];
      if (struct.hasField("EntryList")) {
        for (const entryStruct of struct.getFieldByLabel("EntryList").getChildStructs()) {
          entries.push({
            id: entryStruct.getFieldByLabel("ID")?.getValue?.() ?? 0,
            text: entryStruct.getFieldByLabel("Text")?.getCExoLocString?.()?.getValue?.()
              || entryStruct.getFieldByLabel("Text")?.getValue?.()
              || "",
            end: entryStruct.getFieldByLabel("End")?.getValue?.() ?? 0,
            xp_percentage: entryStruct.getFieldByLabel("XP_Percentage")?.getValue?.() ?? 0,
          });
        }
      }
      this.categories.push({
        tag: struct.getFieldByLabel("Tag")?.getValue?.() || "",
        name: struct.getFieldByLabel("Name")?.getCExoLocString?.()?.getValue?.()
          || struct.getFieldByLabel("Name")?.getValue?.()
          || "",
        priority: struct.getFieldByLabel("Priority")?.getValue?.() ?? 0,
        comment: struct.getFieldByLabel("Comment")?.getValue?.() || "",
        entries,
      });
    }
    this.processEventListener("onJournalChanged", [this]);
  }

  exportToGff(): KotOR.GFFObject {
    const root = new KotOR.GFFStruct(0xffff);
    const categories = new KotOR.GFFField(KotOR.GFFDataType.LIST, "Categories");
    this.categories.forEach((category, index) => {
      const struct = new KotOR.GFFStruct(index);
      struct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, "Tag", category.tag));
      const name = new KotOR.CExoLocString();
      name.addSubString(category.name, 0);
      struct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, "Name", name));
      struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, "Priority", category.priority));
      struct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, "Comment", category.comment));
      const entryList = new KotOR.GFFField(KotOR.GFFDataType.LIST, "EntryList");
      category.entries.forEach((entry, entryIndex) => {
        const entryStruct = new KotOR.GFFStruct(entryIndex);
        entryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, "ID", entry.id));
        const text = new KotOR.CExoLocString();
        text.addSubString(entry.text, 0);
        entryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, "Text", text));
        entryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, "End", entry.end));
        entryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, "XP_Percentage", entry.xp_percentage));
        entryList.addChildStruct(entryStruct);
      });
      struct.addField(entryList);
      categories.addChildStruct(struct);
    });
    root.addField(categories);
    const gff = new KotOR.GFFObject();
    gff.RootNode = root;
    gff.FileType = "JRL ";
    this.gff = gff;
    return gff;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (ext === "jrl" || !ext) {
      return this.exportToGff().getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(options?: UpdateFileOptions): void {
    if (!options?.skipHistory) {
      if (options?.coalesceKey) {
        this.captureCoalescedUndo(options.coalesceKey);
      } else {
        this.captureUndoSnapshot();
      }
    }
    this.exportToGff();
    if (this.file) {
      this.file.unsaved_changes = true;
      this.file.buffer = this.gff.getExportBuffer();
    }
    this.editorFileUpdated();
    this.processEventListener("onJournalChanged", [this]);
  }

  protected captureUndoState(): any {
    return snapshotGff(this.exportToGff());
  }

  protected applyUndoState(state: any): void {
    this.gff = gffFromSnapshot(state);
    this.loadFromGff();
    if (this.file) {
      this.file.unsaved_changes = true;
      this.file.buffer = this.gff.getExportBuffer();
    }
    this.editorFileUpdated();
  }

  addCategory(): void {
    this.categories.push({
      tag: `plot${this.categories.length + 1}`,
      name: "New Plot",
      priority: 0,
      comment: "",
      entries: [{ id: 0, text: "Plot started.", end: 0, xp_percentage: 0 }],
    });
    this.selectedCategoryIndex = this.categories.length - 1;
    this.updateFile();
  }

  removeCategory(index: number): void {
    this.categories.splice(index, 1);
    this.selectedCategoryIndex = Math.max(0, Math.min(this.selectedCategoryIndex, this.categories.length - 1));
    this.updateFile();
  }

  addEntry(categoryIndex: number): void {
    const category = this.categories[categoryIndex];
    if (!category) return;
    const nextId = category.entries.reduce((max, entry) => Math.max(max, entry.id), -1) + 1;
    category.entries.push({ id: nextId, text: "New entry", end: 0, xp_percentage: 0 });
    this.updateFile({ coalesceKey: `jrl-entry-${categoryIndex}` });
  }

  removeEntry(categoryIndex: number, entryIndex: number): void {
    const category = this.categories[categoryIndex];
    if (!category) return;
    category.entries.splice(entryIndex, 1);
    this.updateFile();
  }
}
