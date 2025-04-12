import { GameState } from "../GameState";
import { PazaakCards } from "../enums/minigames/PazaakCards";
import { PazaakHandSlots } from "../enums/minigames/PazaakHandSlots";
import { PazaakSideDeckSlots } from "../enums/minigames/PazaakSideDeckSlots";
import { PazaakTableSlots } from "../enums/minigames/PazaakTableSlots";
import { PazaakTurnMode } from "../enums/minigames/PazaakTurnMode";
import { PazaakTurnState } from "../enums/minigames/PazaakTurnState";
import { IPTPazaakCard } from "../interface/minigames/IPTPazaakCard";
import { IPazaakTable } from "../interface/minigames/IPazaakTable";
import { ModuleCreature } from "../module/ModuleCreature";
import type { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { PazaakConfig as PazaakConfig_TSL } from "../game/tsl/minigames/mg-pazaak-config";
import { PazaakConfig as PazaakConfig_KOTOR } from "../game/kotor/minigames/mg-pazaak-config";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { IPazaakCard } from "../interface/minigames/IPazaakCard";
import { ActionStatus } from "../enums/actions/ActionStatus";

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
  PLAY_SIDE_CARD = 2,
  PLAY_GUI_SOUND = 3,
  BEGIN_TURN = 4,
  END_TURN = 5,
  BEGIN_ROUND = 6,
  END_ROUND = 7,
  END_GAME = 8,
  AI_DETERMINE_MOVE = 9
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

export class PazaakManager {

  static Config: any = PazaakConfig_TSL;
  static Wager: number = 100;
  static MinWager: number = 1;
  static MaxWager: number = 100;
  static EndScript: string = '';
  static EndScriptInstance: NWScriptInstance = undefined;
  static ShowTutorial: boolean = false;
  static Opponent: ModuleCreature = undefined;
  static OpponentDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();
  static Cards: Map<PazaakCards, IPTPazaakCard> = new Map<PazaakCards, IPTPazaakCard>();
  static SideDeck: Map<PazaakSideDeckSlots, PazaakCards> = new Map<PazaakSideDeckSlots, PazaakCards>();
  static Won: boolean = false;

  static TotalSideDeckCards: number = 0;
  static TotalMainDeckCards: number = 0;
  static WaitTimer: number = 0;
  static TargetPoints: number = 20;

  static Tables: IPazaakTable[] = [
    {
      points: 0,
      winCount: 0,
      turnState: PazaakTurnState.INVALID,
      cardArea: new Map<PazaakTableSlots, IPazaakCard>(),
      sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
      handCards: new Map<PazaakHandSlots, PazaakCards>()
    },
    {
      points: 0,
      winCount: 0,
      turnState: PazaakTurnState.INVALID,
      cardArea: new Map<PazaakTableSlots, IPazaakCard>(),
      sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
      handCards: new Map<PazaakHandSlots, PazaakCards>()
    }
  ];
  
  static TurnMode: PazaakTurnMode = PazaakTurnMode.PLAYER;
  static Actions: IPazaakAction[] = [];
  static TargetWins: number = 3;

  static {
    PazaakManager.Initialize();
  }

  /**
   * Initialize the Pazaak manager
   */
  static Initialize(){
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
      this.SideDeck.set(i, PazaakCards.INVALID);
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
    this.TotalMainDeckCards = PazaakManager.Config.data.mainDeckCards.length;
    this.TotalSideDeckCards = PazaakManager.Config.data.sideDeckCards.length;
    this.Won = false;
    this.Tables[0].points = 0;
    this.Tables[1].points = 0;
    this.Tables[0].winCount = 0;
    this.Tables[1].winCount = 0;
    this.TurnMode = PazaakTurnMode.PLAYER;
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      this.Tables[0].cardArea.set(i, undefined);
      this.Tables[1].cardArea.set(i, undefined);
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
   * Convert a card modifier to a card
   * @param cardModifier - The card modifier to convert
   * @returns The card
   */
  static CardModifierToCard(cardModifier: string){
    if(cardModifier == '+1'){
      return PazaakCards.PLUS_1;
    }else if(cardModifier == '+2'){
      return PazaakCards.PLUS_2;
    }else if(cardModifier == '+3'){
      return PazaakCards.PLUS_3;
    }else if(cardModifier == '+4'){
      return PazaakCards.PLUS_4;
    }else if(cardModifier == '+5'){
      return PazaakCards.PLUS_5;
    }else if(cardModifier == '+6'){
      return PazaakCards.PLUS_6;
    }else if(cardModifier == '-1'){
      return PazaakCards.MINUS_1;
    }else if(cardModifier == '-2'){
      return PazaakCards.MINUS_2;
    }else if(cardModifier == '-3'){
      return PazaakCards.MINUS_3;
    }else if(cardModifier == '-4'){
      return PazaakCards.MINUS_4;
    }else if(cardModifier == '-5'){
      return PazaakCards.MINUS_5;
    }else if(cardModifier == '-6'){
      return PazaakCards.MINUS_6;
    }else if(cardModifier == '+-1'){
      return PazaakCards.PLUS_MINUS_1;
    }else if(cardModifier == '+-2'){
      return PazaakCards.PLUS_MINUS_2;
    }else if(cardModifier == '+-3'){
      return PazaakCards.PLUS_MINUS_3;
    }else if(cardModifier == '+-4'){
      return PazaakCards.PLUS_MINUS_4;
    }else if(cardModifier == '+-5'){
      return PazaakCards.PLUS_MINUS_5;
    }else if(cardModifier == '+-6'){
      return PazaakCards.PLUS_MINUS_6;
    }
    return PazaakCards.INVALID;
  }

  static GetCardScore(card: PazaakCards, bFlipped: boolean = false){
    if(card == PazaakCards.PLUS_1){
      return 1;
    }else if(card == PazaakCards.PLUS_2){
      return 2;
    }else if(card == PazaakCards.PLUS_3){
      return 3;
    }else if(card == PazaakCards.PLUS_4){
      return 4;
    }else if(card == PazaakCards.PLUS_5){
      return 5;
    }else if(card == PazaakCards.PLUS_6){
      return 6;
    }else if(card == PazaakCards.MINUS_1){
      return -1;
    }else if(card == PazaakCards.MINUS_2){
      return -2;
    }else if(card == PazaakCards.MINUS_3){
      return -3;
    }else if(card == PazaakCards.MINUS_4){
      return -4;
    }else if(card == PazaakCards.MINUS_5){
      return -5;
    }else if(card == PazaakCards.MINUS_6){
      return -6;
    }else if(card == PazaakCards.PLUS_MINUS_1){
      return bFlipped ? -1 : 1;
    }else if(card == PazaakCards.PLUS_MINUS_2){
      return bFlipped ? -2 : 2;
    }else if(card == PazaakCards.PLUS_MINUS_3){
      return bFlipped ? -3 : 3;
    }else if(card == PazaakCards.PLUS_MINUS_4){
      return bFlipped ? -4 : 4;
    }else if(card == PazaakCards.PLUS_MINUS_5){
      return bFlipped ? -5 : 5;
    }else if(card == PazaakCards.PLUS_MINUS_6){
      return bFlipped ? -6 : 6;
    }else if(card == PazaakCards.MAIN_CARD_1){
      return 1;
    }else if(card == PazaakCards.MAIN_CARD_2){
      return 2;
    }else if(card == PazaakCards.MAIN_CARD_3){
      return 3;
    }else if(card == PazaakCards.MAIN_CARD_4){
      return 4;
    }else if(card == PazaakCards.MAIN_CARD_5){
      return 5;
    }else if(card == PazaakCards.MAIN_CARD_6){
      return 6;
    }else if(card == PazaakCards.MAIN_CARD_7){
      return 7;
    }else if(card == PazaakCards.MAIN_CARD_8){
      return 8;
    }else if(card == PazaakCards.MAIN_CARD_9){
      return 9;
    }else if(card == PazaakCards.MAIN_CARD_10){
      return 10;
    }
    return 0;
  }

  static GetRandomCard(){
    const totalMainCards = PazaakManager.Config.data.mainDeckCards.length;
    const card = Math.floor(Math.random() * totalMainCards);
    if(card == 0){
      return PazaakCards.MAIN_CARD_1;
    }else if(card == 1){
      return PazaakCards.MAIN_CARD_2;
    }else if(card == 2){
      return PazaakCards.MAIN_CARD_3;
    }else if(card == 3){
      return PazaakCards.MAIN_CARD_4;
    }else if(card == 4){
      return PazaakCards.MAIN_CARD_5;
    }else if(card == 5){
      return PazaakCards.MAIN_CARD_6;
    }else if(card == 6){
      return PazaakCards.MAIN_CARD_7;
    }else if(card == 7){
      return PazaakCards.MAIN_CARD_8;
    }else if(card == 8){
      return PazaakCards.MAIN_CARD_9;
    }else if(card == 9){
      return PazaakCards.MAIN_CARD_10;
    }
    return PazaakCards.INVALID;
  }

  /**
   * Set the opponent's deck
   * @param deckIndex - The index of the deck to set
   */
  static SetOpponentDeck(deckIndex: number){
    const deckConfig = GameState.TwoDAManager.datatables.get('pazaakdecks').rows[deckIndex] ||
      GameState.TwoDAManager.datatables.get('pazaak_decks').rows[0];
    const deck = new Map<PazaakSideDeckSlots, PazaakCards>();
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      const card = this.CardModifierToCard(deckConfig[`card${i}`]);
      if(card == PazaakCards.INVALID){
        console.error(`PazaakManager: Invalid card modifier ${deckConfig[`card${i}`]} for deck ${deckIndex}`);
      }
      deck.set(i, card != PazaakCards.INVALID ? card : PazaakCards.PLUS_1);
    }
    this.OpponentDeck = deck;
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
    const currentSDCard = this.SideDeck.get(sideDeckIndex);
    //If the side deck card is valid, add it to the main deck
    if(currentSDCard != PazaakCards.INVALID && currentSDCard < PazaakCards.MAX_CARDS){
      this.AddCard(currentSDCard, 1);
    }
    //Set the side deck card to the new card
    this.SideDeck.set(sideDeckIndex, card);
  }

  /**
   * Move a side deck card to the main deck
   * @param sideDeckIndex - The index of the side deck card to move
   */
  static MoveSideDeckCardToMainDeck(sideDeckIndex: number){
    const card = this.SideDeck.get(sideDeckIndex);
    //If the side deck card is valid, add it to the main deck
    if(card != PazaakCards.INVALID && card < PazaakCards.MAX_CARDS){
      this.AddCard(card, 1);
    }
    //Set the side deck card to an invalid value to clear the slot
    this.SideDeck.set(sideDeckIndex, PazaakCards.INVALID);
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
      GameState.guiAudioEmitter.playSound(this.GetActionPropertyAsString(0, 0));
      actionStatus = ActionStatus.COMPLETE;
    }
    /**
     * End the turn
     * end early if the player busted 
     * if it was the players turn, begin the opponent's turn
     * else end the round
     */
    else if(action.type == PazaakActionType.END_TURN){
      //check to see if either player busted
      const playerPoints = this.Tables[0].points;
      const opponentPoints = this.Tables[1].points;
      let busted = (playerPoints > this.TargetPoints || opponentPoints > this.TargetPoints);
      if(busted){
        this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
      }else{
        if(this.TurnMode == PazaakTurnMode.PLAYER){
          this.TurnMode = PazaakTurnMode.OPPONENT;
          this.AddAction(this.TurnMode, PazaakActionType.BEGIN_ROUND, [PazaakTurnMode.OPPONENT]);
        }else{
          this.TurnMode = PazaakTurnMode.PLAYER;
          this.AddAction(this.TurnMode, PazaakActionType.END_ROUND);
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
      const playerPoints = this.Tables[0].points;
      const opponentPoints = this.Tables[1].points;
      //[Results]:
      // -1 - tied
      //  0 - player wins
      //  1 - opponent wins
      let result = -1;
      if(playerPoints > this.TargetPoints){
        //Player loses because they busted
        this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
        result = PazaakTurnMode.OPPONENT;
      }else if(opponentPoints > this.TargetPoints){
        //Opponent loses because they busted
        this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_winset']);
        result = PazaakTurnMode.PLAYER;
      }else{
        const pScoreOffset = Math.abs(playerPoints - this.TargetPoints);
        const oScoreOffset = Math.abs(opponentPoints - this.TargetPoints);

        if (pScoreOffset < oScoreOffset) {
          //Player wins because they are closer to 20
          this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_winmatch']);
          result = PazaakTurnMode.PLAYER;
        } else if (oScoreOffset < pScoreOffset) {
          //Opponent wins because they are closer to 20
          this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_loseset']);
          result = PazaakTurnMode.OPPONENT;
        } else {
          //Both players are equally close to 20
          this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_warnbust']);
          result = -1;
        }
      }
      if(result == PazaakTurnMode.PLAYER){
        this.Tables[0].winCount++;
      }else if(result == PazaakTurnMode.OPPONENT){
        this.Tables[1].winCount++;
      }
      if(this.Tables[0].winCount >= this.TargetWins){
        this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.PLAYER]);
      }else if(this.Tables[1].winCount >= this.TargetWins){
        this.AddAction(this.TurnMode, PazaakActionType.END_GAME, [PazaakTurnMode.OPPONENT]);
      }else{
        //The player always starts the next round
        this.TurnMode = PazaakTurnMode.PLAYER;
        this.AddActionFront(this.TurnMode, PazaakActionType.BEGIN_ROUND);
      }
    }
    if(actionStatus == ActionStatus.COMPLETE){
      this.Actions.shift();
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

  static GetCurrentTable(){
    return this.Tables[this.TurnMode];
  }

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
   * Begin the game
   */
  static BeginGame(){
    this.Tables[0].turnState = PazaakTurnState.DRAW_CARD;
    this.Tables[1].turnState = PazaakTurnState.WAITING;

    //Copy the side decks to the player and opponent tables
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      this.Tables[0].sideDeck.set(i, this.SideDeck.get(i));
      this.Tables[1].sideDeck.set(i, this.OpponentDeck.get(i));
    }

    //Initialize the player's hand  
    for(let i = 0; i < PazaakHandSlots.MAX_SLOTS; i++){
      this.Tables[0].handCards.set(i, PazaakCards.INVALID);
      this.Tables[1].handCards.set(i, PazaakCards.INVALID);
    }

    //Initialize the player's table
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      this.Tables[0].cardArea.set(i, undefined);
      this.Tables[1].cardArea.set(i, undefined);
    }
  }

  /**
   * Begin the turn
   */
  static BeginTurn(){
    const table = this.GetCurrentTable();

    let cardDrawn = false;
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      const card = table.cardArea.get(i);
      if(card != undefined){
        continue;
      }
      const randomCardIdx = Math.floor(Math.random() * this.Config.data.mainDeckCards.length);
      table.cardArea.set(i, this.Config.data.mainDeckCards[randomCardIdx]);
      cardDrawn = true;
      break;
    }
    if(!cardDrawn){
      this.AddAction(this.TurnMode, PazaakActionType.END_TURN);
      return;
    }else{
      this.AddAction(this.TurnMode, PazaakActionType.PLAY_GUI_SOUND, ['mgs_drawmain']);
      this.AddAction(this.TurnMode, PazaakActionType.WAIT, [1, 0]);
    }

    /**
     * Draw a card from the side deck until this player has 4 cards in their hand
     */
    for(let i = 0; i < PazaakHandSlots.MAX_SLOTS; i++){
      const card = table.handCards.get(i);
      if(card != PazaakCards.INVALID){
        continue;
      }
      //Get the available side deck cards
      const availableSideDeckCards = Array.from(table.sideDeck.values()).filter(card => card != PazaakCards.INVALID);
      //If there are no available side deck cards, break
      if(availableSideDeckCards.length == 0){
        console.warn(`PazaakManager: No available side deck cards for player ${this.TurnMode}`);
        break;
      }
      //Get a random side deck card
      const sideCardIndex = Math.floor(Math.random() * availableSideDeckCards.length);
      const randomSideDeckCard = availableSideDeckCards[sideCardIndex];

      //Remove the card from the side deck
      for (let [key, value] of table.sideDeck.entries()) {
        if (value === randomSideDeckCard){
          table.sideDeck.set(key, PazaakCards.INVALID);
          break;
        }
      }
      
      //Add the card to the player's hand
      table.handCards.set(i, randomSideDeckCard);
    }
  }

  /**
   * Play a card from the player's hand
   * @param handIndex - The index of the card to play
   */
  static PlayHandCard(tableIndex: number, handIndex: number){
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
      const card: IPazaakCard = this.Config.data.sideDeckCards[cardIndex];
      //Play the card
      table.cardArea.set(i, card);
      //Remove the card from the player's hand
      table.handCards.set(handIndex, PazaakCards.INVALID);
      break;
    }
    this.AddAction(tableIndex, PazaakActionType.PLAY_GUI_SOUND, ['mgs_playside']);
    this.AddAction(tableIndex, PazaakActionType.WAIT, [1, 0]);
  }

  /**
   * End the turn
   */
  static EndTurn(){
    this.AddAction(this.TurnMode, PazaakActionType.END_TURN);
  }

  /**
   * Player stands
   */
  static Stand(){
    const table = this.GetCurrentTable();
    table.turnState = PazaakTurnState.STAND;
  }

}
