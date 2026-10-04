/**
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';
import { EngineMode } from '@engine/enums/engine/EngineMode';
import { CutsceneMode } from '@core/enums/dialog/CutsceneMode';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));

import { ModuleObject } from "@engine/module/ModuleObject";

describe('resolveDialogModelVisibility', () => {
  test('DIALOG follows room visibility', () => {
    expect(ModuleObject.resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.DIALOG,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: false,
    })).toBe(false);
  });

  test('ANIMATED cut hides party non-stunt participants', () => {
    expect(ModuleObject.resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.ANIMATED,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: true,
    })).toBe(false);
  });

  test('ANIMATED cut keeps StuntList participants', () => {
    expect(ModuleObject.resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.ANIMATED,
      isPartyMember: true,
      objectCutsceneMode: true,
      hasRoom: true,
      roomModelVisible: true,
    })).toBe(true);
  });

  test('MINIGAME forces visible', () => {
    expect(ModuleObject.resolveDialogModelVisibility({
      mode: EngineMode.MINIGAME,
      cutsceneMode: CutsceneMode.DIALOG,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: false,
    })).toBe(true);
  });
});
