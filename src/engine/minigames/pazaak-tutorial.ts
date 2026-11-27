/**
 * Pazaak tutorial help sequences for PlayPazaak(bShowTutorial=1).
 *
 * Both games use the same TLK string ids.
 *
 * Pure state machine — no GameState / Three.js imports (Jest-safe).
 */

/** Help shown when the side deck setup screen opens. */
export const PAZAAK_TUT_SETUP = [0x96e3, 0x96e4, 0x96e5] as const;
/** Help shown once when the first game starts. */
export const PAZAAK_TUT_GAME_START = [0x96e7, 0x96e8] as const;
/** Help shown after the player's first draw. */
export const PAZAAK_TUT_DRAWN_CARD = 0x96e9;
/** After closing 0x96e9 — hand / flip help. */
export const PAZAAK_TUT_HAND_HELP = [0x96ea, 0x96eb, 0x96ec, 0x96f3, 0x96f4] as const;
/** After closing 0x96ec / 0x96f4 — stand / continue help. */
export const PAZAAK_TUT_STAND_HELP = [0x96ed, 0x96ee, 0x96ef] as const;
/** Help shown at the start of the first enemy turn. */
export const PAZAAK_TUT_ENEMY_TURN = 0x96f5;
/** Perfect 20. */
export const PAZAAK_TUT_TWENTY = 0x96f6;
/** Bust. */
export const PAZAAK_TUT_BUST = 0x96f7;
/** Between sets. */
export const PAZAAK_TUT_NEXT_SET = 0x96f8;
/** Match over. */
export const PAZAAK_TUT_MATCH_OVER = 0x96f9;
/** Stand with low total warning. */
export const PAZAAK_TUT_STAND_LOW = 0x96f0;
/** Continue with high total warning. */
export const PAZAAK_TUT_CONTINUE_HIGH = 0x96f1;
/** Play side with low total warning. */
export const PAZAAK_TUT_PLAY_SIDE_LOW = 0x96f2;

export enum PazaakTutorialAction {
  NONE = 0,
  /** Close 0x96f0 / 0x96f1 — force stand then end-turn delay path. */
  FORCE_STAND = 1,
  /** Close 0x96f2 — play pending hand card. */
  PLAY_SIDE = 2,
  /** Close 0x96f9 — end the match. */
  END_GAME = 3,
  /** Close 0x96e9 — queue hand help (action is informational). */
  SET_HAND_HINT = 4,
}

export interface PazaakTutorialDismissResult {
  action: PazaakTutorialAction;
  /** Next dialog to show immediately, or 0 if none. */
  nextStrRef: number;
}

/**
 * Queued help driver. Callers pass `enabled` from PazaakManager.ShowTutorial.
 */
export class PazaakTutorialDriver {
  enabled = false;
  /** Pending strrefs after the one currently displayed. */
  queue: number[] = [];
  /** Strref currently (or last) shown. */
  current = 0;
  /** Game start intro already shown. */
  gameStartShown = false;
  /** First draw help already shown. */
  drawnCardHelpShown = false;
  /** Enemy turn help already shown. */
  enemyTurnHelpShown = false;
  /** Twenty help already shown. */
  twentyHelpShown = false;
  /** Hand index deferred until the play-side warning is dismissed. */
  pendingHandIndex = -1;

  reset(){
    this.queue = [];
    this.current = 0;
    this.gameStartShown = false;
    this.drawnCardHelpShown = false;
    this.enemyTurnHelpShown = false;
    this.twentyHelpShown = false;
    this.pendingHandIndex = -1;
  }

  setEnabled(enabled: boolean){
    this.enabled = !!enabled;
  }

  /**
   * Setup screen opened — enqueue 0x96e3..0x96e5; return first strref or 0.
   */
  beginSetup(): number {
    if(!this.enabled){ return 0; }
    return this.enqueueAndTakeFirst([...PAZAAK_TUT_SETUP]);
  }

  /**
   * Game started — enqueue 0x96e7..0x96e8 once; return first or 0.
   */
  beginGameIfNeeded(): number {
    if(!this.enabled || this.gameStartShown){ return 0; }
    this.gameStartShown = true;
    return this.enqueueAndTakeFirst([...PAZAAK_TUT_GAME_START]);
  }

