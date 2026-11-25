import { GameState } from "@engine/runtime/GameState";
import { PazaakCards } from "@core/enums/minigames/PazaakCards";
import { PazaakHandSlots } from "@core/enums/minigames/PazaakHandSlots";
import { PazaakSideDeckSlots } from "@core/enums/minigames/PazaakSideDeckSlots";
import { PazaakTableSlots } from "@core/enums/minigames/PazaakTableSlots";
import { PazaakTurnMode } from "@core/enums/minigames/PazaakTurnMode";
import { PazaakTurnState } from "@core/enums/minigames/PazaakTurnState";
import { IPTPazaakCard } from "@core/interface/minigames/IPTPazaakCard";
import { IPazaakTable } from "@core/interface/minigames/IPazaakTable";
import { Creature } from "@engine/module/Creature";
import type { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { PazaakConfig as PazaakConfig_TSL } from "@engine/games/tsl/minigames/mg-pazaak-config";
import { PazaakConfig as PazaakConfig_KOTOR } from "@engine/games/kotor/minigames/mg-pazaak-config";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { IPazaakCard } from "@core/interface/minigames/IPazaakCard";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import type { PazaakDeck } from "@engine/minigames/PazaakDeck";
import { pazaakSetOrMatchSfx } from "@engine/minigames/pazaak-sfx";
import {
  applyBoardFlip,
  lastPlayedValue,
  previewBoardFlip,
  resolveSideCardDelta,
  sideCardDisplayLabel,
} from "@engine/minigames/pazaak-side-card";
import {
  PazaakTutorial,
  PazaakTutorialAction,
} from "@engine/minigames/pazaak-tutorial";

const MSG_YOU_WIN = 32334;
const MSG_TIED = 32338;
const MSG_YOU_LOSE = 32335;

/** Sentinel score for a busted total. */
const BUST = -1000000;
/** Copies of each main deck card (1..10) in the shuffled 40 card deck. */
const MAIN_DECK_COPIES = 4;

/** AI turn step results; each one is also the AI's next step. */
enum PazaakAIResult {
  DONE = 0,
  DRAW = 1,
  PLAY_SIDE = 2,
  STAND = 3,
  PASS = 4,
}

interface IPazaakSidecardPick {
  total: number;
  handIndex: number;
  flipped: boolean;
  swapped: boolean;
}

function isPlusMinusCard(cardId: number): boolean {
  return cardId >= PazaakCards.PLUS_MINUS_1 && cardId <= PazaakCards.PLUS_MINUS_6;
}

/**
 * Best (maximize) or lowest non-bust (minimize) total the AI can reach by playing
 * one side card from its hand. Plus/minus cards and the Tie Breaker are tried
 * negative first, then positive; an equal total only replaces a plus/minus pick.
 */
function findPotentialSidecardTotal(
  table: IPazaakTable,
  sideDeckCards: IPazaakCard[],
  maximize: boolean,
  isTSL: boolean
): IPazaakSidecardPick {
  const rawTotal = table.points;
  const pick: IPazaakSidecardPick = {
    total: rawTotal > 20 ? BUST : rawTotal,
    handIndex: -1,
    flipped: false,
    swapped: false,
  };
  let bestIsPlusMinus = false;

  for(let i = 0; i < PazaakHandSlots.MAX_SLOTS; i++){
    const cardId = table.handCards.get(i);
    if(cardId == undefined || cardId == PazaakCards.INVALID){
      continue;
    }
    const card = sideDeckCards[cardId];
    if(!card){ continue; }

    const options: { total: number; flipped: boolean; swapped: boolean }[] = [];
    if(cardId === PazaakCards.DOUBLE){
      options.push({ total: rawTotal + lastPlayedValue(table), flipped: false, swapped: false });
    }else if(cardId === PazaakCards.FLIP_2_AND_4){
      options.push({ total: previewBoardFlip(table, [2, 4]), flipped: false, swapped: false });
    }else if(cardId === PazaakCards.FLIP_3_AND_6){
      options.push({ total: previewBoardFlip(table, [3, 6]), flipped: false, swapped: false });
    }else if(cardId === PazaakCards.PLUS_MINUS_1_OR_2){
      options.push(potentialChangeTotal(card, cardId, table, maximize));
    }else if(isPlusMinusCard(cardId) || cardId === PazaakCards.TIE_BREAKER){
      for(const flipped of [true, false]){
        options.push({
          total: rawTotal + resolveSideCardDelta(card, cardId, flipped, false, table),
          flipped,
          swapped: false,
        });
      }
    }else{
      options.push({
        total: rawTotal + resolveSideCardDelta(card, cardId, false, false, table),
        flipped: false,
        swapped: false,
      });
    }

    for(const option of options){
      const total = option.total > 20 ? BUST : option.total;
      let take = false;
      if(maximize){
        take = total > pick.total;
      }else{
        take = total > BUST && (total < pick.total || (isTSL && pick.total === BUST));
      }
      if(!take && total === pick.total && bestIsPlusMinus){
        take = true;
      }
      if(take){
        pick.total = total;
        pick.handIndex = i;
        pick.flipped = option.flipped;
        pick.swapped = option.swapped;
        bestIsPlusMinus = isPlusMinusCard(cardId);
      }
    }
  }

  return pick;
}

/**
 * TSL ±1/±2 card: when maximizing take the first non-bust of +2, +1, -1, -2;
 * when minimizing always use -2.
 */
function potentialChangeTotal(
  card: IPazaakCard,
  cardId: number,
  table: IPazaakTable,
  maximize: boolean
): { total: number; flipped: boolean; swapped: boolean } {
  const order = maximize
    ? [
        { flipped: false, swapped: true },
        { flipped: false, swapped: false },
        { flipped: true, swapped: false },
        { flipped: true, swapped: true },
      ]
    : [{ flipped: true, swapped: true }];
  let result = { total: 0, ...order[0] };
  for(const option of order){
    result = {
      total: table.points + resolveSideCardDelta(card, cardId, option.flipped, option.swapped, table),
      ...option,
    };
    if(result.total <= 20){
      break;
    }
  }
  return result;
}

/**
 * [Sound Effects]
 * - mgs_playside
 * - mgs_drawmain
 * - mgs_loseset
 * - mgs_losematch
 * - mgs_winmatch
 * - mgs_winset
 * - mgs_warnbust
 */

enum PazaakActionType {
  WAIT = 0,
  DRAW_CARD = 1,
  PLAY_HAND_CARD = 2,
  PLAY_GUI_SOUND = 3,
  BEGIN_TURN = 4,
  END_TURN = 5,
  BEGIN_ROUND = 6,
  END_ROUND = 7,
  END_GAME = 8,
  AI_DETERMINE_MOVE = 9,
  SHOW_MESSAGE = 10
}

enum PazaakActionPropertyType {
  STRING = 0,
  NUMBER = 1
}

interface IPazaakActionProperty {
  type: PazaakActionPropertyType;
  value: string | number;
}

interface IPazaakAction {
  type: PazaakActionType;
  tableIndex: number;
  properties: IPazaakActionProperty[];
}

interface IPazaakConfig {
  name: string;
  textures: {name: string, file: string}[];
  data: {
    rounds: number;
    mainDeckCards: IPazaakCard[];
    sideDeckCards: IPazaakCard[];
  }
}

export class PazaakManager {

  static Config: IPazaakConfig = PazaakConfig_TSL;
  static Wager: number = 100;
  static MinWager: number = 1;
  static MaxWager: number = 100;
  static EndScript: string = '';
  static EndScriptInstance: NWScriptInstance = undefined;
  static ShowTutorial: boolean = false;
  static Opponent: Creature = undefined;
  // static OpponentDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>;
  static Cards: Map<PazaakCards, IPTPazaakCard> = new Map<PazaakCards, IPTPazaakCard>();
  // static SideDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>;
  static Won: boolean = false;

  static TotalSideDeckCards: number = 0;
  static TotalMainDeckCards: number = 0;
  static WaitTimer: number = 0;
  static TargetPoints: number = 20;

  static PlayerSideDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();
  static OpponentSideDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();

  static TurnState: PazaakTurnState = PazaakTurnState.INVALID;

  static Tables: IPazaakTable[] = [
    {
      points: 0,
      winCount: 0,
      stand: false,
      turnState: PazaakTurnState.INVALID,
      cardArea: new Map<PazaakTableSlots, IPazaakCard>(),
      sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
      handCards: new Map<PazaakHandSlots, PazaakCards>(),
      handCardPlayed: false,
      flipCards: new Map<PazaakHandSlots, boolean>(),
      swapValueCards: new Map<PazaakHandSlots, boolean>(),
      tieBreaker: false
    },
    {
      points: 0,
      winCount: 0,
      stand: false,
      turnState: PazaakTurnState.INVALID,
      cardArea: new Map<PazaakTableSlots, IPazaakCard>(),
      sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
      handCards: new Map<PazaakHandSlots, PazaakCards>(),
      handCardPlayed: false,
      flipCards: new Map<PazaakHandSlots, boolean>(),
      swapValueCards: new Map<PazaakHandSlots, boolean>(),
      tieBreaker: false
    }
  ];

  static TurnMode: PazaakTurnMode = PazaakTurnMode.PLAYER;
  static Actions: IPazaakAction[] = [];
  static TargetWins: number = 3;
  /** Current step of the AI's turn (see PazaakAIResult). */
  static AIState: number = 0;

  /** Shuffled main deck, drawn from the end. Persists across sets until exhausted. */
  static MainDeck: IPazaakCard[] = [];
  static MainDeckIndex: number = -1;
  /** TSL alternates who opens each set; the player opens the first. */
  static PlayerOpensNextSet: boolean = true;

  static get IsTSL(): boolean {
    return GameState.GameKey != GameEngineType.KOTOR;
  }

  static {
    PazaakManager.Initialize();
  }

  /**
   * Initialize the Pazaak manager
   */
  static Initialize(){
    console.log(`PazaakManager: Initializing`);
    /**
     * Pazaak Cards — indices 0.. MAX_CARDS-1 (TSL includes gold 18..22).
     * - index 0-4: start with 2 cards
     * - remaining: 0
     */
    for(let i = 0; i < PazaakCards.MAX_CARDS; i++){
      this.Cards.set(i, {
        card: i,
        count: (i < 5) ? 2 : 0
      });
    }

    /**
     * Pazaak Side Deck
     * - index 0-9: unset equals INVALID card (-1)
     * - the value of the card is the index of the card in the PazaakCards enum
     */
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      this.Tables[0].sideDeck.set(i, PazaakCards.INVALID);
    }

    /**
     * Pazaak Player Side Deck
     */
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      this.PlayerSideDeck.set(i, PazaakCards.INVALID);
    }

    this.Won = false;
    this.Actions = [];
  }

  static StartGame(){
    /**
     * Set the config based on the game engine
     */
    if(GameState.GameKey == GameEngineType.KOTOR){
      PazaakManager.Config = PazaakConfig_KOTOR;
    }else{
      PazaakManager.Config = PazaakConfig_TSL;
    }
    // A MaxWager of zero or less disables credits and the wager screen.
    if(this.MaxWager <= 0){
      this.MaxWager = 0;
      this.Wager = 0;
    }
    PazaakTutorial.reset();
    PazaakTutorial.setEnabled(!!this.ShowTutorial);
    this.TotalMainDeckCards = PazaakManager.Config.data.mainDeckCards.length;
    this.TotalSideDeckCards = PazaakManager.Config.data.sideDeckCards.length;
    this.Won = false;
    this.TurnMode = PazaakTurnMode.PLAYER;
    for(let j = 0; j < 2; j++){
      this.Tables[j].points = 0;
      this.Tables[j].winCount = 0;
      this.Tables[j].stand = false;
      this.Tables[j].tieBreaker = false;
      /**
       * Pazaak Card Area
       * - A pazaak table can have up to 9 cards on the table
       */
      for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
        this.Tables[j].cardArea.set(i, undefined);
      }

      /**
       * Pazaak Side Deck
       * - index 0-9: unset equals INVALID card (-1)
       * - the value of the card is the index of the card in the PazaakCards enum
       */
      for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
        this.Tables[j].sideDeck.set(i, PazaakCards.INVALID);
      }
    }

    this.Actions = [];
    GameState.MenuManager.MenuPazaakSetup.open();
  }

  /**
   * Set the opponent
   * @param creature - The creature to set
   */
  static SetOpponent(creature: Creature){
    this.Opponent = creature;
  }

  /**
   * Set the end script
   * @param script - The script to set
   */
  static SetEndScript(script: string){
    this.EndScript = script;
    try{
      this.EndScriptInstance = GameState.NWScript.Load(this.EndScript, true);
    }catch(e){
      console.error(`PazaakManager: Failed to load end script ${this.EndScript}: ${e}`);
    }
  }

  /**
   * Set the opponent's deck
   * @param deckIndex - The index of the deck to set
   */
  static SetOpponentDeck(deckIndex: number){
    const decks = GameState.SWRuleSet.pazaakDecks;
    // A negative deck index picks a random row from pazaakdecks.2da.
    if(deckIndex < 0 && decks.length){
      deckIndex = Math.floor(Math.random() * decks.length);
    }
    const deckConfig = decks[deckIndex] || decks[0];
    const deck = new Map<PazaakSideDeckSlots, PazaakCards>();
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      const card = deckConfig.cards[i];
      if(card == PazaakCards.INVALID){
        console.error(`PazaakManager: Invalid card modifier ${deckConfig.cards[i]} for deck ${deckIndex}`);
      }
      deck.set(i, card != PazaakCards.INVALID ? card : PazaakCards.PLUS_1);
    }
    this.OpponentSideDeck = deck;
  }

  /**
   * Add a card to the main deck
   * @param cardIndex - The index of the card to add
   * @param count - The number of cards to add
   * @returns true if the card was added, false otherwise
   */
  static AddCard(cardIndex: PazaakCards, count: number = 1){
    if(cardIndex <= PazaakCards.INVALID || cardIndex >= PazaakCards.MAX_CARDS){
      return false;
    }

    const card = this.Cards.get(cardIndex);
    card.count += count;
    return true;
  }

  /**
   * Remove a card from the main deck
   * @param cardIndex - The index of the card to remove
   * @param count - The number of cards to remove
   * @returns true if the card was removed, false otherwise
   */
  static RemoveCard(cardIndex: PazaakCards, count: number = 1){
    if(cardIndex <= PazaakCards.INVALID || cardIndex >= PazaakCards.MAX_CARDS){
      return false;
    }

    const card = this.Cards.get(cardIndex);
    card.count -= count;
    //If the card count is less than 0, set it to 0
    if(card.count <= 0){
      card.count = 0;
      return false;
    }
    return true;
  }

  /**
   * Move a card to the side deck
   * @param card - The card to move
   * @param sideDeckIndex - The index of the side deck card to move
   */
  static MoveCardToSideDeck(card: PazaakCards, sideDeckIndex: number){
    const currentSDCard = this.PlayerSideDeck.get(sideDeckIndex);
    //If the side deck card is valid, add it to the main deck
    if(currentSDCard != PazaakCards.INVALID && currentSDCard < PazaakCards.MAX_CARDS){
      this.AddCard(currentSDCard, 1);
    }
    //Set the side deck card to the new card
    this.PlayerSideDeck.set(sideDeckIndex, card);
    this.RemoveCard(card, 1);
  }

  /**
   * Move a side deck card to the main deck
   * @param sideDeckIndex - The index of the side deck card to move
   */
  static MoveSideDeckCardToMainDeck(sideDeckIndex: number){
    const card = this.PlayerSideDeck.get(sideDeckIndex);
    //If the side deck card is valid, add it to the main deck
    if(card != PazaakCards.INVALID && card < PazaakCards.MAX_CARDS){
      this.AddCard(card, 1);
    }
    //Set the side deck card to an invalid value to clear the slot
    this.PlayerSideDeck.set(sideDeckIndex, PazaakCards.INVALID);
  }

  /**
   * Increase the wager
   * @param amount - The amount to increase the wager by
   */
  static IncreaseWager(amount: number = 1){
    this.Wager += amount;
    if(this.Wager > this.MaxWager){
      this.Wager = this.MaxWager;
    }
  }

  /**
   * Decrease the wager
   * @param amount - The amount to decrease the wager by
   */
  static DecreaseWager(amount: number = 1){
    this.Wager -= amount;
    if(this.Wager < this.MinWager){
      this.Wager = this.MinWager;
    }
  }

  /**
   * Cancel the Pazaak game from the wager/setup screen.
   */
  static CancelPazaak(){
    if(GameState.MenuManager?.MenuPazaakWager?.bVisible){
      GameState.MenuManager.MenuPazaakWager.close();
    }
    if(GameState.MenuManager?.MenuPazaakSetup?.bVisible){
      GameState.MenuManager.MenuPazaakSetup.close();
    }
  }

  static ProcessActionQueue(delta: number){
    if(this.Actions.length == 0){
      return;
    }

    const action = this.Actions[0];
    let actionStatus: ActionStatus = ActionStatus.IN_PROGRESS;
    /**
     * Wait for a specified amount of time
     */
    if(action.type == PazaakActionType.WAIT){
      let time = (action.properties[1].value as number) || 0;
      time += delta;
      action.properties[1].value = time;
      if(time >= (action.properties[0].value as number)){
        actionStatus = ActionStatus.COMPLETE;
      }
    }
    /**
     * Play a GUI sound
     */
    else if(action.type == PazaakActionType.PLAY_GUI_SOUND){
      GameState.guiAudioEmitter.playSoundFireAndForget(this.GetActionPropertyAsString(0, 0));
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * Begin the round
     */
    else if(action.type == PazaakActionType.BEGIN_ROUND){
      // K1: the player always opens. TSL: the opener alternates every set.
      let opener = PazaakTurnMode.PLAYER;
      if(this.IsTSL){
        opener = this.PlayerOpensNextSet ? PazaakTurnMode.PLAYER : PazaakTurnMode.OPPONENT;
        this.PlayerOpensNextSet = !this.PlayerOpensNextSet;
      }
      console.log(`PazaakManager: Begin round... ${opener == PazaakTurnMode.PLAYER ? 'Player' : 'Opponent'} starts first.`);
      this.TurnMode = opener;
      for(let i = 0; i < this.Tables.length; i++){
        this.Tables[i].points = 0;
        this.Tables[i].stand = false;
        this.Tables[i].tieBreaker = false;
        this.Tables[i].handCardPlayed = false;
        for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
          this.Tables[i].cardArea.set(j, undefined);
        }
      }
      this.AddActionFront(this.TurnMode, PazaakActionType.BEGIN_TURN, [opener]);
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * Begin the turn
     */
    else if(action.type == PazaakActionType.BEGIN_TURN){
      const tableIndex = this.GetActionPropertyAsNumber(0, 0);
      console.log(`PazaakManager: Begin turn ${tableIndex == 0 ? `Player` : `Opponent`}`);
      const table = this.Tables[tableIndex];
      table.handCardPlayed = false;
      if(table.stand){
        this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
      }else if(tableIndex == PazaakTurnMode.OPPONENT){
        // The AI's turn always starts with its draw step.
        this.AIState = 0;
        this.AddActionFront(tableIndex, PazaakActionType.AI_DETERMINE_MOVE, [tableIndex]);
        this.AddActionFront(tableIndex, PazaakActionType.WAIT, [0.5, 0]);
        this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_startturn']);
        this.queueTutorialHelp(PazaakTutorial.beginEnemyTurnHelpIfNeeded());
      }else{
        this.AddActionFront(tableIndex, PazaakActionType.DRAW_CARD, [tableIndex]);
        this.AddActionFront(tableIndex, PazaakActionType.WAIT, [0.5, 0]);
        this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_startturn']);
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * End the turn
     * end early if the player busted
     * if it was the players turn, begin the opponent's turn
     * else end the round
     */
    else if(action.type == PazaakActionType.END_TURN){
      const tableIndex = this.GetActionPropertyAsNumber(0, 0);
      const bStanding = this.GetActionPropertyAsNumber(0, 1) == 1;
      console.log(`PazaakManager: End turn ${tableIndex == 0 ? 'Player' : 'Opponent'} [${bStanding ? 'standing' : 'not standing'}]`);
      const table = this.Tables[tableIndex];
      // Standing is permanent for the rest of the set; ending a turn never clears it.
      if(bStanding){
        table.stand = true;
      }

      if(table.stand){
        this.TurnState = PazaakTurnState.STAND;
      }else{
        this.TurnState = PazaakTurnState.END_TURN;
      }

      // A bust forces both sides to stand so the set resolves immediately.
      const playerPoints = this.Tables[0].points;
      const opponentPoints = this.Tables[1].points;
      if(playerPoints > this.TargetPoints || opponentPoints > this.TargetPoints){
        this.Tables[0].stand = true;
        this.Tables[1].stand = true;
      }
      if(this.Tables[0].stand && this.Tables[1].stand){
        this.AddAction(this.TurnMode, PazaakActionType.END_ROUND);
      }else{
        //if the players are not tied or both busted or both stood, begin the next turn
        if(this.TurnMode == PazaakTurnMode.PLAYER){
          this.TurnMode = PazaakTurnMode.OPPONENT;
          this.AddAction(this.TurnMode, PazaakActionType.BEGIN_TURN, [PazaakTurnMode.OPPONENT]);
        }else{
          this.TurnMode = PazaakTurnMode.PLAYER;
          this.AddAction(this.TurnMode, PazaakActionType.BEGIN_TURN, [PazaakTurnMode.PLAYER]);
        }
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * End the round
     * queue up the next round or end the game
     */
    else if(action.type == PazaakActionType.END_ROUND){
      //calculate the result of the round
      const playerPoints = this.Tables[PazaakTurnMode.PLAYER].points;
      const opponentPoints = this.Tables[PazaakTurnMode.OPPONENT].points;
      console.log(`PazaakManager: End round ${playerPoints} - ${opponentPoints}`);
      // -1 tied, 0 player wins, 1 opponent wins
      const result = this.determineSetWinner();

      // Result message first, then the set/match sound once the score is bumped.
      if(result == -1){
        this.AddAction(this.TurnMode, PazaakActionType.SHOW_MESSAGE, [MSG_TIED]);
      }else if(result == PazaakTurnMode.PLAYER){
        this.AddAction(this.TurnMode, PazaakActionType.SHOW_MESSAGE, [MSG_YOU_WIN]);
      }else{
        this.AddAction(this.TurnMode, PazaakActionType.SHOW_MESSAGE, [MSG_YOU_LOSE]);
      }

      this.AddAction(this.TurnMode, PazaakActionType.WAIT, [1, 0]);

      if(result == PazaakTurnMode.PLAYER){
        this.Tables[PazaakTurnMode.PLAYER].winCount++;
        this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, [
          pazaakSetOrMatchSfx('player', this.Tables[PazaakTurnMode.PLAYER].winCount, this.TargetWins)
        ]);
      }else if(result == PazaakTurnMode.OPPONENT){
        this.Tables[PazaakTurnMode.OPPONENT].winCount++;
        this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, [
          pazaakSetOrMatchSfx('opponent', this.Tables[PazaakTurnMode.OPPONENT].winCount, this.TargetWins)
        ]);
      }

      if(this.Tables[PazaakTurnMode.PLAYER].winCount >= this.TargetWins){
        if(PazaakTutorial.enabled){
          // The tutorial shows its match-over help and ends the game when closed.
          this.queueTutorialHelp(PazaakTutorial.beginMatchOverHelp());
        }else{
          this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.PLAYER]);
        }
      }else if(this.Tables[PazaakTurnMode.OPPONENT].winCount >= this.TargetWins){
        if(PazaakTutorial.enabled){
          this.queueTutorialHelp(PazaakTutorial.beginMatchOverHelp());
        }else{
          this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.OPPONENT]);
        }
      }else{
        if(PazaakTutorial.enabled){
          this.queueTutorialHelp(PazaakTutorial.beginNextSetHelp());
        }
        this.AddAction(this.TurnMode, PazaakActionType.BEGIN_ROUND);
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    else if(action.type == PazaakActionType.END_GAME){
      const winner = this.GetActionPropertyAsNumber(0, 0);
      this.Won = winner == PazaakTurnMode.PLAYER;
      // A MaxWager of zero or less leaves the player's credits untouched.
      if(this.MaxWager > 0 && this.Wager > 0){
        // Winning pays the wager; losing costs it, but never below zero credits.
        const player = GameState.PartyManager.Player;
        const gold = player ? player.getGold() : 0;
        const winnings = this.Won ? this.Wager : -Math.min(this.Wager, Math.max(gold, 0));
        if(player && winnings !== 0){
          player.addGold(winnings);
        }
        console.log(`PazaakManager: End game ${winner == PazaakTurnMode.PLAYER ? 'Player' : 'Opponent'} wins! | ${winnings} gold`);
      }else{
        console.log(`PazaakManager: End game ${winner == PazaakTurnMode.PLAYER ? 'Player' : 'Opponent'} wins! | credits muted (MaxWager<=0)`);
      }
      GameState.MenuManager.MenuPazaakGame.close();
      if(this.EndScriptInstance){
        this.EndScriptInstance.run(this.Opponent);
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * Draw a random card from the main deck
     */
    else if(action.type == PazaakActionType.DRAW_CARD){
      this.TurnState = PazaakTurnState.DRAW_CARD;
      const tableIndex = this.GetActionPropertyAsNumber(0, 0);
      const table = this.Tables[tableIndex];
      console.log(`PazaakManager: Draw card ${tableIndex == 0 ? 'Player' : 'Opponent'}`);

      const cardDrawn = this.addGameCard(table, this.drawMainDeckCard()) >= 0;
      if(tableIndex == PazaakTurnMode.PLAYER){
        this.applyPlayerLeadStand();
      }

      // A bust does not end the set on its own: the player may still recover with a
      // side card, and the set resolves once the turn ends.
      if(tableIndex == PazaakTurnMode.PLAYER){
        if(table.stand){
          this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
        }else{
          this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
        }
        if(table.points > this.TargetPoints){
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
        }
        if(cardDrawn){
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
        }
      }else{
        this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
        if(table.points > this.TargetPoints){
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
        }
        this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
      }
      if(tableIndex == PazaakTurnMode.PLAYER && cardDrawn){
        // First draw shows the drawn-card help; later draws show bust / twenty help.
        const drawnHelp = PazaakTutorial.beginDrawnCardHelpIfNeeded();
        if(drawnHelp){
          this.queueTutorialHelp(drawnHelp);
        }else{
          this.queueTutorialHelp(PazaakTutorial.beginTotalHelp(table.points));
        }
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * Play a hand card
     */
    else if(action.type == PazaakActionType.PLAY_HAND_CARD){
      this.TurnState = PazaakTurnState.PLAY_HAND_CARD;
      const tableIndex = this.GetActionPropertyAsNumber(0, 0);
      const handIndex = this.GetActionPropertyAsNumber(0, 1);
      const flipped = this.GetActionPropertyAsNumber(0, 2) == 1;
      const swapped = this.GetActionPropertyAsNumber(0, 3) == 1;
      console.log(`PazaakManager: Play hand card ${tableIndex == 0 ? 'Player' : 'Opponent'} ${handIndex} ${flipped ? 'flipped' : 'not flipped'} ${swapped ? 'swapped' : ''}`);

      const table = this.Tables[tableIndex];
      const cardIndex = table.handCards.get(handIndex);
      if(cardIndex == undefined || cardIndex == PazaakCards.INVALID){
        console.error(`PazaakManager: Invalid hand card ${handIndex}`);
        this.Actions.splice(this.Actions.indexOf(action), 1);
        return;
      }

      const template: IPazaakCard = this.Config.data.sideDeckCards[cardIndex];
      if(template && this.getFirstEmptySlot(table) >= 0){
        // Flip specials act on the board before the flip card itself is placed.
        if(cardIndex === PazaakCards.FLIP_2_AND_4){
          applyBoardFlip(table, [2, 4]);
        }else if(cardIndex === PazaakCards.FLIP_3_AND_6){
          applyBoardFlip(table, [3, 6]);
        }

        const delta = resolveSideCardDelta(template, cardIndex, flipped, swapped, table);
        const label = sideCardDisplayLabel(template, cardIndex, flipped, swapped);
        if(cardIndex === PazaakCards.TIE_BREAKER){
          table.tieBreaker = true;
        }

        this.addGameCard(table, {
          ...template,
          flipped,
          cardId: cardIndex,
          playedValue: delta,
          modifierLabel: cardIndex === PazaakCards.DOUBLE && delta !== 0
            ? (delta > 0 ? `+${delta}` : `${delta}`)
            : label
        });
        table.handCards.set(handIndex, PazaakCards.INVALID);
        table.flipCards.set(handIndex, false);
        table.swapValueCards.set(handIndex, false);
        table.handCardPlayed = true;
        if(tableIndex == PazaakTurnMode.PLAYER){
          this.applyPlayerLeadStand();
        }
      }

      // A player who reaches 20, fills the board, or (TSL) takes the lead over a
      // standing opponent stands automatically. The AI's next step handles its own.
      if(tableIndex == PazaakTurnMode.PLAYER && table.stand){
        this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
      }
      this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
      this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_playside']);

      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * AI determines its next move.
     */
    else if(action.type == PazaakActionType.AI_DETERMINE_MOVE){
      console.log(`PazaakManager: AI determining move (state ${this.AIState})...`);
      const tableIndex = PazaakTurnMode.OPPONENT;
      const decision = this.playAITurn(this.AIState);
      this.AIState = decision.code;

      switch(decision.code){
        case PazaakAIResult.DRAW:
          this.AddActionFront(tableIndex, PazaakActionType.AI_DETERMINE_MOVE, [tableIndex]);
          this.AddActionFront(tableIndex, PazaakActionType.DRAW_CARD, [tableIndex]);
          this.AddActionFront(tableIndex, PazaakActionType.WAIT, [0.4, 0]);
          break;
        case PazaakAIResult.PLAY_SIDE:
          this.AddActionFront(tableIndex, PazaakActionType.AI_DETERMINE_MOVE, [tableIndex]);
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_HAND_CARD, [
            tableIndex,
            decision.handIndex,
            decision.flipped ? 1 : 0,
            decision.swapped ? 1 : 0
          ]);
          this.AddActionFront(tableIndex, PazaakActionType.WAIT, [0.4, 0]);
          break;
        case PazaakAIResult.STAND:
          this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
          break;
        case PazaakAIResult.PASS:
          this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 0]);
          break;
        case PazaakAIResult.DONE:
        default:
          break;
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * Show a message
     */
    else if(action.type == PazaakActionType.SHOW_MESSAGE){
      const tlkId = this.GetActionPropertyAsNumber(0, 0);
      GameState.MenuManager.InGameConfirm.fromStringRef(tlkId);
      actionStatus = ActionStatus.COMPLETE;
    }
    if(actionStatus == ActionStatus.COMPLETE){
      this.Actions.splice(this.Actions.indexOf(action), 1);
    }
  }

  static GetActionPropertyAsString(actionIndex: number, propertyIndex: number): string {
    return this.Actions[actionIndex].properties[propertyIndex].value as string;
  }

  static GetActionPropertyAsNumber(actionIndex: number, propertyIndex: number): number {
    const prop = this.Actions[actionIndex]?.properties?.[propertyIndex];
    if(!prop){ return 0; }
    return prop.value as number;
  }

  //-----------------//
  // Turn Management //
  //-----------------//

  static BuildAction(tableIndex: number, actionType: PazaakActionType, properties: any[] = []){
    const props: IPazaakActionProperty[] = [];
    for(let i = 0; i < properties.length; i++){
      let type = typeof properties[i] === 'string' ? PazaakActionPropertyType.STRING : PazaakActionPropertyType.NUMBER;
      props.push({
        type: type,
        value: properties[i]
      });
    }
    return {
      type: actionType,
      tableIndex: tableIndex,
      properties: props
    };
  }

  static AddAction(tableIndex: number, actionType: PazaakActionType, properties: any[] = []){
    const action = this.BuildAction(tableIndex, actionType, properties);
    this.Actions.push(action);
  }

  static AddActionFront(tableIndex: number, actionType: PazaakActionType, properties: any[] = []){
    const action = this.BuildAction(tableIndex, actionType, properties);
    this.Actions.unshift(action);
  }

  static ClearActions(){
    this.Actions = [];
  }

  /**
   * One step of the AI's turn. Steps: 0 draw, 1 consider a side card after the draw,
   * 2 decide to stand or pass, 3/4 the turn is over.
   */
  static playAITurn(aiState: number): { code: number; handIndex: number; flipped: boolean; swapped: boolean } {
    const ai = this.Tables[PazaakTurnMode.OPPONENT];
    const player = this.Tables[PazaakTurnMode.PLAYER];
    const sideCards = this.Config.data.sideDeckCards;
    const isTSL = this.IsTSL;
    const result = (code: PazaakAIResult, pick?: IPazaakSidecardPick) => ({
      code,
      handIndex: pick ? pick.handIndex : -1,
      flipped: pick ? pick.flipped : false,
      swapped: pick ? pick.swapped : false,
    });

    let playerTotal = player.points;
    if(playerTotal > 20){
      playerTotal = BUST;
      player.stand = true;
    }

    switch(aiState){
      case 0:
        if(ai.stand){
          return result(PazaakAIResult.DONE);
        }
        return result(PazaakAIResult.DRAW);

      case 1: {
        const aiRaw = ai.points;
        const earlySets = (player.winCount + 1) < 3;
        // Already ahead of a standing player (TSL also stands on a full board).
        if(
          player.stand &&
          ((playerTotal < aiRaw && aiRaw < 21) || (isTSL && this.getCardsPlayed(ai) > 8))
        ){
          return result(PazaakAIResult.STAND);
        }

        const minSide = findPotentialSidecardTotal(ai, sideCards, false, isTSL);
        const maxSide = findPotentialSidecardTotal(ai, sideCards, true, isTSL);

        if(
          maxSide.total > 17 &&
          playerTotal <= maxSide.total &&
          (maxSide.total > 19 || (maxSide.total > 18 && minSide.total > 11) || minSide.total > 13) &&
          maxSide.handIndex >= 0
        ){
          return result(PazaakAIResult.PLAY_SIDE, maxSide);
        }

        if(aiRaw > 20){
          if(earlySets && playerTotal > 17 && maxSide.total < playerTotal){
            return result(PazaakAIResult.PASS);
          }
          if(maxSide.handIndex >= 0){
            return result(PazaakAIResult.PLAY_SIDE, maxSide);
          }
        }
      }
      // falls through to the stand / pass decision
      case 2: {
        const aiCmp = ai.points > 20 ? BUST : ai.points;
        if(player.stand && aiCmp < playerTotal){
          return result(PazaakAIResult.PASS);
        }
        if(aiCmp < 18){
          const minSide = findPotentialSidecardTotal(ai, sideCards, false, isTSL);
          if(minSide.total < 16){
            return result(PazaakAIResult.PASS);
          }
        }
        return result(PazaakAIResult.STAND);
      }

      case 3:
      case 4:
        return result(PazaakAIResult.DONE);

      default:
        return result(PazaakAIResult.PASS);
    }
  }

  //------------//
  // Card Rules //
  //------------//

  /**
   * Build and shuffle the 40 card main deck (four of each card 1..10).
   */
  static ShuffleMainDeck(){
    const templates = this.Config.data.mainDeckCards;
    const deck: IPazaakCard[] = [];
    for(let copy = 0; copy < MAIN_DECK_COPIES; copy++){
      for(let i = 0; i < templates.length; i++){
        deck.push(templates[i]);
      }
    }
    for(let i = deck.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    this.MainDeck = deck;
    this.MainDeckIndex = deck.length - 1;
  }

  /**
   * Draw the next main deck card, reshuffling a fresh deck once it runs out.
   */
  static drawMainDeckCard(): IPazaakCard {
    if(this.MainDeckIndex < 0 || !this.MainDeck.length){
      this.ShuffleMainDeck();
    }
    const template = this.MainDeck[this.MainDeckIndex--];
    return {
      ...template,
      flipped: false,
      playedValue: template.modifier[0],
    };
  }

  static getFirstEmptySlot(table: IPazaakTable): number {
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      if(table.cardArea.get(i) == undefined){
        return i;
      }
    }
    return -1;
  }

  static getCardsPlayed(table: IPazaakTable): number {
    let count = 0;
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      if(table.cardArea.get(i) != undefined){
        count++;
      }
    }
    return count;
  }

  /**
   * Place a card in the first open board slot. Reaching exactly 20 or filling the
   * ninth slot makes that side stand automatically.
   * @returns the slot used, or -1 if the board was full
   */
  static addGameCard(table: IPazaakTable, card: IPazaakCard): number {
    const slot = this.getFirstEmptySlot(table);
    if(slot >= 0){
      table.cardArea.set(slot, card);
      table.points += card.playedValue ?? card.modifier[0];
    }
    if(slot < 0 || slot >= PazaakTableSlots.MAX_SLOTS - 1 || table.points == this.TargetPoints){
      table.stand = true;
    }
    return slot;
  }

  /**
   * TSL: once the opponent is standing, a player who moves ahead while still
   * under 20 stands automatically.
   */
  static applyPlayerLeadStand(){
    if(!this.IsTSL){ return; }
    const player = this.Tables[PazaakTurnMode.PLAYER];
    const opponent = this.Tables[PazaakTurnMode.OPPONENT];
    if(
      opponent.stand &&
      opponent.points < player.points &&
      opponent.points > BUST &&
      player.points < this.TargetPoints &&
      opponent.points < this.TargetPoints
    ){
      player.stand = true;
    }
  }

  /**
   * Decide a set once both sides stand. Busts score lowest; the higher total wins.
   * TSL adds two rules: filling all nine slots without busting beats an opponent
   * who did not, and on equal totals a lone Tie Breaker wins.
   * @returns -1 tie, 0 player wins, 1 opponent wins
   */
  static determineSetWinner(): number {
    const player = this.Tables[PazaakTurnMode.PLAYER];
    const opponent = this.Tables[PazaakTurnMode.OPPONENT];
    const pScore = player.points > this.TargetPoints ? BUST : player.points;
    const oScore = opponent.points > this.TargetPoints ? BUST : opponent.points;

    if(this.IsTSL){
      const pFull = this.getCardsPlayed(player) == PazaakTableSlots.MAX_SLOTS;
      const oFull = this.getCardsPlayed(opponent) == PazaakTableSlots.MAX_SLOTS;
      if(pFull && !oFull && pScore != BUST){
        return PazaakTurnMode.PLAYER;
      }
      if(oFull && !pFull && oScore != BUST){
        return PazaakTurnMode.OPPONENT;
      }
    }

    if(pScore > oScore){
      return PazaakTurnMode.PLAYER;
    }
    if(oScore > pScore){
      return PazaakTurnMode.OPPONENT;
    }
    if(this.IsTSL){
      if(player.tieBreaker && !opponent.tieBreaker){
        return PazaakTurnMode.PLAYER;
      }
      if(opponent.tieBreaker && !player.tieBreaker){
        return PazaakTurnMode.OPPONENT;
      }
    }
    return -1;
  }

  /**
   * Begin the game
   */
  static BeginGame(){
    this.Tables[0].turnState = PazaakTurnState.DRAW_CARD;
    this.Tables[1].turnState = PazaakTurnState.WAITING;
    this.TurnMode = PazaakTurnMode.PLAYER;

    const tableCount = this.Tables.length;
    for(let i = 0; i < tableCount; i++){
      const table = this.Tables[i];
      const sideDeck = !i ? this.PlayerSideDeck : this.OpponentSideDeck;

      //Copy the side decks to the player and opponent tables
      for(let j = 0; j < PazaakSideDeckSlots.MAX_SLOTS; j++){
        table.sideDeck.set(j, sideDeck.get(j));
      }

      //Initialize the player's table
      for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
        table.cardArea.set(j, undefined);
      }

      /**
       * Deal the hand: four different slots picked at random from the ten card side deck.
       * The hand lasts the whole match; played cards are not replaced.
       */
      const remaining = Array.from(table.sideDeck.values()).filter(
        (card) => card != undefined && card != PazaakCards.INVALID
      );
      for(let j = 0; j < PazaakHandSlots.MAX_SLOTS; j++){
        table.handCards.set(j, PazaakCards.INVALID);
        table.flipCards.set(j, false);
        table.swapValueCards.set(j, false);
        if(remaining.length == 0){
          console.warn(`PazaakManager: No available side deck cards for player ${i}`);
          continue;
        }
        const pick = Math.floor(Math.random() * remaining.length);
        table.handCards.set(j, remaining[pick]);
        remaining.splice(pick, 1);
      }
    }

    this.MainDeck = [];
    this.MainDeckIndex = -1;
    this.PlayerOpensNextSet = true;

    this.ClearActions();
    this.AddAction(this.TurnMode, PazaakActionType.BEGIN_ROUND);
  }

  /**
   * Hand-card label for UI (FLIP / CHANGE state).
   */
  static getHandCardLabelText(cardId: number, flipped: boolean, swapped: boolean): string {
    const card = this.Config.data.sideDeckCards[cardId];
    if(!card){ return ''; }
    return sideCardDisplayLabel(card, cardId, flipped, swapped);
  }

  /**
   * Play a card from the player's hand
   * @param handIndex - The index of the card to play
   */
  static AddPlayHandCardAction(tableIndex: number, handIndex: number, flipped: boolean = false, swapped: boolean = false){
    this.AddActionFront(tableIndex, PazaakActionType.PLAY_HAND_CARD, [
      tableIndex,
      handIndex,
      flipped ? 1 : 0,
      swapped ? 1 : 0
    ]);
  }

  /**
   * TSL forfeit: after confirmation the match ends as an opponent win.
   */
  static AddForfeitAction(){
    this.ClearActions();
    this.AddAction(PazaakTurnMode.PLAYER, PazaakActionType.END_GAME, [PazaakTurnMode.OPPONENT]);
  }

  /**
   * Show tutorial help in an OK-only InGameConfirm.
   * ProcessActionQueue is already paused while the confirm is visible.
   */
  static queueTutorialHelp(strRef: number){
    if(!strRef){ return; }
    const confirm = GameState.MenuManager?.InGameConfirm;
    if(!confirm){ return; }
    confirm.showConfirmDialog(
      strRef,
      () => { PazaakManager.onTutorialHelpClosed(strRef); },
      () => { PazaakManager.onTutorialHelpClosed(strRef); }
    );
    confirm.showCancel = false;
    confirm.resizeModal?.();
  }

  /**
   * React to a tutorial help dialog being closed.
   */
  static onTutorialHelpClosed(closedStrRef: number){
    const result = PazaakTutorial.onHelpClosed(closedStrRef);
    switch(result.action){
      case PazaakTutorialAction.FORCE_STAND:
        this.AddStandAction(PazaakTurnMode.PLAYER);
        break;
      case PazaakTutorialAction.PLAY_SIDE: {
        const handIndex = PazaakTutorial.pendingHandIndex;
        if(handIndex >= 0){
          const table = this.Tables[PazaakTurnMode.PLAYER];
          const flipped = !!table.flipCards.get(handIndex);
          const swapped = !!table.swapValueCards.get(handIndex);
          this.AddPlayHandCardAction(PazaakTurnMode.PLAYER, handIndex, flipped, swapped);
          PazaakTutorial.pendingHandIndex = -1;
        }
        break;
      }
      case PazaakTutorialAction.END_GAME: {
        const playerScore = this.Tables[PazaakTurnMode.PLAYER].winCount;
        const enemyScore = this.Tables[PazaakTurnMode.OPPONENT].winCount;
        const winner = enemyScore < playerScore
          ? PazaakTurnMode.PLAYER
          : PazaakTurnMode.OPPONENT;
        this.ClearActions();
        this.AddAction(PazaakTurnMode.PLAYER, PazaakActionType.END_GAME, [winner]);
        break;
      }
      default:
        break;
    }
    if(result.nextStrRef){
      this.queueTutorialHelp(result.nextStrRef);
    }
  }

  /**
   * End the turn
   */
  static AddEndTurnAction(tableIndex: number){
    this.ClearActions();
    this.AddAction(tableIndex, PazaakActionType.END_TURN, [tableIndex, 0]);
  }

  /**
   * Player stands
   */
  static AddStandAction(tableIndex: number  ){
    this.ClearActions();
    this.AddAction(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
  }

}
