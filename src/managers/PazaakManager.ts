import { GameState } from "@/GameState";
import { PazaakCards } from "@/enums/minigames/PazaakCards";
import { PazaakHandSlots } from "@/enums/minigames/PazaakHandSlots";
import { PazaakSideDeckSlots } from "@/enums/minigames/PazaakSideDeckSlots";
import { PazaakTableSlots } from "@/enums/minigames/PazaakTableSlots";
import { PazaakTurnMode } from "@/enums/minigames/PazaakTurnMode";
import { PazaakTurnState } from "@/enums/minigames/PazaakTurnState";
import { IPTPazaakCard } from "@/interface/minigames/IPTPazaakCard";
import { IPazaakTable } from "@/interface/minigames/IPazaakTable";
import { ModuleCreature } from "@/module/ModuleCreature";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { PazaakConfig as PazaakConfig_TSL } from "@/game/tsl/minigames/mg-pazaak-config";
import { PazaakConfig as PazaakConfig_KOTOR } from "@/game/kotor/minigames/mg-pazaak-config";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { IPazaakCard } from "@/interface/minigames/IPazaakCard";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import type { PazaakDeck } from "@/engine/minigames/PazaakDeck";
import { pazaakSetOrMatchSfx } from "@/engine/minigames/pazaak-sfx";

const MSG_CONFIRM_SIDE_DECK = 32322;
const MSG_YOU_WIN = 32334;
const MSG_TIED = 32338;
const MSG_YOU_LOSE = 32335;

/** Retail PlayAITurn / DoAITurn return codes (next AI_state). */
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
}

/**
 * Retail CSWPazaak::FindPotentialSidecardTotal @ 006e4910.
 * maximize=true → param_3==0 (highest non-bust total); false → param_3==1 (lowest).
 */
