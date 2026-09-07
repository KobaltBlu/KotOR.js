/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { OdysseyMessage } from "@/server/message/OdysseyMessage";

describe("OdysseyMessage", () => {
  it("CreateWriteMessage reserves 3 header bytes", () => {
    const msg = new OdysseyMessage();
    msg.createWriteMessage(1);
    expect(msg.writeIndex).toBe(3);
    msg.writeBYTE(0x42);
    const out = msg.getWriteMessage();
    expect(out.ok).toBe(true);
    expect(out.size).toBe(4);
    expect(out.buffer[3]).toBe(0x42);
  });

  it("round-trips BYTE WORD DWORD FLOAT BOOL string resref vector", () => {
    const w = new OdysseyMessage();
    w.createWriteMessage(64);
    w.writeBYTE(7);
    w.writeWORD(0x1234);
    w.writeDWORD(0x89abcdef);
    w.writeFLOAT(1.5);
    w.writeBOOL(true);
    w.writeCExoString("hello");
    w.writeCResRef("mymodule", 16);
    w.writeVector({ x: 1, y: 2, z: 3 });
    const { buffer, size } = w.getWriteMessage();

    const r = new OdysseyMessage();
    r.setReadMessage(buffer.subarray(3, size), size - 3);
    expect(r.readBYTE()).toBe(7);
    expect(r.readWORD()).toBe(0x1234);
    expect(r.readDWORD()).toBe(0x89abcdef);
    expect(r.readFLOAT()).toBeCloseTo(1.5);
    expect(r.readBOOL()).toBe(true);
    expect(r.readCExoString()).toBe("hello");
    expect(r.readCResRef(16)).toBe("mymodule");
    const v = r.readVector();
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(2);
    expect(v.z).toBeCloseTo(3);
    expect(r.messageReadOverflow()).toBe(false);
    expect(r.messageReadUnderflow()).toBe(false);
  });

  it("ReadBYTE past end advances and returns 0 (overflow)", () => {
    const r = new OdysseyMessage();
    r.setReadMessage(new Uint8Array(0), 0);
    expect(r.readBYTE()).toBe(0);
    expect(r.messageReadOverflow()).toBe(true);
  });

  it("WriteVOIDPtr / ReadVOIDPtr round-trip", () => {
    const w = new OdysseyMessage();
    w.createWriteMessage(8);
    const data = new Uint8Array([1, 2, 3, 4]);
    w.writeVOIDPtr(data);
    const { buffer, size } = w.getWriteMessage();
    const r = new OdysseyMessage();
    r.setReadMessage(buffer.subarray(3, size), size - 3);
    const got = r.readVOIDPtr(4);
    expect(got).not.toBeNull();
    expect(Array.from(got!)).toEqual([1, 2, 3, 4]);
  });
});
