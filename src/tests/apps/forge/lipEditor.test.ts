import { describe, expect, test } from "@jest/globals";
import {
  LIP_SNAP_GRID_SEC,
  LIP_VISEMES,
  clampLipShape,
  formatLipClock,
  mergeLipKeyframes,
  snapLipTime,
  visemeSpansFromKeys,
} from "@/apps/forge/lip/lipVisemes";
import { LIPObject } from "@/resource/LIPObject";

describe("lip viseme catalog", () => {
  test("has 16 visemes covering Odyssey mouth shapes", () => {
    expect(LIP_VISEMES).toHaveLength(16);
    expect(LIP_VISEMES[0].token).toBe("EE");
    expect(LIP_VISEMES[11].token).toBe("MBP");
    expect(LIP_VISEMES[11].label.toLowerCase()).toContain("m, p, b");
    expect(clampLipShape(-3)).toBe(0);
    expect(clampLipShape(99)).toBe(15);
  });
});

describe("visemeSpansFromKeys", () => {
  test("holds each viseme until the next key, then duration", () => {
    const spans = visemeSpansFromKeys(
      [
        { uuid: "b", time: 0.5, shape: 11 },
        { uuid: "a", time: 0.1, shape: 0 },
      ],
      1.2,
    );
    expect(spans).toEqual([
      { uuid: "a", shape: 0, start: 0.1, end: 0.5 },
      { uuid: "b", shape: 11, start: 0.5, end: 1.2 },
    ]);
  });

  test("returns no spans when there are no keys", () => {
    expect(visemeSpansFromKeys([], 2)).toEqual([]);
  });
});

describe("snapLipTime", () => {
  test("clamps and leaves off-mode times alone", () => {
    expect(snapLipTime(-0.2, { mode: "off", duration: 1 })).toBe(0);
    expect(snapLipTime(1.4, { mode: "off", duration: 1 })).toBe(1);
    expect(snapLipTime(0.37, { mode: "off", duration: 2 })).toBe(0.37);
  });

  test("snaps to a 10ms grid", () => {
    expect(snapLipTime(0.334, { mode: "grid", duration: 2 })).toBeCloseTo(0.33, 6);
    expect(snapLipTime(0.335, { mode: "grid", duration: 2, grid: LIP_SNAP_GRID_SEC })).toBeCloseTo(0.34, 6);
  });

  test("snaps to the nearest phoneme start", () => {
    expect(snapLipTime(0.42, {
      mode: "phoneme",
      duration: 2,
      phonemeStarts: [0.1, 0.4, 0.9],
    })).toBeCloseTo(0.4, 6);
  });
});

describe("mergeLipKeyframes", () => {
  test("keeps existing keys and skips incoming collisions", () => {
    const merged = mergeLipKeyframes(
      [{ uuid: "keep", time: 0.2, shape: 5 }],
      [
        { time: 0.205, shape: 0 },
        { time: 0.55, shape: 11 },
      ],
      0.01,
    );
    expect(merged).toEqual([
      { uuid: "keep", time: 0.2, shape: 5 },
      { time: 0.55, shape: 11 },
    ]);
  });
});

describe("formatLipClock", () => {
  test("formats mm:ss.ss", () => {
    expect(formatLipClock(0)).toBe("0:00.00");
    expect(formatLipClock(61.5)).toBe("1:01.50");
  });
});

describe("LIPObject export format", () => {
  test("round-trips duration and time/shape keys as LIP V1.0", () => {
    const lip = new LIPObject(new Uint8Array(0));
    lip.keyframes = [];
    lip.duration = 1.25;
    lip.addKeyFrame(0.1, 11);
    lip.addKeyFrame(0.5, 0);
    const buffer = lip.toExportBuffer();
    const type = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
    const version = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    expect(type).toBe("LIP ");
    expect(version).toBe("V1.0");

    let loaded: LIPObject | undefined;
    new LIPObject(buffer, (next: LIPObject) => {
      loaded = next;
    });
    expect(loaded).toBeDefined();
    expect(loaded!.duration).toBeCloseTo(1.25, 5);
    expect(loaded!.keyframes).toHaveLength(2);
    expect(loaded!.keyframes[0].time).toBeCloseTo(0.1, 5);
    expect(loaded!.keyframes[0].shape).toBe(11);
    expect(loaded!.keyframes[1].shape).toBe(0);
  });
});
