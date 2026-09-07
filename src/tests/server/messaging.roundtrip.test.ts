/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { OdysseyServerMessage } from "@/server/message/OdysseyServerMessage";
import { OdysseyClientMessage } from "@/server/message/OdysseyClientMessage";
import { OdysseyMessage } from "@/server/message/OdysseyMessage";
import { MemoryMessageTransport } from "@/server/message/transport";
import { writeLocString, readLocString } from "@/server/message/loc-string";
import {
  writeWorkRemainingCategory,
  writeCreatureDeleteCategory,
  writeObjectId,
} from "@/server/message/payload/game-obj-update";
import { PlayerServerMessageId } from "@/enums/server/message/PlayerServerMessageId";
import {
  AmbientMessageMinor,
  CameraMessageMinor,
  CustomTokenMessageMinor,
  GameObjUpdateMessageMinor,
  InputMessageMinor,
  MapPinMessageMinor,
  SafeProjectileMessageMinor,
} from "@/enums/server/message/MessageMinors";

describe("CS messaging round-trips", () => {
  it("Camera SetMode server→client", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let parsed: Record<string, unknown> | undefined;
    client.onParsed = (info) => {
      parsed = info.payload;
    };

    expect(server.sendServerToPlayerCamera_SetMode(1, 3)).toBe(true);
    const pkt = transport.toPlayer[0].message;
    expect(pkt[1]).toBe(PlayerServerMessageId.Camera);
    expect(pkt[2]).toBe(CameraMessageMinor.SetMode);
    expect(client.handleServerToPlayerMessage(pkt)).toBe(1);
    expect(parsed).toEqual({ mode: 3 });
  });

  it("Input Attack client→server", () => {
    const transport = new MemoryMessageTransport();
    const client = new OdysseyClientMessage(transport);
    const server = new OdysseyServerMessage();
    let parsed: Record<string, unknown> | undefined;
    server.onParsed = (info) => {
      parsed = info.payload;
    };

    expect(client.sendPlayerToServerInput_Attack(0x1234, 7)).toBe(true);
    const pkt = transport.toServer[0];
    expect(pkt[2]).toBe(InputMessageMinor.Attack);
    expect(server.handlePlayerToServerMessage(1, pkt)).toBe(1);
    expect(parsed?.objectId).toBe(0x1234);
    expect(parsed?.word).toBe(7);
  });

  it("CCMessage case 0x12 encodes attacker/target ints", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    expect(
      server.sendServerToPlayerCCMessage(1, 0x12, {
        objectIds: [10, 20],
        integers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 0, 1],
      })
    ).toBe(true);
    expect(transport.toPlayer[0].message[2]).toBe(0x12);
  });

  it("unknown major returns 0", () => {
    const client = new OdysseyClientMessage();
    expect(client.handleServerToPlayerMessage(new Uint8Array([0x50, 0xfe, 0x01]))).toBe(0);
  });

  it("GameObjUpdate ObjControl uses minor 2", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let parsed: Record<string, unknown> | undefined;
    client.onParsed = (info) => {
      parsed = info.payload;
    };

    server.sendServerToPlayerGameObjUpdate_ObjControl(1, 0x55);
    const pkt = transport.toPlayer[0].message;
    expect(pkt[2]).toBe(GameObjUpdateMessageMinor.ObjControl);
    expect(pkt[2]).toBe(2);
    expect(client.handleServerToPlayerMessage(pkt)).toBe(1);
    expect(parsed?.objectId).toBe(0x80000055);
  });

  it("GameObjUpdate VisEffect uses minor 3", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    server.sendServerToPlayerGameObjUpdateVisEffect(1, {
      objectId: 10,
      vfxId: 42,
      pos: { x: 1, y: 2, z: 3 },
    });
    expect(transport.toPlayer[0].message[2]).toBe(GameObjUpdateMessageMinor.VisEffect);
    expect(transport.toPlayer[0].message[2]).toBe(3);
  });

  it("GameObjUpdate DestroyItem uses minor 7", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    server.sendServerPlayerItemUpdate_DestroyItem(1, 99);
    expect(transport.toPlayer[0].message[2]).toBe(GameObjUpdateMessageMinor.DestroyItem);
  });

  it("GameObjUpdate category stream W and D", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let events: unknown;
    client.onParsed = (info) => {
      events = info.payload.events;
    };

    const w = new OdysseyMessage();
    w.createWriteMessage(64);
    writeWorkRemainingCategory(w, 3, 10);
    writeCreatureDeleteCategory(w, (id) => writeObjectId(w, id), {
      objectId: 7,
      bool0: true,
      bool1: false,
      dword0: 100,
      bool2: false,
    });
    const { buffer, size } = w.getWriteMessage();
    server.sendServerToPlayerGameObjUpdate(1, buffer.subarray(3, size));
    const pkt = transport.toPlayer[0].message;
    expect(pkt[2]).toBe(GameObjUpdateMessageMinor.Update);
    expect(client.handleServerToPlayerMessage(pkt)).toBe(1);
    expect(Array.isArray(events)).toBe(true);
    expect((events as { category: string }[])[0].category).toBe("W");
    expect((events as { category: string }[])[1].category).toBe("D");
  });

  it("Ambient MusicPlay round-trip", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let parsed: Record<string, unknown> | undefined;
    client.onParsed = (info) => {
      parsed = info.payload;
    };
    server.sendServerToPlayerAmbientMusicPlay(1, true);
    expect(transport.toPlayer[0].message[2]).toBe(AmbientMessageMinor.MusicPlay);
    client.handleServerToPlayerMessage(transport.toPlayer[0].message);
    expect(parsed?.play).toBe(true);
  });

  it("CustomToken single round-trip", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let parsed: Record<string, unknown> | undefined;
    client.onParsed = (info) => {
      parsed = info.payload;
    };
    server.sendServerToPlayerSetCustomToken(1, 42, "hello");
    expect(transport.toPlayer[0].message[2]).toBe(CustomTokenMessageMinor.SetToken);
    client.handleServerToPlayerMessage(transport.toPlayer[0].message);
    expect(parsed).toEqual({ number: 42, value: "hello" });
  });

  it("SafeProjectile Projectile minor 2", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    server.sendServerToPlayerSafeProjectileProjectile(1, {
      oid0: 1,
      oid1: 2,
      origin: { x: 0, y: 0, z: 0 },
      target: { x: 1, y: 1, z: 1 },
      spellId: 5,
      projectilePath: 0,
      projectileModel: 1,
      byte0: 0,
      byte1: 0,
      unused: 0,
    });
    expect(transport.toPlayer[0].message[2]).toBe(SafeProjectileMessageMinor.Projectile);
  });

  it("MapPin Enabled round-trip", () => {
    const transport = new MemoryMessageTransport();
    const server = new OdysseyServerMessage(transport);
    const client = new OdysseyClientMessage();
    let parsed: Record<string, unknown> | undefined;
    client.onParsed = (info) => {
      parsed = info.payload;
    };
    server.sendServerToPlayerMapPinEnabled(1, 8, true);
    expect(transport.toPlayer[0].message[2]).toBe(MapPinMessageMinor.Enabled);
    client.handleServerToPlayerMessage(transport.toPlayer[0].message);
    expect(parsed?.enabled).toBe(true);
  });
});

describe("LocString wire", () => {
  it("round-trips text and strref forms", () => {
    const w = new OdysseyMessage();
    w.createWriteMessage(64);
    writeLocString(w, { isStrRef: false, text: "abc" });
    writeLocString(w, { isStrRef: true, language: 0, strRef: 12345 });
    const { buffer, size } = w.getWriteMessage();
    const r = new OdysseyMessage();
    r.setReadMessage(buffer.subarray(3, size), size - 3);
    expect(readLocString(r)).toEqual({ isStrRef: false, text: "abc" });
    expect(readLocString(r)).toEqual({ isStrRef: true, language: 0, strRef: 12345 });
  });
});
