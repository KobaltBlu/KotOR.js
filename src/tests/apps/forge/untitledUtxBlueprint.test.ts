import { describe, expect, test, jest } from "@jest/globals";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFObject } from "@/resource/GFFObject";
import { pathParse } from "@/apps/forge/helpers/PathParse";

jest.mock("@/apps/forge/KotOR", () => {
  const { GFFObject } = jest.requireActual("@/resource/GFFObject") as typeof import("@/resource/GFFObject");
  const { GFFField } = jest.requireActual("@/resource/GFFField") as typeof import("@/resource/GFFField");
  const { GFFStruct } = jest.requireActual("@/resource/GFFStruct") as typeof import("@/resource/GFFStruct");
  const { GFFDataType } = jest.requireActual("@/enums/resource/GFFDataType") as typeof import("@/enums/resource/GFFDataType");
  const { CExoLocString } = jest.requireActual("@/resource/CExoLocString") as typeof import("@/resource/CExoLocString");
  const { ApplicationProfile } = jest.requireActual("@/utility/ApplicationProfile") as typeof import("@/utility/ApplicationProfile");
  const { GameEngineType } = jest.requireActual("@/enums/engine/GameEngineType") as typeof import("@/enums/engine/GameEngineType");
  const { ModuleCreatureArmorSlot } = jest.requireActual("@/enums/module/ModuleCreatureArmorSlot") as typeof import("@/enums/module/ModuleCreatureArmorSlot");
  const { ResourceTypes } = jest.requireActual("@/resource/ResourceTypes") as typeof import("@/resource/ResourceTypes");
  return {
    GFFObject,
    GFFField,
    GFFStruct,
    GFFDataType,
    CExoLocString,
    ApplicationProfile,
    GameEngineType,
    ModuleCreatureArmorSlot,
    ResourceTypes,
  };
});

import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import { ForgeCreature } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { ForgeItem } from "@/apps/forge/module-editor/ForgeItem";
import { ForgeStore } from "@/apps/forge/module-editor/ForgeStore";
import { ForgeSound } from "@/apps/forge/module-editor/ForgeSound";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";

function labels(gff: GFFObject): string[] {
  return gff.RootNode.fields.map((f) => f.label);
}

describe("GFFObject empty buffers", () => {
  test("does not throw on an empty buffer and keeps RootNode", () => {
    const gff = new GFFObject(new Uint8Array(0));
    expect(gff.RootNode).toBeDefined();
    expect(gff.RootNode.getType()).toBe(-1);
  });

  test("does not throw on a short buffer", () => {
    const gff = new GFFObject(new Uint8Array(16));
    expect(gff.RootNode).toBeDefined();
  });
});

describe("untitled paths", () => {
  test("pathParse(null) does not throw", () => {
    const parsed = pathParse(null);
    expect(parsed.dir).toBe("");
    expect(parsed.base).toBe("");
  });
});

describe("blank UT* blueprints", () => {
  test("ForgePlaceable empty buffer is a pipeline UTP", () => {
    const placeable = new ForgePlaceable(new Uint8Array(0), "new_placeable");
    const gff = placeable.blueprint;
    expect(gff.FileType).toBe("UTP ");
    expect(gff.RootNode.getFieldByLabel("TemplateResRef")?.getValue()).toBe("new_placeable");
    expect(gff.RootNode.getFieldByLabel("HP")?.getType()).toBe(GFFDataType.SHORT);
    expect(gff.RootNode.getFieldByLabel("CurrentHP")?.getType()).toBe(GFFDataType.SHORT);
    expect(gff.RootNode.hasField("Portrait")).toBe(true);
    expect(gff.RootNode.hasField("Invulnerable")).toBe(false);
    expect(gff.RootNode.hasField("ItemList")).toBe(false);
    expect(gff.RootNode.hasField("OnClick")).toBe(false);
    expect(gff.RootNode.hasField("ObjectId")).toBe(false);
    expect(gff.RootNode.hasField("ActionList")).toBe(false);
  });

  test("other UT* blank FileTypes match retail templates", () => {
    expect(new ForgeCreature(undefined, "new_creature").blueprint.FileType).toBe("UTC ");
    expect(new ForgeDoor(undefined, "new_door").blueprint.FileType).toBe("UTD ");
    expect(new ForgeEncounter(undefined, "new_encounter").blueprint.FileType).toBe("UTE ");
    expect(new ForgeItem(undefined, "new_item").blueprint.FileType).toBe("UTI ");
    expect(new ForgeStore(undefined, "new_store").blueprint.FileType).toBe("UTM ");
    expect(new ForgeSound(undefined, "new_sound").blueprint.FileType).toBe("UTS ");
    expect(new ForgeTrigger(undefined, "new_trigger").blueprint.FileType).toBe("UTT ");
    expect(new ForgeWaypoint(undefined, "new_waypoint").blueprint.FileType).toBe("UTW ");
  });

  test("UTC uses PaletteID and ScriptDialogue, not Aurora leftovers", () => {
    const utc = new ForgeCreature(undefined, "new_creature").blueprint;
    expect(utc.RootNode.hasField("PaletteID")).toBe(true);
    expect(utc.RootNode.hasField("PalletID")).toBe(false);
    expect(utc.RootNode.hasField("ScriptDialogue")).toBe(true);
    expect(utc.RootNode.hasField("ScriptEndDialogu")).toBe(true);
    expect(utc.RootNode.hasField("SaveFortitude")).toBe(false);
    expect(labels(utc)).toContain("TemplateResRef");
  });

  test("UTD includes LinkedTo/Portrait; UTT uses ScriptHeartbeat labels", () => {
    const utd = new ForgeDoor(undefined, "new_door").blueprint;
    expect(utd.RootNode.hasField("LinkedTo")).toBe(true);
    expect(utd.RootNode.hasField("LinkedToFlags")).toBe(true);
    expect(utd.RootNode.hasField("Portrait")).toBe(true);

    const utt = new ForgeTrigger(undefined, "new_trigger").blueprint;
    expect(utt.RootNode.hasField("ScriptHeartbeat")).toBe(true);
    expect(utt.RootNode.hasField("ScriptUserDefine")).toBe(true);
    expect(utt.RootNode.getFieldByLabel("TrapDetectDC")?.getType()).toBe(GFFDataType.BYTE);
    expect(utt.RootNode.getFieldByLabel("Tag")?.getType()).toBe(GFFDataType.CEXOSTRING);
  });
});