  /** First player draw — 0x96e9 once. */
  beginDrawnCardHelpIfNeeded(): number {
    if(!this.enabled || this.drawnCardHelpShown){ return 0; }
    this.drawnCardHelpShown = true;
    return this.enqueueAndTakeFirst([PAZAAK_TUT_DRAWN_CARD]);
  }

  /** Enemy turn start — 0x96f5 once. */
  beginEnemyTurnHelpIfNeeded(): number {
    if(!this.enabled || this.enemyTurnHelpShown){ return 0; }
    this.enemyTurnHelpShown = true;
    return this.enqueueAndTakeFirst([PAZAAK_TUT_ENEMY_TURN]);
  }

  /** Bust (>20) or perfect 20 help. */
  beginTotalHelp(total: number): number {
    if(!this.enabled){ return 0; }
    if(total > 20){
      return this.enqueueAndTakeFirst([PAZAAK_TUT_BUST]);
    }
    if(total === 20 && !this.twentyHelpShown){
      this.twentyHelpShown = true;
      return this.enqueueAndTakeFirst([PAZAAK_TUT_TWENTY]);
    }
    return 0;
  }

  /** Stand with total < 14 — warn then FORCE_STAND on dismiss. */
  beginStandLowWarn(): number {
    if(!this.enabled){ return 0; }
    return this.enqueueAndTakeFirst([PAZAAK_TUT_STAND_LOW]);
  }

  /** Continue with total > 15 — warn then FORCE_STAND on dismiss. */
  beginContinueHighWarn(): number {
    if(!this.enabled){ return 0; }
    return this.enqueueAndTakeFirst([PAZAAK_TUT_CONTINUE_HIGH]);
  }

  /** Play side with total < 13 — warn then PLAY_SIDE on dismiss. */
  beginPlaySideLowWarn(handIndex: number): number {
    if(!this.enabled){ return 0; }
    this.pendingHandIndex = handIndex;
    return this.enqueueAndTakeFirst([PAZAAK_TUT_PLAY_SIDE_LOW]);
  }

  beginNextSetHelp(): number {
    if(!this.enabled){ return 0; }
    return this.enqueueAndTakeFirst([PAZAAK_TUT_NEXT_SET]);
  }

  beginMatchOverHelp(): number {
    if(!this.enabled){ return 0; }
    return this.enqueueAndTakeFirst([PAZAAK_TUT_MATCH_OVER]);
  }

  /**
   * User dismissed the dialog showing `closedStrRef`.
   * Enqueues follow-up help and returns the action and next dialog.
   */
  onHelpClosed(closedStrRef: number): PazaakTutorialDismissResult {
    let action = PazaakTutorialAction.NONE;

    switch(closedStrRef){
      case PAZAAK_TUT_DRAWN_CARD:
        this.queue.push(...PAZAAK_TUT_HAND_HELP);
        action = PazaakTutorialAction.SET_HAND_HINT;
        break;
      case 0x96ec:
      case 0x96f4:
        this.queue.push(...PAZAAK_TUT_STAND_HELP);
        break;
      case PAZAAK_TUT_STAND_LOW:
      case PAZAAK_TUT_CONTINUE_HIGH:
        action = PazaakTutorialAction.FORCE_STAND;
        break;
      case PAZAAK_TUT_PLAY_SIDE_LOW:
        action = PazaakTutorialAction.PLAY_SIDE;
        break;
      case PAZAAK_TUT_MATCH_OVER:
        action = PazaakTutorialAction.END_GAME;
        break;
      default:
        break;
    }

    const nextStrRef = this.takeNext();
    return { action, nextStrRef };
  }

  private enqueueAndTakeFirst(strRefs: number[]): number {
    this.queue = [];
    if(strRefs.length === 0){ return 0; }
    this.current = strRefs[0];
    for(let i = 1; i < strRefs.length; i++){
      this.queue.push(strRefs[i]);
    }
    return this.current;
  }

  private takeNext(): number {
    if(this.queue.length === 0){
      this.current = 0;
      return 0;
    }
    this.current = this.queue.shift()!;
    return this.current;
  }
}

/** Shared singleton used by menus / manager. */
export const PazaakTutorial = new PazaakTutorialDriver();
