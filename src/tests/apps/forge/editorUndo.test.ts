import { describe, expect, jest, test } from "@jest/globals";

jest.mock("@/apps/forge/managers/EditorTabManager", () => ({
  EditorTabManager: class {
    static tabId = 0;
    static GetNewTabID(): number {
      return ++this.tabId;
    }
  },
}));

jest.mock("@/apps/forge/states/ForgeState", () => ({
  ForgeState: {},
}));

jest.mock("@/apps/forge/EditorFile", () => ({
  EditorFile: class EditorFile {},
}));

jest.mock("@/apps/forge/KotOR", () => ({
  ApplicationProfile: { ENV: 0 },
  ApplicationEnvironment: { ELECTRON: 1, BROWSER: 0 },
}));

jest.mock("@/apps/forge/ForgeFileSystem", () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

import { TabState } from "@/apps/forge/states/tabs/TabState";
import { beginUtxFileUpdate } from "@/apps/forge/helpers/UTxEditorHelpers";
import { gffFromSnapshot, snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";

class ValueUndoTab extends TabState {
  value = 0;

  protected captureUndoState(): number {
    return this.value;
  }

  protected applyUndoState(state: number): void {
    this.value = state;
  }
}

class HexUndoTab extends TabState {
  bytes = new Uint8Array([1, 2, 3]);

  protected captureUndoState(): Uint8Array {
    return new Uint8Array(this.bytes);
  }

  protected applyUndoState(state: Uint8Array): void {
    this.bytes = new Uint8Array(state);
  }
}

describe("TabState coalescing", () => {
  test("same key does not grow the undo stack", () => {
    const tab = new ValueUndoTab();
    tab.captureCoalescedUndo("field");
    tab.value = 1;
    tab.captureCoalescedUndo("field");
    tab.value = 2;
    tab.captureCoalescedUndo("field");
    tab.value = 3;

    expect(tab.canUndo).toBe(true);
    tab.undo();
    expect(tab.value).toBe(0);
    expect(tab.canUndo).toBe(false);
  });

  test("a different key pushes another undo step", () => {
    const tab = new ValueUndoTab();
    tab.captureCoalescedUndo("a");
    tab.value = 1;
    tab.captureCoalescedUndo("b");
    tab.value = 2;

    expect(tab.canUndo).toBe(true);
    tab.undo();
    expect(tab.value).toBe(1);
    expect(tab.canUndo).toBe(true);
    tab.undo();
    expect(tab.value).toBe(0);
    expect(tab.canUndo).toBe(false);
  });
});

describe("gffUndoSnapshot", () => {
  test("buffer clone round-trips RootNode field count", () => {
    const gff = new GFFObject();
    gff.FileType = "GFF ";
    gff.RootNode.type = -1;
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, "Foo", 1));
    gff.RootNode.addField(new GFFField(GFFDataType.INT, "Bar", 2));
    expect(gff.RootNode.getFields().length).toBe(2);

    const bytes = snapshotGff(gff);
    expect(bytes).toBeDefined();
    const again = gffFromSnapshot(bytes!);
    expect(again.RootNode.getFields().length).toBe(2);
    expect(again.RootNode.getFieldByLabel("Foo").getValue()).toBe(1);
    expect(again.RootNode.getFieldByLabel("Bar").getValue()).toBe(2);
  });
});

describe("hex undo apply", () => {
  test("capture / apply restores previous bytes", () => {
    const tab = new HexUndoTab();
    tab.captureUndoSnapshot();
    tab.bytes[0] = 9;
    tab.bytes[2] = 7;

    expect(tab.canUndo).toBe(true);
    tab.undo();
    expect(Array.from(tab.bytes)).toEqual([1, 2, 3]);

    tab.redo();
    expect(Array.from(tab.bytes)).toEqual([9, 2, 7]);
  });
});

describe("beginUtxFileUpdate dirty flag", () => {
  test("marks the file unsaved", () => {
    const tab = new ValueUndoTab();
    tab.file = { unsaved_changes: false } as ValueUndoTab["file"];
    beginUtxFileUpdate(tab);
    expect(tab.file.unsaved_changes).toBe(true);
  });

  test("skipHistory does not mark the file unsaved", () => {
    const tab = new ValueUndoTab();
    tab.file = { unsaved_changes: false } as ValueUndoTab["file"];
    beginUtxFileUpdate(tab, { skipHistory: true });
    expect(tab.file.unsaved_changes).toBe(false);
  });
});
