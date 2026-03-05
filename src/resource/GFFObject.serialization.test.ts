import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";

describe("GFFObject serialization", () => {
  function buildSampleGff(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.setType(12345);

    gff.addField(new GFFField(GFFDataType.CEXOSTRING, "Tag", "forge_test"));
    gff.addField(new GFFField(GFFDataType.INT, "HitPoints", 99));
    gff.addField(new GFFField(GFFDataType.VECTOR, "Position", { x: 1, y: 2, z: 3 }));

    const inventory = new GFFField(GFFDataType.LIST, "Inventory");
    const itemStruct = new GFFStruct(7);
    itemStruct.addField(new GFFField(GFFDataType.CEXOSTRING, "ResRef", "g_w_blstrrfl001"));
    inventory.addChildStruct(itemStruct);
    gff.addField(inventory);

    return gff;
  }

  it("round-trips through JSON object serialization", () => {
    const original = buildSampleGff();
    const json = original.toJSON();

    const restored = new GFFObject();
    restored.fromJSON(json);

    expect(restored.RootNode.getType()).toBe(12345);
    expect(restored.RootNode.getFieldByLabel("Tag")?.getValue()).toBe("forge_test");
    expect(restored.RootNode.getFieldByLabel("HitPoints")?.getValue()).toBe(99);
    expect(restored.RootNode.getFieldByLabel("Position")?.getVector()).toEqual({ x: 1, y: 2, z: 3 });

    const invField = restored.RootNode.getFieldByLabel("Inventory");
    expect(invField?.getChildStructs().length).toBe(1);
    expect(invField?.getChildStructs()[0].getFieldByLabel("ResRef")?.getValue()).toBe("g_w_blstrrfl001");
  });

  it("round-trips through XML serialization", () => {
    const original = buildSampleGff();
    const xml = original.toXML();

    const restored = new GFFObject();
    restored.fromXML(xml);

    expect(restored.RootNode.getType()).toBe(12345);
    expect(restored.RootNode.getFieldByLabel("Tag")?.getValue()).toBe("forge_test");
    expect(restored.RootNode.getFieldByLabel("HitPoints")?.getValue()).toBe(99);
  });
});
