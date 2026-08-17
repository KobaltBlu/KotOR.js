import { describe, expect, test } from "@jest/globals";
import {
  editorFileProjectRelativePath,
  remapProjectRelativeAfterRename,
} from "@/apps/forge/helpers/editorFileProjectPath";

describe("editorFileProjectRelativePath", () => {
  test("returns the project-relative path for OPFS / project explorer files", () => {
    expect(editorFileProjectRelativePath({
      useProjectFileSystem: true,
      path: "scripts/k_ai.nss",
    })).toBe("scripts/k_ai.nss");
    expect(editorFileProjectRelativePath({
      useProjectFileSystem: true,
      path: "file://project.dir/dialogs/test.dlg",
    })).toBe("dialogs/test.dlg");
    expect(editorFileProjectRelativePath({
      useProjectFileSystem: true,
      path: "project.dir/.forge/settings.json",
    })).toBe(".forge/settings.json");
  });

  test("does not treat local or archive files as project saves", () => {
    expect(editorFileProjectRelativePath({
      path: "scripts/k_ai.nss",
    })).toBeUndefined();
    expect(editorFileProjectRelativePath({
      useProjectFileSystem: true,
      path: "scripts/k_ai.nss",
      archive_path: "modules/end_m01aa.rim",
    })).toBeUndefined();
    expect(editorFileProjectRelativePath(undefined)).toBeUndefined();
  });
});

describe("remapProjectRelativeAfterRename", () => {
  test("retargets an open file whose path matches the renamed resource", () => {
    expect(remapProjectRelativeAfterRename(
      "scripts/k_ai.nss",
      "scripts/k_ai.nss",
      "scripts/k_foo.nss",
    )).toBe("scripts/k_foo.nss");
    expect(remapProjectRelativeAfterRename(
      "SCRIPTS/K_AI.NSS",
      "scripts/k_ai.nss",
      "scripts/k_foo.nss",
    )).toBe("scripts/k_foo.nss");
  });

  test("retargets files inside a renamed folder without matching a similar prefix", () => {
    expect(remapProjectRelativeAfterRename("scripts/k_ai.nss", "scripts", "code")).toBe("code/k_ai.nss");
    expect(remapProjectRelativeAfterRename("scripts/sub/a.nss", "scripts", "code")).toBe("code/sub/a.nss");
    expect(remapProjectRelativeAfterRename("scripts_extra/a.nss", "scripts", "code")).toBeUndefined();
    expect(remapProjectRelativeAfterRename("dialogs/test.dlg", "scripts/k_ai.nss", "scripts/k_foo.nss")).toBeUndefined();
  });
});

