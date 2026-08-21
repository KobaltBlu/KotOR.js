import { describe, expect, jest, test } from "@jest/globals";

jest.mock("@/GameState", () => ({
  GameState: {
    NWScript: {
      Load: jest.fn(),
    },
  },
}));

import { GameState } from "@/GameState";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import { DLG_NEIGHBOR_CAP } from "@/apps/forge/dlg/ForgeDLGTypes";
import { buildFocusNeighborhood } from "@/apps/forge/dlg/dlgNeighborhood";
import { locStringPreview, prefetchDlgNodeTexts, resolveDlgLineText } from "@/apps/forge/dlg/dlgLocString";
import { findDlgTreePath, dlgTreeRowId } from "@/apps/forge/dlg/dlgOutline";

function roundTrip(dlg: ForgeDLG): ForgeDLG {
  const buffer = dlg.getExportBuffer();
  return ForgeDLG.fromGFF(new GFFObject(buffer));
}

describe("ForgeDLG", () => {
  test("untitled conversation exports a valid DLG GFF", () => {
    const dlg = ForgeDLG.createUntitled(false);
    const gff = dlg.toGFF();
    expect(gff.FileType.trim()).toBe("DLG");
    expect(gff.RootNode.hasField("EntryList")).toBe(true);
    expect(gff.RootNode.hasField("ReplyList")).toBe(true);
    expect(gff.RootNode.hasField("StartingList")).toBe(true);
    const buffer = gff.getExportBuffer();
    expect(buffer.length).toBeGreaterThan(GFFObject.HEADER_SIZE);
    const again = ForgeDLG.fromBuffer(buffer);
    expect(again.entries.length).toBe(1);
    expect(again.replies.length).toBe(1);
    expect(again.startingLinks.length).toBe(1);
    expect(again.startingLinks[0].targetId).toBe(again.entries[0].id);
    expect(again.entries[0].links[0].targetId).toBe(again.replies[0].id);
  });

  test("round-trips locstrings, scripts as resrefs, links, shared IsChild, and K2 extras", () => {
    const dlg = ForgeDLG.createUntitled(true);
    const entry = dlg.entries[0];
    const reply = dlg.replies[0];
    const loc = new CExoLocString(42);
    loc.addSubString("Override line", 0);
    entry.text = loc;
    entry.comment = "npc comment";
    entry.speaker = "bastila";
    entry.script = "k_act_talk";
    entry.script2 = "k_act_talk2";
    entry.k2Present = true;
    entry.emotion = 3;
    entry.alienRaceNode = 2;
    entry.waitFlags = 0x1a;
    entry.fadeColor = { r: 0.1, g: 0.2, b: 0.3 };
    entry.voResRef = "n_bastila01";
    reply.text = new CExoLocString(-1);
    reply.text.addSubString("Player answer", 0);
    const extra = dlg.addEntry();
    extra.text.addSubString("Shared target parent", 0);
    dlg.addLink(extra.id, reply.id);
    dlg.restampIsChild();
    expect(reply.isChild).toBe(1);

    const again = roundTrip(dlg);
    expect((GameState.NWScript.Load as jest.Mock)).not.toHaveBeenCalled();
    const e0 = again.entries[0];
    expect(e0.text.RESREF).toBe(42);
    expect(locStringPreview(e0.text)).toBe("Override line");
    expect(e0.comment).toBe("npc comment");
    expect(e0.speaker).toBe("bastila");
    expect(e0.script).toBe("k_act_talk");
    expect(e0.script2).toBe("k_act_talk2");
    expect(e0.emotion).toBe(3);
    expect(e0.alienRaceNode).toBe(2);
    expect(e0.waitFlags).toBe(0x1a);
    expect(e0.fadeColor.r).toBeCloseTo(0.1, 5);
    expect(e0.voResRef).toBe("n_bastila01");
    const shared = again.replies[0];
    expect(locStringPreview(shared.text)).toBe("Player answer");
    expect(again.inboundCount(shared.id)).toBeGreaterThan(1);
    expect(shared.isChild).toBe(1);
    expect((GameState.NWScript.Load as jest.Mock)).not.toHaveBeenCalled();
  });

  test("SoundExists is inferred from VO, Sound, and alien race on save", () => {
    const dlg = ForgeDLG.createUntitled(true);
    dlg.alienRaceOwner = 4;
    const silent = dlg.entries[0];
    silent.speaker = "bastila";
    silent.soundExists = 0xff;
    const voiced = dlg.addEntry();
    voiced.voResRef = "n_bastila01";
    voiced.soundExists = 0;
    const sfx = dlg.addEntry();
    sfx.sound = "al_en_spark";
    const alien = dlg.addEntry();
    alien.speaker = "";
    alien.alienRaceNode = 2;
    const ownerAlien = dlg.addEntry();
    ownerAlien.speaker = "";
    ownerAlien.alienRaceNode = 0;
    const taggedNoRace = dlg.addEntry();
    taggedNoRace.speaker = "carth";
    taggedNoRace.alienRaceNode = 0;

    const again = roundTrip(dlg);
    expect(again.entries[0].soundExists).toBe(0);
    expect(again.entries.find((n) => n.voResRef === "n_bastila01")?.soundExists).toBe(0x80);
    expect(again.entries.find((n) => n.sound === "al_en_spark")?.soundExists).toBe(0x80);
    expect(again.entries.find((n) => n.alienRaceNode === 2)?.soundExists).toBe(0x83);
    expect(again.entries.find((n) => !n.speaker && !n.voResRef && !n.sound && n.alienRaceNode === 0)?.soundExists).toBe(0x83);
    expect(again.entries.find((n) => n.speaker === "carth")?.soundExists).toBe(0);
  });

  test("insert and delete remaps GFF indexes without retargeting ids", () => {
    const dlg = ForgeDLG.createUntitled(false);
    const r0 = dlg.replies[0];
    const r1 = dlg.addReply();
    const r2 = dlg.addReply();
    r1.text.addSubString("middle", 0);
    r2.text.addSubString("keep me", 0);
    dlg.entries[0].links = [];
    dlg.addLink(dlg.entries[0].id, r2.id);
    const keepId = r2.id;
    dlg.deleteNode(r0.id);
    const exported = dlg.toGFF();
    const replies = exported.RootNode.getFieldByLabel("ReplyList").getChildStructs();
    expect(replies.length).toBe(2);
    const entry = exported.RootNode.getFieldByLabel("EntryList").getChildStructs()[0];
    const linkIndex = entry.getFieldByLabel("RepliesList").getChildStructs()[0].getFieldByLabel("Index").getValue();
    expect(linkIndex).toBe(1);
    const again = ForgeDLG.fromGFF(exported);
    expect(again.entries[0].links[0].targetId).toBe(again.replies[1].id);
    expect(locStringPreview(again.getNode(again.entries[0].links[0].targetId)?.text)).toBe("keep me");
    expect(dlg.getNode(keepId)).toBeDefined();
  });

  test("focus neighborhood stays bounded on a large DAG", () => {
    const dlg = new ForgeDLG();
    const hub = dlg.addReply();
    for (let i = 0; i < 80; i++) {
      const entry = dlg.addEntry();
      dlg.addLink(entry.id, hub.id);
    }
    const neighborhood = buildFocusNeighborhood(dlg, hub.id);
    expect(neighborhood.inbound.length).toBe(DLG_NEIGHBOR_CAP);
    expect(neighborhood.inboundHidden).toBe(80 - DLG_NEIGHBOR_CAP);
    expect(neighborhood.inboundTotal).toBe(80);
    expect(neighborhood.inbound.length + 1).toBeLessThan(90);
  });

  test("opening a DLG with script fields does not load NWScript", () => {
    (GameState.NWScript.Load as jest.Mock).mockClear();
    const gff = new GFFObject();
    gff.FileType = "DLG ";
    gff.RootNode.type = -1;
    const entries = new GFFField(GFFDataType.LIST, "EntryList");
    const node = new GFFStruct(0);
    node.addField(new GFFField(GFFDataType.RESREF, "Script", "k_inc_generic"));
    node.addField(new GFFField(GFFDataType.CEXOLOCSTRING, "Text", new CExoLocString(-1)));
    const repliesList = new GFFField(GFFDataType.LIST, "RepliesList");
    node.addField(repliesList);
    entries.addChildStruct(node);
    gff.RootNode.addField(entries);
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, "ReplyList"));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, "StartingList"));
    const dlg = ForgeDLG.fromGFF(gff);
    expect(dlg.entries[0].script).toBe("k_inc_generic");
    expect((GameState.NWScript.Load as jest.Mock)).not.toHaveBeenCalled();
  });

  test("prefetches TLK dialog text for every node without flattening locstrings", () => {
    const dlg = ForgeDLG.createUntitled(false);
    dlg.entries[0].text = new CExoLocString(101);
    dlg.replies[0].text = new CExoLocString(-1);
    dlg.replies[0].text.addSubString("Local reply", 0);
    const lookup = (id: number) => (id === 101 ? "Prefetched NPC line" : undefined);
    const texts = prefetchDlgNodeTexts(dlg, lookup);
    expect(texts.get(dlg.entries[0].id)).toBe("Prefetched NPC line");
    expect(texts.get(dlg.replies[0].id)).toBe("Local reply");
    expect(resolveDlgLineText(dlg.entries[0].text, lookup)).toBe("Prefetched NPC line");
    expect(locStringPreview(dlg.entries[0].text)).toBe("{StrRef 101}");
  });

  test("reorders outbound links without changing targets", () => {
    const dlg = ForgeDLG.createUntitled(false);
    const entry = dlg.entries[0];
    const first = entry.links[0];
    const secondReply = dlg.addReply();
    const second = dlg.addLink(entry.id, secondReply.id);
    expect(second).toBeDefined();
    expect(entry.links.map((l) => l.targetId)).toEqual([first.targetId, secondReply.id]);
    expect(dlg.reorderLink(entry.id, second!.id, -1)).toBe(true);
    expect(entry.links.map((l) => l.targetId)).toEqual([secondReply.id, first.targetId]);
  });

  test("finds a starting-list path to a nested reply for the tree view", () => {
    const dlg = ForgeDLG.createUntitled(false);
    const entry = dlg.entries[0];
    const reply = dlg.replies[0];
    const path = findDlgTreePath(dlg, reply.id);
    expect(path[0]).toBe(dlgTreeRowId("start", dlg.startingLinks[0].id, entry.id));
    expect(path[1]).toBe(dlgTreeRowId(entry.id, entry.links[0].id, reply.id));
    expect(findDlgTreePath(dlg, "root")).toEqual([]);
  });
});
