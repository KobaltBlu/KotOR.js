import { describe, expect, test } from "@jest/globals";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import {
  explorerCopyRelativePath,
  explorerTargetDir,
  isExplorerRootNode,
  isProtectedExplorerPath,
  joinProjectRel,
  sanitizeProjectEntryName,
} from "@/apps/forge/helpers/projectExplorerActions";
import { createMemoryVirtualProjectFolder } from "@/apps/forge/virtual/VirtualProjectFolder";

describe("sanitizeProjectEntryName", () => {
  test("rejects empty, traversal, and illegal path characters", () => {
    expect(sanitizeProjectEntryName("")).toBeUndefined();
    expect(sanitizeProjectEntryName("  ")).toBeUndefined();
    expect(sanitizeProjectEntryName(".")).toBeUndefined();
    expect(sanitizeProjectEntryName("..")).toBeUndefined();
    expect(sanitizeProjectEntryName("a/b")).toBeUndefined();
    expect(sanitizeProjectEntryName("a\\b")).toBeUndefined();
    expect(sanitizeProjectEntryName("a:b")).toBeUndefined();
  });

  test("keeps ordinary file and folder names", () => {
    expect(sanitizeProjectEntryName("untitled.txt")).toBe("untitled.txt");
    expect(sanitizeProjectEntryName("New Folder")).toBe("New Folder");
    expect(sanitizeProjectEntryName("k_inc_demo.nss")).toBe("k_inc_demo.nss");
  });
});

describe("explorer target paths", () => {
  test("joinProjectRel handles root and nested folders", () => {
    expect(joinProjectRel("", "foo.nss")).toBe("foo.nss");
    expect(joinProjectRel("scripts", "foo.nss")).toBe("scripts/foo.nss");
  });

  test("files create siblings; folders create children", () => {
    const folder = new FileBrowserNode({
      name: "scripts",
      type: "group",
      data: { relPath: "scripts" },
    });
    const file = new FileBrowserNode({
      name: "k_ai.nss",
      type: "resource",
      data: { relPath: "scripts/k_ai.nss" },
    });
    expect(explorerTargetDir(folder)).toBe("scripts");
    expect(explorerTargetDir(file)).toBe("scripts");
  });

  test("protects workspace root and .forge", () => {
    const root = new FileBrowserNode({
      name: "Project",
      type: "group",
      data: { relPath: "", explorerRoot: true },
    });
    expect(isExplorerRootNode(root)).toBe(true);
    expect(isProtectedExplorerPath(".forge")).toBe(true);
    expect(isProtectedExplorerPath("scripts")).toBe(false);
    expect(explorerCopyRelativePath(root)).toBe("");
  });
});

describe("memory folder removeEntry", () => {
  test("deletes files created in a virtual folder", async () => {
    const folder = createMemoryVirtualProjectFolder("demo");
    const file = await folder.handle.getFileHandle("note.txt", { create: true });
    const stream = await file.createWritable();
    await stream.write(new TextEncoder().encode("hi"));
    await stream.close();
    await folder.handle.removeEntry("note.txt");
    await expect(folder.handle.getFileHandle("note.txt")).rejects.toMatchObject({ name: "NotFoundError" });
  });
});
