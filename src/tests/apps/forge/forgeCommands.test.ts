import { describe, expect, test, beforeEach } from "@jest/globals";
import {
  commandsMatchingQuery,
  executeCommand,
  getCommand,
  getCommands,
  isCommandEnabled,
  registerCommand,
  resetForgeCommands,
} from "@/apps/forge/commands/forgeCommands";
import { parseKeybinding, formatKeybinding, eventMatchesKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { tabCanCompile, tabCanOpenAsGff, tabCanSave } from "@/apps/forge/commands/editorCommandGuards";
import {
  buildOpenRecentMenuItems,
  mapRecentFilesToMenuItems,
  mapRecentProjectsToMenuItems,
  truncatePath,
} from "@/apps/forge/commands/recentMenuItems";

describe("forgeCommands registry", () => {
  beforeEach(() => {
    resetForgeCommands();
  });

  test("registerCommand stores and retrieves by id", () => {
    registerCommand({
      id: "test.hello",
      title: "Hello",
      category: "File",
      keywords: ["greet"],
      run: () => undefined,
    });
    expect(getCommand("test.hello")?.title).toBe("Hello");
    expect(getCommands().map((c) => c.id)).toEqual(["test.hello"]);
  });

  test("commandsMatchingQuery matches title, id, and keywords", () => {
    registerCommand({
      id: "forge.file.save",
      title: "Save",
      category: "File",
      keywords: ["write", "disk"],
      run: () => undefined,
    });
    registerCommand({
      id: "forge.view.palette",
      title: "Command Palette...",
      category: "View",
      palette: false,
      run: () => undefined,
    });
    expect(commandsMatchingQuery("save").map((c) => c.id)).toEqual(["forge.file.save"]);
    expect(commandsMatchingQuery("disk").map((c) => c.id)).toEqual(["forge.file.save"]);
    expect(commandsMatchingQuery("palette").map((c) => c.id)).toEqual([]);
  });

  test("executeCommand respects when() gating", async () => {
    let ran = false;
    registerCommand({
      id: "forge.project.compile",
      title: "Compile This Script",
      category: "Project",
      when: () => false,
      run: () => {
        ran = true;
      },
    });
    expect(isCommandEnabled("forge.project.compile")).toBe(false);
    expect(await executeCommand("forge.project.compile")).toBe(false);
    expect(ran).toBe(false);

    resetForgeCommands();
    registerCommand({
      id: "forge.project.compile",
      title: "Compile This Script",
      category: "Project",
      when: () => true,
      run: () => {
        ran = true;
      },
    });
    expect(await executeCommand("forge.project.compile")).toBe(true);
    expect(ran).toBe(true);
  });
});

describe("editorCommandGuards", () => {
  test("tabCanCompile is false for a base TabState-like tab", () => {
    expect(tabCanCompile({ canCompile: false })).toBe(false);
    expect(tabCanCompile(undefined)).toBe(false);
    expect(tabCanCompile(null)).toBe(false);
  });

  test("tabCanCompile is true only when canCompile is true", () => {
    expect(tabCanCompile({ canCompile: true })).toBe(true);
  });

  test("tabCanSave requires a file", () => {
    expect(tabCanSave({})).toBe(false);
    expect(tabCanSave({ file: { resref: "untitled" } })).toBe(true);
  });

  test("tabCanOpenAsGff is true for UTx templates", () => {
    expect(tabCanOpenAsGff({ type: "TabUTCEditorState" })).toBe(true);
    expect(tabCanOpenAsGff({ file: { ext: "utp" } })).toBe(true);
    expect(tabCanOpenAsGff({ file: { ext: ".UTI" } })).toBe(true);
    expect(tabCanOpenAsGff({ type: "TabTextEditorState", file: { ext: "nss" } })).toBe(false);
    expect(tabCanOpenAsGff(undefined)).toBe(false);
    expect(tabCanOpenAsGff(null)).toBe(false);
  });
});

describe("recent menu mapping", () => {
  test("truncatePath ellipsizes long paths from the start", () => {
    expect(truncatePath("short", 48)).toBe("short");
    expect(truncatePath("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKL", 16)).toBe("…789ABCDEFGHIJKL");
  });

  test("recent files become sibling rows, not children of a header", () => {
    const items = mapRecentFilesToMenuItems(
      [
        { getFilename: () => "a.nss", getPrettyPath: () => "/mods/a.nss" },
        { getFilename: () => "b.utc", getPrettyPath: () => "/blueprints/b.utc" },
      ],
      () => undefined,
    );
    expect(items.every((item) => !item.header && !item.children)).toBe(true);
    expect(items.map((item) => item.label)).toEqual(["a.nss", "b.utc"]);
    expect(items[0].detail).toBe("/mods/a.nss");
  });

  test("Open Recent uses headers plus sibling project/file items", () => {
    const items = buildOpenRecentMenuItems({
      projects: [{ getDisplayName: () => "My Mod", path: "/games/mymod" }],
      files: [{ getFilename: () => "k_inc.nss", getPrettyPath: () => "scripts/k_inc.nss" }],
      onOpenProject: () => undefined,
      onOpenFile: () => undefined,
      onClear: () => undefined,
    });
    expect(items[0]).toEqual(expect.objectContaining({ header: true, label: "Recent Projects" }));
    expect(items[1].label).toBe("My Mod");
    expect(items[1].header).toBeUndefined();
    expect(items[1].children).toBeUndefined();
    const filesHeader = items.find((item) => item.header && item.label === "Recent Files");
    expect(filesHeader).toBeTruthy();
    const fileRow = items.find((item) => item.label === "k_inc.nss");
    expect(fileRow?.detail).toBe("scripts/k_inc.nss");
    expect(fileRow?.children).toBeUndefined();
  });

  test("recent projects map display name and path as siblings", () => {
    const items = mapRecentProjectsToMenuItems(
      [{ getDisplayName: () => "Endar Spire", path: "C:/kotor/endar" }],
      () => undefined,
    );
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Endar Spire");
    expect(items[0].header).toBeUndefined();
  });
});

describe("forgeKeybindings", () => {
  test("parseKeybinding expands Mod+Shift+P", () => {
    expect(parseKeybinding("Mod+Shift+P")).toEqual({
      mod: true,
      shift: true,
      alt: false,
      key: "p",
    });
  });

  test("formatKeybinding replaces Mod with Ctrl or Cmd", () => {
    const formatted = formatKeybinding("Mod+S") || "";
    expect(formatted === "Ctrl+S" || formatted === "Cmd+S").toBe(true);
  });

  test("eventMatchesKeybinding matches Ctrl+Shift+B", () => {
    const event = {
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      altKey: false,
      key: "b",
      code: "KeyB",
    } as KeyboardEvent;
    expect(eventMatchesKeybinding(event, "Mod+Shift+B")).toBe(true);
    expect(eventMatchesKeybinding(event, "Mod+B")).toBe(false);
  });
});
