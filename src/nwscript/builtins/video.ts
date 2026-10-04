import { EngineMode } from "@/enums/engine/EngineMode";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const EnableVideoEffect = defineAction({
  id: 508,
  name: "EnableVideoEffect",
  comment: "508: Enable a video frame buffer effect.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nEffectType")] as const,
  kotor(this: NWScriptInstance, nEffectType) {
    GameState.VideoEffectManager.SetVideoEffect(!isNaN(nEffectType) ? nEffectType : -1);
  },
});

export const DisableVideoEffect = defineAction({
  id: 510,
  name: "DisableVideoEffect",
  comment: "510: Disable any video frame buffer effect that may be running.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    GameState.VideoEffectManager.SetVideoEffect(-1);
  },
});

export const PlayMovie = defineAction({
  id: 733,
  name: "PlayMovie",
  comment: "733: Play a movie.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sMovie"),
    intParam("bSkippable", { availability: "tsl", optional: true, default: 1 }),
  ] as const,
  async kotor(this: NWScriptInstance, sMovie, bSkippable) {
    GameState.SetEngineMode(EngineMode.MOVIE);
    GameState.VideoManager.playMovie(sMovie, true);
  },
});

export const SetGlobalFadeIn = defineAction({
  id: 719,
  name: "SetGlobalFadeIn",
  comment: "719: Set a fade in that starts after fWait seconds and fades for fLength seconds.",
  returnType: NWScriptDataType.VOID,
  params: [
    floatParam("fWait", { optional: true, default: 0.0 }),
    floatParam("fR", { optional: true, default: 0.0 }),
    floatParam("fG", { optional: true, default: 0.0 }),
    floatParam("fB", { optional: true, default: 0.0 }),
    floatParam("fLength", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, fWait, fR, fG, fB, fLength) {
    GameState.FadeOverlayManager.holdForScript = false;
    GameState.FadeOverlayManager.FadeIn(fR, fG, fB, fLength, fWait);
  },
});

export const SetGlobalFadeOut = defineAction({
  id: 720,
  name: "SetGlobalFadeOut",
  comment: "720: Set a fade out that starts after fWait seconds and fades for fLength seconds.",
  returnType: NWScriptDataType.VOID,
  params: [
    floatParam("fWait", { optional: true, default: 0.0 }),
    floatParam("fR", { optional: true, default: 0.0 }),
    floatParam("fG", { optional: true, default: 0.0 }),
    floatParam("fB", { optional: true, default: 0.0 }),
    floatParam("fLength", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, fWait, fR, fG, fB, fLength) {
    GameState.FadeOverlayManager.holdForScript = false;
    GameState.FadeOverlayManager.FadeOut(fR, fG, fB, fLength, fWait);
  },
});

export const videoActions = [
  EnableVideoEffect,
  DisableVideoEffect,
  PlayMovie,
  SetGlobalFadeIn,
  SetGlobalFadeOut,
] as const;
