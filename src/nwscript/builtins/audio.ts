import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import { AudioEngine } from "@/audio/AudioEngine";
import type { ModuleArea, ModuleObject, ModuleSound } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";

export const PlaySound = defineAction({
  id: 46,
  name: "PlaySound",
  comment: "46: Play sSoundName.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sSoundName"),
  ] as const,

  kotor(this: NWScriptInstance, sSoundName) {
    try {
      const oSound = GameState.ModuleObjectManager.GetObjectByTag(sSoundName, 0, NWModuleObjectType.SOUND) as ModuleSound;
      if (!oSound) {
        return;
      }

      oSound.audioEmitter.playNextSound();
    } catch (error) {
      console.error(error);
    }
  },
});

export const SoundObjectSetFixedVariance = defineAction({
  id: 124,
  name: "SoundObjectSetFixedVariance",
  comment: "124: Set the constant variance at which to play the sound object.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
    floatParam("fVariance"),
  ] as const,

  kotor(this: NWScriptInstance, oSound, fVariance) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).setFixedVariance(fVariance);
    }
  },
});

export const SoundObjectGetFixedVariance = defineAction({
  id: 188,
  name: "SoundObjectGetFixedVariance",
  comment: "188: Get the constant variance at which to play the sound object.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oSound) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      return (oSound as ModuleSound).fixedVariance;
    }

    return 0;
  },
});

export const SoundObjectPlay = defineAction({
  id: 413,
  name: "SoundObjectPlay",
  comment: "413: Play oSound.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oSound) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).start();
    }
  },
});

export const SoundObjectStop = defineAction({
  id: 414,
  name: "SoundObjectStop",
  comment: "414: Stop playing oSound.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oSound) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).stop();
    }
  },
});

export const SoundObjectSetVolume = defineAction({
  id: 415,
  name: "SoundObjectSetVolume",
  comment: "415: Set the volume of oSound.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
    intParam("nVolume"),
  ] as const,

  kotor(this: NWScriptInstance, oSound, nVolume) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).setVolume(nVolume);
    }
  },
});

export const SoundObjectSetPosition = defineAction({
  id: 416,
  name: "SoundObjectSetPosition",
  comment: "416: Set the position of oSound.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
    vectorParam<{ x: number; y: number; z: number }>("vPosition"),
  ] as const,

  kotor(this: NWScriptInstance, oSound, vPosition) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).setPosition(vPosition.x, vPosition.y, vPosition.z);
    }
  },
});

export const MusicBackgroundPlay = defineAction({
  id: 425,
  name: "MusicBackgroundPlay",
  comment: "425: Play the background music for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBackgroundPlay();
    }
  },
});

export const MusicBackgroundStop = defineAction({
  id: 426,
  name: "MusicBackgroundStop",
  comment: "426: Stop the background music for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBackgroundStop();
    }
  },
});

export const MusicBackgroundSetDelay = defineAction({
  id: 427,
  name: "MusicBackgroundSetDelay",
  comment: "427: Set the delay for the background music for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nDelay"),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nDelay) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBackgroundSetDelay(nDelay);
    }
  },
});

export const MusicBackgroundChangeDay = defineAction({
  id: 428,
  name: "MusicBackgroundChangeDay",
  comment: "428: Change the background day track for oArea to nTrack.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nTrack"),
    intParam("bAsMusicState", { availability: "tsl", optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nTrack, bAsMusicState) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBackgroundDaySet(nTrack);
    }
  },
});

export const MusicBackgroundChangeNight = defineAction({
  id: 429,
  name: "MusicBackgroundChangeNight",
  comment: "429: Change the background night track for oArea to nTrack.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nTrack"),
    intParam("bAsMusicState", { availability: "tsl", optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nTrack, bAsMusicState) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBackgroundNightSet(nTrack);
    }
  },
});

export const MusicBattlePlay = defineAction({
  id: 430,
  name: "MusicBattlePlay",
  comment: "430: Play the battle music for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBattlePlay();
    }
  },
});

export const MusicBattleStop = defineAction({
  id: 431,
  name: "MusicBattleStop",
  comment: "431: Stop the battle music for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBattleStop();
    }
  },
});

export const MusicBattleChange = defineAction({
  id: 432,
  name: "MusicBattleChange",
  comment: "432: Change the battle track for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nTrack"),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nTrack) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).musicBattleSet(nTrack);
    }
  },
});

export const AmbientSoundPlay = defineAction({
  id: 433,
  name: "AmbientSoundPlay",
  comment: "433: Play the ambient sound for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).ambientSoundPlay();
    }
  },
});

export const AmbientSoundStop = defineAction({
  id: 434,
  name: "AmbientSoundStop",
  comment: "434: Stop the ambient sound for oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).ambientSoundStop();
    }
  },
});

export const AmbientSoundChangeDay = defineAction({
  id: 435,
  name: "AmbientSoundChangeDay",
  comment: "435: Change the ambient day track for oArea to nTrack.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nTrack"),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nTrack) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).ambientSoundDaySet(nTrack);
    }
  },
});

