/**
 * @jest-environment node
 *
 * Retail SaveCreature writes every CSWVisibilityNode's ObjectId +
 * PerceptionData verbatim. Unresolved / PLAYER_ID heard-only nodes must survive
 * the same GFF write path used by ModuleCreature.save.
 *
 * initPerceptionList source retention is asserted in scripts/verify-k1-save-format.ts
 * (ModuleObject import graph is too heavy for a direct unit test here).
 */
import { describe, expect, it } from "@jest/globals";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import type { IPerceptionInfo } from "@/interface/engine/IPerceptionInfo";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";

/** Mirrors ModuleCreature.save PerceptionList serialization. */
function savePerceptionList(list: IPerceptionInfo[]): GFFObject {
  const gff = new GFFObject();
  const perceptionList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, "PerceptionList"));
  for(let i = 0; i < list.length; i++){
    const percept = list[i];
    const perceptionStruct = new GFFStruct();
    perceptionStruct.addField(new GFFField(GFFDataType.DWORD, "ObjectId")).setValue(percept.objectId);
    perceptionStruct.addField(new GFFField(GFFDataType.BYTE, "PerceptionData")).setValue(percept.data & 0xFF);
    perceptionList.addChildStruct(perceptionStruct);
  }
  return gff;
}

/**
 * Mirrors ModuleObject.initPerceptionList retention: resolve when possible,
 * never splice unresolved nodes (retail SaveCreature round-trip).
 */
function initPerceptionListRetain(
  list: IPerceptionInfo[],
  getObjectById: (id: number) => IPerceptionInfo["object"]
): void {
  let length = list.length;
  while(length--){
    const perceptionObject = list[length];
    if(perceptionObject){
      if(typeof perceptionObject.object == "undefined" && perceptionObject.objectId){
        const resolved = getObjectById(perceptionObject.objectId);
        if(resolved){
          perceptionObject.object = resolved;
        }
        // else leave object undefined; keep objectId/data for save round-trip
      }
    }
  }
}

describe("PerceptionList unresolved node round-trip", () => {
  it("retains PLAYER_ID and stale heard-only nodes then re-serializes them", () => {
    const list: IPerceptionInfo[] = [
      {
        object: undefined,
        objectId: ModuleObjectConstant.PLAYER_ID,
        data: PerceptionMask.HEARD,
      },
      {
        object: undefined,
        objectId: 284,
        data: PerceptionMask.HEARD,
      },
    ];

    initPerceptionListRetain(list, () => undefined);

    expect(list).toHaveLength(2);
    expect(list[0].object).toBeUndefined();
    expect(list[0].objectId).toBe(ModuleObjectConstant.PLAYER_ID);
    expect(list[1].objectId).toBe(284);

    const reloaded = new GFFObject(savePerceptionList(list).getExportBuffer());
    const kids = reloaded.RootNode.getFieldByLabel("PerceptionList").getChildStructs();
    expect(kids).toHaveLength(2);
    expect(kids[0].getFieldByLabel("ObjectId").getValue()).toBe(ModuleObjectConstant.PLAYER_ID);
    expect(kids[0].getFieldByLabel("PerceptionData").getValue()).toBe(PerceptionMask.HEARD);
    expect(kids[1].getFieldByLabel("ObjectId").getValue()).toBe(284);
    expect(kids[1].getFieldByLabel("PerceptionData").getValue()).toBe(PerceptionMask.HEARD);
  });
});
