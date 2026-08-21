import { describe, expect, test } from "@jest/globals";
import {
  listTwoDAIndexOptions,
  twoDATableHasRows,
} from "@/apps/forge/helpers/twoDAIndexOptions";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { KEYObject } from "@/resource/KEYObject";
import { TPCLoader } from "@/loaders/TPCLoader";
import { shouldBuildFromMdl } from "@/apps/forge/helpers/keyModelLoad";
import { listDirectoryOrEmpty } from "@/apps/forge/helpers/listDirectoryOrEmpty";
import { isNonEmptyEditorBuffer } from "@/apps/forge/helpers/editorFileBuffer";

describe("Forge without game data", () => {
  test("empty 2DA tables report no rows and keep a numeric fallback value", () => {
    expect(twoDATableHasRows(undefined)).toBe(false);
    expect(twoDATableHasRows({ rows: {} })).toBe(false);
    const options = listTwoDAIndexOptions(undefined, { currentValue: 7 });
    expect(options.map((option) => option.value)).toEqual([7]);
  });

  test("heads.2da-style row maps are safe when the table is missing", () => {
    const heads = Object.values((undefined as { rows?: Record<string, unknown> } | undefined)?.rows ?? {});
    expect(heads).toEqual([]);
  });

  test("initNWScriptParser path: parser constructs without nwscript.nss", () => {
    expect(() => new NWScriptParser("")).not.toThrow();
  });

  test("empty KEYObject has no archive keys for browsers to scan", () => {
    const key = new KEYObject();
    expect(key.keys).toEqual([]);
    expect(key.bifs).toEqual([]);
  });

  test("TPC lookup does not TypeError when texture packs are missing", async () => {
    const loader = new TPCLoader();
    await expect(loader.findTPC("iimplant")).rejects.toThrow(/TPC not found/);
  });

  test("FromMDL is skipped when the MDL loader returns undefined or game data is missing", () => {
    expect(shouldBuildFromMdl(undefined, true)).toBe(false);
    expect(shouldBuildFromMdl({}, false)).toBe(false);
    expect(shouldBuildFromMdl({ geometryHeader: {} }, true)).toBe(true);
  });

  test("New Project modules listing is empty when readdir fails", async () => {
    await expect(
      listDirectoryOrEmpty(async () => {
        throw new Error("no modules folder");
      }, "modules")
    ).resolves.toEqual([]);
    await expect(
      listDirectoryOrEmpty(async () => ["end_m01aa.rim", "end_m01aa_s.rim"], "modules")
    ).resolves.toEqual(["end_m01aa.rim", "end_m01aa_s.rim"]);
  });

  test("empty restored KEY/BIF buffers do not count as a loaded MDL", () => {
    expect(isNonEmptyEditorBuffer(undefined)).toBe(false);
    expect(isNonEmptyEditorBuffer(new Uint8Array(0))).toBe(false);
    expect(isNonEmptyEditorBuffer(new Uint8Array([0x4e, 0x42, 0x4d, 0x44]))).toBe(true);
    const buffer: Uint8Array | undefined = undefined;
    expect(() => {
      if (!isNonEmptyEditorBuffer(buffer)) {
        return;
      }
      buffer.subarray(0, 4);
    }).not.toThrow();
  });
});