export const AmbientSoundChangeNight = defineAction({
  id: 436,
  name: "AmbientSoundChangeNight",
  comment: "436: Change the ambient night track for oArea to nTrack.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nTrack"),
  ] as const,

  kotor(this: NWScriptInstance, oArea, nTrack) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).ambientSoundNightSet(nTrack);
    }
  },
});

export const SoundObjectFadeAndStop = defineAction({
  id: 745,
  name: "SoundObjectFadeAndStop",
  comment: "745: Fade a sound object for fSeconds and then stop it.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
    floatParam("fSeconds", { availability: "kotor", optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, oSound, fSeconds) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).stop(fSeconds || 0);
    }
  },

  tsl(this: NWScriptInstance, oSound, fSeconds) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).stop(0);
    }
  },
});

export const MusicBackgroundGetDayTrack = defineAction({
  id: 558,
  name: "MusicBackgroundGetDayTrack",
  comment: "558: Get the Day Track for oArea.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      return (oArea as ModuleArea).audio.music.day;
    }
    return -1;
  },
});

export const MusicBackgroundGetNightTrack = defineAction({
  id: 559,
  name: "MusicBackgroundGetNightTrack",
  comment: "559: Get the Night Track for oArea.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      return (oArea as ModuleArea).audio.music.night;
    }
    return -1;
  },
});

export const AmbientSoundSetDayVolume = defineAction({
  id: 567,
  name: "AmbientSoundSetDayVolume",
  comment: "567: Set the ambient day volume for oArea to nVolume.\n- nVolume: 0 - 100",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nVolume"),
  ] as const,
  kotor(this: NWScriptInstance, oArea, nVolume) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      const audioEngine = AudioEngine.GetAudioEngine();
      audioEngine.ambientAudioDayEmitter.setVolume(AudioEngine.percentageToNormalizedGain(nVolume));
    }
  },
});

export const AmbientSoundSetNightVolume = defineAction({
  id: 568,
  name: "AmbientSoundSetNightVolume",
  comment: "568: Set the ambient night volume for oArea to nVolume.\n- nVolume: 0 - 100",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nVolume"),
  ] as const,
  kotor(this: NWScriptInstance, oArea, nVolume) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      const audioEngine = AudioEngine.GetAudioEngine();
      audioEngine.ambientAudioNightEmitter.setVolume(AudioEngine.percentageToNormalizedGain(nVolume));
    }
  },
});

export const MusicBackgroundGetBattleTrack = defineAction({
  id: 569,
  name: "MusicBackgroundGetBattleTrack",
  comment: "569: Get the Battle Track for oArea.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oArea) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      return (oArea as ModuleArea).audio.music.battle;
    }
    return -1;
  },
});

export const BarkString = defineAction({
  id: 671,
  name: "BarkString",
  comment: "671: BarkString\nThis will cause a creature to bark the strRef from the talk table.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nStrRef"),
    intParam("bPlayVoiceOver", { availability: "tsl", optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nStrRef, bPlayVoiceOver) {
    GameState.MenuManager.InGameBark.barkFromStringRef(nStrRef);
  },
});

export const SoundObjectGetPitchVariance = defineAction({
  id: 689,
  name: "SoundObjectGetPitchVariance",
  comment: "689: Gets the pitch variance of a placeable sound object.",
  returnType: NWScriptDataType.FLOAT,
  params: [objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oSound) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      return (oSound as ModuleSound).pitchVariation;
    }
    return 0;
  },
});

export const SoundObjectSetPitchVariance = defineAction({
  id: 690,
  name: "SoundObjectSetPitchVariance",
  comment: "690: Sets the pitch variance of a placeable sound object.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined }),
    floatParam("fVariance"),
  ] as const,
  kotor(this: NWScriptInstance, oSound, fVariance) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      (oSound as ModuleSound).setPitchVariation(fVariance);
    }
  },
});

export const SoundObjectGetVolume = defineAction({
  id: 691,
  name: "SoundObjectGetVolume",
  comment: "691: Gets the volume of a placeable sound object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oSound", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oSound) {
    if (BitWise.InstanceOfObject(oSound, ModuleObjectType.ModuleSound)) {
      return (oSound as ModuleSound).volume;
    }
    return 0;
  },
});

export const audioActions = [
  PlaySound,
  SoundObjectSetFixedVariance,
  SoundObjectGetFixedVariance,
  SoundObjectPlay,
  SoundObjectStop,
  SoundObjectSetVolume,
  SoundObjectSetPosition,
  MusicBackgroundPlay,
  MusicBackgroundStop,
  MusicBackgroundSetDelay,
  MusicBackgroundChangeDay,
  MusicBackgroundChangeNight,
  MusicBattlePlay,
  MusicBattleStop,
  MusicBattleChange,
  AmbientSoundPlay,
  AmbientSoundStop,
  AmbientSoundChangeDay,
  AmbientSoundChangeNight,
  SoundObjectFadeAndStop,
  MusicBackgroundGetDayTrack,
  MusicBackgroundGetNightTrack,
  AmbientSoundSetDayVolume,
  AmbientSoundSetNightVolume,
  MusicBackgroundGetBattleTrack,
  BarkString,
  SoundObjectGetPitchVariance,
  SoundObjectSetPitchVariance,
  SoundObjectGetVolume,
] as const;