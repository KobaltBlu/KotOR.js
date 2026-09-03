import { describe, expect, test } from "@jest/globals";
import { RecentProject } from "@/apps/forge/RecentProject";
import {
  DEFAULT_VIRTUAL_PROJECT_NAME,
  OPFS_VIRTUAL_PROJECTS_DIR,
  createMemoryVirtualProjectFolder,
  createOrOpenVirtualProjectFolder,
  hasProjectRoot,
  sanitizeVirtualProjectName,
} from "@/apps/forge/virtual/VirtualProjectFolder";
import { mapRecentProjectsToMenuItems } from "@/apps/forge/commands/recentMenuItems";

describe("virtual project folder names", () => {
  test("sanitizes path characters and falls back to untitled-project", () => {
    expect(sanitizeVirtualProjectName("")).toBe(DEFAULT_VIRTUAL_PROJECT_NAME);
    expect(sanitizeVirtualProjectName("   ")).toBe(DEFAULT_VIRTUAL_PROJECT_NAME);
    expect(sanitizeVirtualProjectName("..")).toBe(DEFAULT_VIRTUAL_PROJECT_NAME);
    expect(sanitizeVirtualProjectName("a/b\\c:*?\"<>|")).toBe("abc");
    expect(sanitizeVirtualProjectName("  My Module  ")).toBe("My Module");
  });

  test("OPFS projects live under forge-virtual-projects", () => {
    const name = sanitizeVirtualProjectName("Endar Spire");
    expect(OPFS_VIRTUAL_PROJECTS_DIR).toBe("forge-virtual-projects");
    expect(`${OPFS_VIRTUAL_PROJECTS_DIR}/${name}`).toBe("forge-virtual-projects/Endar Spire");
  });
});

describe("in-memory virtual folder", () => {
  test("mkdir, writeFile, readFile, and readdir round-trip", async () => {
    const folder = createMemoryVirtualProjectFolder("demo");
    expect(folder.backend).toBe("memory");
    expect(folder.name).toBe("demo");
    expect(hasProjectRoot(undefined, folder.handle)).toBe(true);

    const scripts = await folder.handle.getDirectoryHandle("scripts", { create: true });
    const fileHandle = await scripts.getFileHandle("k_inc_demo.nss", { create: true });
    const writable = await fileHandle.createWritable();
    const source = new TextEncoder().encode("#include \"k_inc_generic\"\nvoid main() {}\n");
    await writable.write(source);
    await writable.close();

    const names: string[] = [];
    for await (const entry of folder.handle.values()) {
      names.push(entry.name);
    }
    expect(names).toEqual(["scripts"]);

    const readHandle = await scripts.getFileHandle("k_inc_demo.nss");
    const file = await readHandle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  test("createOrOpen falls back to memory when OPFS is unavailable", async () => {
    const folder = await createOrOpenVirtualProjectFolder("bad/name");
    expect(folder.backend).toBe("memory");
    expect(folder.name).toBe("badname");
  });
});

describe("project root and recent virtual identifier", () => {
  test("hasProjectRoot requires a path or directory handle", () => {
    expect(hasProjectRoot(undefined, undefined)).toBe(false);
    expect(hasProjectRoot("", undefined)).toBe(false);
    expect(hasProjectRoot("/mods/my-project", undefined)).toBe(true);
    const folder = createMemoryVirtualProjectFolder("rooted");
    expect(hasProjectRoot(undefined, folder.handle)).toBe(true);
  });

  test("virtual RecentProject uses the folder name as its identifier", () => {
    const recent = RecentProject.From({ name: "demo", virtual: true });
    expect(recent.virtual).toBe(true);
    expect(recent.getIdentifier()).toBe("demo");
    expect(recent.getDisplayName()).toBe("demo (virtual)");
  });

  test("recent menu marks virtual projects without a disk path", () => {
    const items = mapRecentProjectsToMenuItems(
      [{ getDisplayName: () => "demo (virtual)", virtual: true }],
      () => undefined,
    );
    expect(items[0].label).toBe("demo (virtual)");
    expect(items[0].detail).toBe("Virtual folder");
  });
});
