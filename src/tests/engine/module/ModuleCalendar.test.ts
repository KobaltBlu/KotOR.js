import { describe, expect, test } from "@jest/globals";
import { ModuleCalendar } from "@engine/module/ModuleCalendar";

(globalThis as any).FileSystemFileHandle = class FileSystemFileHandle {};

const { ModuleTimeManager } = require("@engine/module/ModuleTimeManager") as typeof import("@engine/module/ModuleTimeManager");

describe("ModuleCalendar", () => {
  test("normalizes advances spanning multiple days", () => {
    const calendar = new ModuleCalendar();
    const dayLength = calendar.MAX_DAY_TIME;

    calendar.advanceDayAndTime(2, dayLength * 3 + 1500);

    expect(calendar.pauseDay).toBe(5);
    expect(calendar.pauseTime).toBe(1500);
    expect(calendar.second).toBe(1);
    expect(calendar.milisecond).toBe(500);
  });

  test("converts the engine 28-day, 12-month calendar", () => {
    const calendar = new ModuleCalendar();

    calendar.pauseDay = ModuleCalendar.DAYS_IN_MONTH * ModuleCalendar.MONTHS_IN_YEAR;
    calendar.updateCalendarDateTime();

    expect(calendar.year).toBe(1);
    expect(calendar.month).toBe(1);
    expect(calendar.day).toBe(1);
  });
});

describe("ModuleTimeManager", () => {
  test("SetTime carries overflow through every component", () => {
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 60;

    manager.setTime(62, 250, 70, 1010);

    expect(manager.pauseDay).toBe(2);
    expect(manager.hour).toBe(18);
    expect(manager.minute).toBe(11);
    expect(manager.second).toBe(11);
    expect(manager.milisecond).toBe(10);
  });

  test("SetTime advances a day only when the target is earlier", () => {
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 60;
    manager.setTime(12, 0, 0, 0);

    manager.setTime(12, 0, 0, 0);
    expect(manager.pauseDay).toBe(0);

    manager.setTime(3, 0, 0, 0);
    expect(manager.pauseDay).toBe(1);
    expect(manager.hour).toBe(3);
  });

  test("SetTime rejects negative components", () => {
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 60;
    manager.setTime(12, 0, 0, 0);

    manager.setTime(4, -1, 0, 0);

    expect(manager.pauseDay).toBe(0);
    expect(manager.hour).toBe(12);
  });

  test("NWScript minutes stay in compressed Mod_MinPerHour buckets", () => {
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 2;

    // ConvertHourMinSecMsToMs adds minute*60000, then ConvertFromTimeOfDay
    // returns world_time_ms/60000 % minutesPerHour.
    manager.setTime(8, 30, 0, 0);

    expect(manager.pauseTime).toBe(8 * 2 * 60000 + 30 * 60000);
    expect(manager.hour).toBe(23);
    expect(manager.minute).toBe(0);
  });

  test("minutesPerHour zero falls back to five", () => {
    const manager = new ModuleTimeManager();
    manager.setMinutesPerHour(0);
    expect(manager.minutesPerHour).toBe(5);
  });

  test("elapsed time is not truncated to a signed 32-bit integer", () => {
    const manager = new ModuleTimeManager();
    manager.pauseDay = 1000;

    expect(manager.getMilisecondsElapsed(0, 0)).toBeGreaterThan(0x7fffffff);
  });

  test("computes engine day/night/dawn/dusk phases", () => {
    const { ModuleDayPhase } = require("@core/enums/module/ModuleDayPhase") as typeof import("@core/enums/module/ModuleDayPhase");
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 60;
    manager.dawnHour = 6;
    manager.duskHour = 18;

    manager.setTime(12, 0, 0, 0);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Day);
    expect(manager.isDay()).toBe(true);

    manager.setTime(6, 0, 0, 0);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Dawn);
    expect(manager.isDawn()).toBe(true);

    manager.setTime(18, 0, 0, 0);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Dusk);
    expect(manager.isDusk()).toBe(true);

    manager.setTime(22, 0, 0, 0);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Night);
    expect(manager.isNight()).toBe(true);
  });

  test("accumulates Mod_Transition only while in dawn or dusk", () => {
    const { ModuleDayPhase } = require("@core/enums/module/ModuleDayPhase") as typeof import("@core/enums/module/ModuleDayPhase");
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 60;
    manager.dawnHour = 6;
    manager.duskHour = 18;

    manager.setTime(6, 0, 0, 0);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Dawn);
    expect(manager.transition).toBe(0);

    manager.updateTime(250);
    expect(manager.transition).toBe(250);

    manager.setTime(12, 0, 0, 0);
    manager.updateTime(100);
    expect(manager.dayPhase).toBe(ModuleDayPhase.Day);
    expect(manager.transition).toBe(0);
  });

  test("day and dawn share day audio tracks; night and dusk share night", () => {
    const { ModuleDayPhase } = require("@core/enums/module/ModuleDayPhase") as typeof import("@core/enums/module/ModuleDayPhase");

    expect(ModuleTimeManager.usesDayAudioTracks(ModuleDayPhase.Day)).toBe(true);
    expect(ModuleTimeManager.usesDayAudioTracks(ModuleDayPhase.Dawn)).toBe(true);
    expect(ModuleTimeManager.usesDayAudioTracks(ModuleDayPhase.Night)).toBe(false);
    expect(ModuleTimeManager.usesDayAudioTracks(ModuleDayPhase.Dusk)).toBe(false);
  });

  test("dawn/dusk transition progress reaches halfway at half an hour", () => {
    const manager = new ModuleTimeManager();
    manager.minutesPerHour = 2;
    manager.dawnHour = 6;
    manager.duskHour = 18;
    manager.setTime(6, 0, 0, 0);

    const hourLengthMs = manager.minutesPerHour * 60 * 1000;
    manager.updateTime(hourLengthMs / 2);
    expect(manager.transition / hourLengthMs).toBe(0.5);
  });
});

describe("Journal calendar stamps", () => {
  test("received sort compares pauseDay then pauseTime", () => {
    expect(ModuleCalendar.comparePauseDayTime(10, 5000, 10, 9000)).toBeLessThan(0);
    expect(ModuleCalendar.comparePauseDayTime(10, 9000, 10, 5000)).toBeGreaterThan(0);
    expect(ModuleCalendar.comparePauseDayTime(10, 9000, 11, 0)).toBeLessThan(0);
  });

  test("formats received date from engine 28-day months", () => {
    expect(ModuleCalendar.formatPauseDayLabel(28)).toBe("01/02/0");
    expect(ModuleCalendar.formatPauseDayLabel(0)).toBe("01/01/0");
  });
});

describe("DayNightCycle shadowAlpha", () => {
  test("matches engine before/after midpoint curves", () => {
    // opacity 100 → base 1.0
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 0, true)).toBeCloseTo(1);
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 0.25, true)).toBeCloseTo(0.5);
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 0.5, true)).toBeCloseTo(0);
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 0.5, false)).toBeCloseTo(0);
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 0.75, false)).toBeCloseTo(0.5);
    expect(ModuleTimeManager.computeTransitionShadowAlpha(100, 1, false)).toBeCloseTo(1);
  });
});
