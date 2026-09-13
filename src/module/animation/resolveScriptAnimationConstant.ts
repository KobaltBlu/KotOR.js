/**
 * Map NWSCRIPT ANIMATION_* IDs to engine animation constants.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file resolveScriptAnimationConstant.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModulePlaceableAnimState } from "@/enums/module/ModulePlaceableAnimState";

/**
 * Resolve an NWSCRIPT ANIMATION_* id to a ModuleCreatureAnimState /
 * ModulePlaceableAnimState constant. IDs >= 10000 are already engine
 * constants and are returned as-is.
 *
 * @param id NWSCRIPT ANIMATION_* constant (or engine constant >= 10000)
 * @returns Engine animation constant (or passthrough id)
 */
export function resolveScriptAnimationConstant(id = -1): number {
  if(typeof id === 'string')
    throw 'resolveScriptAnimationConstant id cannot be a string';

  if(id >= 10000)
    return id;

  switch(id){
    case 0:  //PAUSE
      return ModuleCreatureAnimState.PAUSE;
    case 1:  //PAUSE2
      return ModuleCreatureAnimState.PAUSE2;
    case 2:  //LISTEN
      return ModuleCreatureAnimState.LISTEN;
    case 3:  //MEDITATE
      return ModuleCreatureAnimState.MEDITATE;
    case 4:  //WORSHIP
      return ModuleCreatureAnimState.WORSHIP;
    case 5:  //TALK_NORMAL
      return ModuleCreatureAnimState.TALK_NORMAL;
    case 6:  //TALK_PLEADING
      return ModuleCreatureAnimState.TALK_PLEADING;
    case 7:  //TALK_FORCEFUL
      return ModuleCreatureAnimState.TALK_FORCEFUL;
    case 8:  //TALK_LAUGHING
      return ModuleCreatureAnimState.TALK_LAUGHING;
    case 9:  //TALK_SAD
      return ModuleCreatureAnimState.TALK_SAD;
    case 10: //GET_LOW
      return ModuleCreatureAnimState.GET_LOW;
    case 11: //GET_MID
      return ModuleCreatureAnimState.GET_MID;
    case 12: //PAUSE_TIRED
      return ModuleCreatureAnimState.PAUSE_TIRED;
    case 13: //PAUSE_DRUNK
      return ModuleCreatureAnimState.PAUSE_DRUNK;
    case 14: //FLIRT
      return ModuleCreatureAnimState.FLIRT;
    case 15: //USE_COMPUTER
      return ModuleCreatureAnimState.USE_COMPUTER;
    case 16: //DANCE
      return ModuleCreatureAnimState.DANCE;
    case 17: //DANCE1
      return ModuleCreatureAnimState.DANCE1;
    case 18: //HORROR
      return ModuleCreatureAnimState.HORROR;
    case 19: //READY
      return ModuleCreatureAnimState.READY;
    case 20: //DEACTIVATE
      return ModuleCreatureAnimState.DEACTIVATE;
    case 21: //SPASM
      return ModuleCreatureAnimState.SPASM;
    case 22: //SLEEP
      return ModuleCreatureAnimState.SLEEP;
    case 23: //PRONE
      return ModuleCreatureAnimState.PRONE;
    case 24: //PAUSE3
      return ModuleCreatureAnimState.PAUSE3;
    case 25: //WELD
      return ModuleCreatureAnimState.WELD;
    case 26: //DEAD
      return ModuleCreatureAnimState.DEAD;
    case 27: //TALK_INJURED
      return ModuleCreatureAnimState.TALK_INJURED;
    case 28: //LISTEN_INJURED
      return ModuleCreatureAnimState.LISTEN_INJURED;
    case 29: //TREAT_INJURED
      return ModuleCreatureAnimState.TREAT_INJURED_LP;
    case 30: //DEAD_PRONE
      return ModuleCreatureAnimState.DEAD_PRONE;
    case 31: //KNEEL_TALK_ANGRY
      return ModuleCreatureAnimState.KNEEL_TALK_ANGRY;
    case 32: //KNEEL_TALK_SAD
      return ModuleCreatureAnimState.KNEEL_TALK_SAD;
    case 35: //MEDITATE LOOP
      return ModuleCreatureAnimState.MEDITATE;
    case 100: //HEAD_TURN_LEFT
      return ModuleCreatureAnimState.HEAD_TURN_LEFT;
    case 101: //HEAD_TURN_RIGHT
      return ModuleCreatureAnimState.HEAD_TURN_RIGHT;
    case 102: //PAUSE_SCRATCH_HEAD
      return ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD;
    case 103: //PAUSE_BORED
      return ModuleCreatureAnimState.PAUSE_BORED;
    case 104: //SALUTE
      return ModuleCreatureAnimState.SALUTE;
    case 105: //BOW
      return ModuleCreatureAnimState.BOW;
    case 106: //GREETING
      return ModuleCreatureAnimState.GREETING;
    case 107: //TAUNT
      return ModuleCreatureAnimState.TAUNT;
    case 108: //VICTORY1
      return ModuleCreatureAnimState.VICTORY;
    case 109: //VICTORY2
      return ModuleCreatureAnimState.VICTORY;
    case 110: //VICTORY3
      return ModuleCreatureAnimState.VICTORY;
    case 112: //INJECT
      return ModuleCreatureAnimState.INJECT;
    case 113: //USE_COMPUTER
      return ModuleCreatureAnimState.USE_COMPUTER;
    case 114: //PERSUADE
      return ModuleCreatureAnimState.PERSUADE;
    case 115: //ACTIVATE
      return ModuleCreatureAnimState.ACTIVATE_ITEM;
    case 116: //CHOKE
      return ModuleCreatureAnimState.CHOKE;
    case 117: //THROW_HIGH
      return ModuleCreatureAnimState.THROW_HIGH;
    case 118: //THROW_LOW
      return ModuleCreatureAnimState.THROW_LOW;
    case 119: //CUSTOM01
      return ModuleCreatureAnimState.CUSTOM01;
    case 120: //TREAT_INJURED
      return ModuleCreatureAnimState.TREAT_INJURED;
    case 123: //DIVE_ROLL
      return ModuleCreatureAnimState.DIVE_ROLL;

    // Placeable animation constants
    case 200:
      return ModulePlaceableAnimState.ACTIVATE;
    case 201:
      return ModulePlaceableAnimState.DEACTIVATE;
    case 202:
      return ModulePlaceableAnimState.OPEN;
    case 203:
      return ModulePlaceableAnimState.CLOSE;
    case 204:
      return ModulePlaceableAnimState.ANIMLOOP01;
    case 205:
      return ModulePlaceableAnimState.ANIMLOOP02;
    case 206:
      return ModulePlaceableAnimState.ANIMLOOP03;
    case 207:
      return ModulePlaceableAnimState.ANIMLOOP04;
    case 208:
      return ModulePlaceableAnimState.ANIMLOOP05;
    case 209:
      return ModulePlaceableAnimState.ANIMLOOP06;
    case 210:
      return ModulePlaceableAnimState.ANIMLOOP07;
    case 211:
      return ModulePlaceableAnimState.ANIMLOOP08;
    case 212:
      return ModulePlaceableAnimState.ANIMLOOP09;
    case 213:
      return ModulePlaceableAnimState.ANIMLOOP10;
  }

  //console.error('Animation case missing', id);
  return ModuleCreatureAnimState.PAUSE;
}
