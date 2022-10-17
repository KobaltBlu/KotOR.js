import { ModuleObject } from "../module";

export class CombatRoundData {
  roundStarted: number = 0;
  spellCastRound: number = 0;
  deflectArrow: number = 0;
  weaponSucks: number = 0;
  dodgeTarget: number = 0;
  newAttackTarget: ModuleObject;
  engaged: number = 0;
  master: number = 0;
  masterID: number = 0;
  roundPaused: number = 0;
  roundPausedBy: ModuleObject;
  infinitePause: number = 0;
  pauseTimer: number = 0;
  timer: number = 0;
  roundLength: number = 0;
  overlapAmount: number = 0;
  bleedTimer: number = 0;
  currentAttack: number = 0;
  attackID: number = 0;
  attackGroup: number = 0;
  partyIndex: number = 0;
  numAOOs: number = 0;
  numCleaves: number = 0;
  onHandAttacks: number = 0;
  additAttacks: number = 0;
  effectAttacks: number = 0;
  parryAtttacks: number = 0;
  offHandTaken: number = 0;
  extraTaken: number = 0;
  attackList: any[] = [];
  specAttackList: any[] = [];
  schedActionList: any[] = [];
}