function findPotentialSidecardTotal(
  table: IPazaakTable,
  sideDeckCards: IPazaakCard[],
  maximize: boolean
): IPazaakSidecardPick {
  const rawTotal = table.points;
  let bestTotal = rawTotal > 20 ? -1000000 : rawTotal;
  let bestIndex = -1;
  let bestFlipped = false;
  let prevWasReversible = false;

  for(let i = 0; i < PazaakHandSlots.MAX_SLOTS; i++){
    const cardId = table.handCards.get(i);
    if(cardId == undefined || cardId == PazaakCards.INVALID){
      continue;
    }
    const card = sideDeckCards[cardId];
    if(!card){ continue; }

    const reversible = !!card.reversible;
    // Retail: reversible tries flipped first (local_14==2), then unflipped.
    const passes = reversible ? [true, false] : [false];
    for(let p = 0; p < passes.length; p++){
      const flipped = passes[p];
      const mod = flipped ? card.modifier[1] : card.modifier[0];
      let newTotal = rawTotal + mod;
      if(newTotal > 20){
        newTotal = -1000000;
      }

      let take = false;
      if(maximize){
        if(newTotal > bestTotal){
          take = true;
        }else if(newTotal === bestTotal && prevWasReversible){
          take = true;
        }
      }else{
        if(newTotal < bestTotal){
          if(newTotal > -1000000){
            take = true;
          }
        }else if(newTotal === bestTotal && prevWasReversible){
          take = true;
        }
      }

      if(take){
        bestTotal = newTotal;
        bestIndex = i;
        bestFlipped = flipped;
        prevWasReversible = reversible;
      }
    }
  }

  return { total: bestTotal, handIndex: bestIndex, flipped: bestFlipped };
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
  static Opponent: ModuleCreature = undefined;
  // static OpponentDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();
  static Cards: Map<PazaakCards, IPTPazaakCard> = new Map<PazaakCards, IPTPazaakCard>();
  // static SideDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();
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
      swapValueCards: new Map<PazaakHandSlots, boolean>()
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
      swapValueCards: new Map<PazaakHandSlots, boolean>()
    }
  ];

  static TurnMode: PazaakTurnMode = PazaakTurnMode.PLAYER;
  static Actions: IPazaakAction[] = [];
  static TargetWins: number = 3;
  /** Retail CSWPazaak field6_0x22c — PlayAITurn state (0..4). */
  static AIState: number = 0;

  static {
    PazaakManager.Initialize();
  }

  /**
   * Initialize the Pazaak manager
   */
  static Initialize(){
    console.log(`PazaakManager: Initializing`);
    /**
     * Pazaak Cards
     * - index 0-4: 2 cards
     * - index 5-17: 0 cards
     * - index 18: unknown, always 0
     */
    for(let i = 0; i < PazaakCards.MAX_CARDS + 1; i++){
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
    // Retail ExecuteCommandPlayPazaak @ 00540fd0 — MaxWager<=0 mutes credits + wager UI.
    if(this.MaxWager <= 0){
      this.MaxWager = 0;
      this.Wager = 0;
    }
    this.TotalMainDeckCards = PazaakManager.Config.data.mainDeckCards.length;
    this.TotalSideDeckCards = PazaakManager.Config.data.sideDeckCards.length;
    this.Won = false;
    this.TurnMode = PazaakTurnMode.PLAYER;
    for(let j = 0; j < 2; j++){
      this.Tables[j].points = 0;
      this.Tables[j].winCount = 0;
      this.Tables[j].stand = false;
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
  static SetOpponent(creature: ModuleCreature){
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
    const deckConfig = GameState.SWRuleSet.pazaakDecks[deckIndex] ||
      GameState.SWRuleSet.pazaakDecks[0];
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
      console.log(`PazaakManager: Begin round... Player starts first.`);
      this.TurnMode = PazaakTurnMode.PLAYER;
      for(let i = 0; i < this.Tables.length; i++){
        this.Tables[i].points = 0;
        this.Tables[i].stand = false;
        for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
          this.Tables[i].cardArea.set(j, undefined);
        }
      }
      //Begin the player's turn
      this.AddActionFront(this.TurnMode, PazaakActionType.BEGIN_TURN, [PazaakTurnMode.PLAYER]);
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
        // Retail DoAITurn: AI_state starts at 0 (draw via PlayAITurn).
        this.AIState = 0;
        this.AddActionFront(tableIndex, PazaakActionType.AI_DETERMINE_MOVE, [tableIndex]);
        this.AddActionFront(tableIndex, PazaakActionType.WAIT, [0.5, 0]);
        this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_startturn']);
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
      table.stand = bStanding;

      if(bStanding){
        this.TurnState = PazaakTurnState.STAND;
      }else{
        this.TurnState = PazaakTurnState.END_TURN;
      }

      //check to see if either player busted
      const playerStand = this.Tables[0].stand;
      const opponentStand = this.Tables[1].stand;
      const playerPoints = this.Tables[0].points;
      const opponentPoints = this.Tables[1].points;
      const bBusted = (playerPoints > this.TargetPoints || opponentPoints > this.TargetPoints);
      // Retail DetermineWinner: bust forces both stand before comparing.
      if(bBusted){
        this.Tables[0].stand = true;
        this.Tables[1].stand = true;
      }
      const bTied = (playerPoints == this.TargetPoints && opponentPoints == this.TargetPoints);
      const bAllStand = (this.Tables[0].stand && this.Tables[1].stand);
      //if the players are tied or both busted or both stood, end the round
      if(bTied || bBusted || bAllStand){
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
      //[Results] retail CSWPazaak::DetermineWinner @ 006e48a0:
      // bust totals → -1000000; higher non-bust total wins; equal → tie.
      // -1 - tied
      //  0 - player wins
      //  1 - opponent wins
      let pScore = playerPoints > this.TargetPoints ? -1000000 : playerPoints;
      let oScore = opponentPoints > this.TargetPoints ? -1000000 : opponentPoints;
      let result = -1;
      if(pScore > oScore){
        result = PazaakTurnMode.PLAYER;
      }else if(oScore > pScore){
        result = PazaakTurnMode.OPPONENT;
      }

      // Retail DoGameSequence case 8/9 @ 006804c1: message first, then set/match SFX after score++.
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
        this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.PLAYER]);
      }else if(this.Tables[PazaakTurnMode.OPPONENT].winCount >= this.TargetWins){
        this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.OPPONENT]);
      }else{
        //The player always starts the next round
        this.TurnMode = PazaakTurnMode.PLAYER;
        this.AddAction(this.TurnMode, PazaakActionType.BEGIN_ROUND, [PazaakTurnMode.PLAYER]);
      }
      actionStatus = ActionStatus.COMPLETE;
    }
    else if(action.type == PazaakActionType.END_GAME){
      const winner = this.GetActionPropertyAsNumber(0, 0);
      this.Won = winner == PazaakTurnMode.PLAYER;
      // Retail: MaxWager<=0 → do not modify player credits.
      if(this.MaxWager > 0 && this.Wager !== 0){
        const winnings = this.Won ? this.Wager * 2 : -this.Wager * 2;
        if(GameState.PartyManager.Player){
          GameState.PartyManager.Player.addGold(winnings);
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
      let cardDrawn = false;
      const tableIndex = this.GetActionPropertyAsNumber(0, 0);
      const table = this.Tables[tableIndex];
      console.log(`PazaakManager: Draw card ${tableIndex == 0 ? 'Player' : 'Opponent'}`);

      /**
       * Draw a card from the main deck
       */
      for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
        const card = table.cardArea.get(i);
        if(card != undefined){
          continue;
        }
        const randomCardIdx = Math.floor(Math.random() * this.Config.data.mainDeckCards.length);
        table.cardArea.set(i, this.Config.data.mainDeckCards[randomCardIdx]);
        table.points += this.Config.data.mainDeckCards[randomCardIdx].modifier[0];
        cardDrawn = true;
        break;
      }

      /**
       * Player: stand on 20 / bust ends round / full board ends turn.
       * Opponent: AI continues via queued AI_DETERMINE_MOVE (PlayAITurn state 1).
       */
      // Retail DoGameSequence: drawmain after Draw*Card; warnbust when total > 20.
      if(tableIndex == PazaakTurnMode.PLAYER){
        if(table.points == this.TargetPoints){
          this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex, 1]);
          if(cardDrawn){
            this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
          }
        }else if(table.points > this.TargetPoints){
          this.AddActionFront(tableIndex, PazaakActionType.END_ROUND);
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
          if(cardDrawn){
            this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
          }
        }else if(!cardDrawn){
          this.AddActionFront(tableIndex, PazaakActionType.END_TURN, [tableIndex]);
        }else{
          this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
        }
      }else{
        this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
        if(table.points > this.TargetPoints){
          this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
        }
        this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
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
      console.log(`PazaakManager: Play hand card ${tableIndex == 0 ? 'Player' : 'Opponent'} ${handIndex} ${flipped ? 'flipped' : 'not flipped'}`);

      const table = this.Tables[tableIndex];
      const cardIndex = table.handCards.get(handIndex);
      if(cardIndex == PazaakCards.INVALID){
        console.error(`PazaakManager: Invalid hand card ${handIndex}`);
        return;
      }

      for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
        const tableCard = table.cardArea.get(i);
        if(tableCard != undefined){
          continue;
        }
        console.log(`PazaakManager: Play hand card ${tableIndex == 0 ? 'Player' : 'Opponent'} ${i + 1} ${flipped ? 'flipped' : 'not flipped'}`);
        const card: IPazaakCard = this.Config.data.sideDeckCards[cardIndex];
        card.flipped = flipped;
        //Play the card
        table.cardArea.set(i, card);
        //Remove the card from the player's hand
        table.handCards.set(handIndex, PazaakCards.INVALID);
        table.points += card.modifier[!flipped ? 0 : 1];
        table.handCardPlayed = true;
        break;
      }

      this.AddActionFront(tableIndex, PazaakActionType.WAIT, [1, 0]);
      this.AddActionFront(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_playside']);

      // Opponent side-card: retail returns state 2; next AI_DETERMINE_MOVE continues PlayAITurn.
      // Player side-card: UI / player chooses stand separately.

      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * AI determines a move — retail CSWPazaak::PlayAITurn @ 006e4c60.
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
            decision.flipped ? 1 : 0
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
    return this.Actions[actionIndex].properties[propertyIndex].value as number;
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
   * Retail CSWPazaak::PlayAITurn @ 006e4c60.
   * AI = enemy table, human = player table; aiState = field6_0x22c.
   */
  static playAITurn(aiState: number): { code: number; handIndex: number; flipped: boolean } {
    const ai = this.Tables[PazaakTurnMode.OPPONENT];
    const player = this.Tables[PazaakTurnMode.PLAYER];
    const sideCards = this.Config.data.sideDeckCards;
    const none = { code: PazaakAIResult.DONE, handIndex: -1, flipped: false };

    let playerTotal = player.points;
    if(playerTotal > 20){
      playerTotal = -1000000;
      player.stand = true;
    }

    switch(aiState){
      case 0:
        if(ai.stand){
          return none;
        }
        return { code: PazaakAIResult.DRAW, handIndex: -1, flipped: false };

      case 1: {
        const aiRaw = ai.points;
        const earlySets = (player.winCount + 1) < 3;
        if(player.stand && playerTotal < aiRaw && aiRaw < 21){
          return { code: PazaakAIResult.STAND, handIndex: -1, flipped: false };
        }

        const minSide = findPotentialSidecardTotal(ai, sideCards, false);
        const maxSide = findPotentialSidecardTotal(ai, sideCards, true);

        if(
          maxSide.total > 17 &&
          playerTotal <= maxSide.total &&
          (maxSide.total > 19 || (maxSide.total > 18 && minSide.total > 11) || minSide.total > 13) &&
          maxSide.handIndex >= 0
        ){
          return {
            code: PazaakAIResult.PLAY_SIDE,
            handIndex: maxSide.handIndex,
            flipped: maxSide.flipped
          };
        }

        if(aiRaw > 20){
          if(earlySets && playerTotal > 17 && maxSide.total < playerTotal){
            return { code: PazaakAIResult.PASS, handIndex: -1, flipped: false };
          }
          if(maxSide.handIndex >= 0){
            return {
              code: PazaakAIResult.PLAY_SIDE,
              handIndex: maxSide.handIndex,
              flipped: maxSide.flipped
            };
          }
        }
      }
      // falls through to post-side / stand logic (retail case 2)
      case 2: {
        const aiCmp = ai.points > 20 ? -1000000 : ai.points;
        if(player.stand && aiCmp < playerTotal){
          return { code: PazaakAIResult.PASS, handIndex: -1, flipped: false };
        }
        if(aiCmp < 18){
          const minSide = findPotentialSidecardTotal(ai, sideCards, false);
          if(minSide.total < 16){
            return { code: PazaakAIResult.PASS, handIndex: -1, flipped: false };
          }
        }
        return { code: PazaakAIResult.STAND, handIndex: -1, flipped: false };
      }

      case 3:
      case 4:
        return none;

      default:
        return { code: PazaakAIResult.PASS, handIndex: -1, flipped: false };
    }
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
       * Draw a card from the side deck until this player has 4 cards in their hand
       */
      const usedSideDeckCards: number[] = [];
      for(let j = 0; j < PazaakHandSlots.MAX_SLOTS; j++){
        table.handCards.set(j, PazaakCards.INVALID);
        //Get the available side deck cards
        const availableSideDeckCards = Array.from(table.sideDeck.values()).filter(
          (card) => card != PazaakCards.INVALID && !usedSideDeckCards.includes(card)
        );
        //If there are no available side deck cards, break
        if(availableSideDeckCards.length == 0){
          console.warn(`PazaakManager: No available side deck cards for player ${i}`);
          continue;
        }

        //Get a random side deck card
        const sideCardIndex = Math.floor(Math.random() * availableSideDeckCards.length);
        const randomSideDeckCard = availableSideDeckCards[sideCardIndex];

        //Add the card to the player's hand
        table.handCards.set(j, randomSideDeckCard);
        //Set the card to not flipped
        table.flipCards.set(j, false);
        //Set the card to not swapped
        table.swapValueCards.set(j, false);
      }
    }

    this.ClearActions();
    this.AddAction(this.TurnMode, PazaakActionType.BEGIN_ROUND, [PazaakTurnMode.PLAYER]);
  }

  /**
   * Play a card from the player's hand
   * @param handIndex - The index of the card to play
   */
  static AddPlayHandCardAction(tableIndex: number, handIndex: number, flipped: boolean = false){
    this.AddActionFront(tableIndex, PazaakActionType.PLAY_HAND_CARD, [tableIndex, handIndex, flipped ? 1 : 0]);
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
