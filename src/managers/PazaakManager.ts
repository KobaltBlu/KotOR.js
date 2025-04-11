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

  static PlayerTable: IPazaakTable = {
    points: 0,
    winCount: 0,
    turnState: PazaakTurnState.INVALID,
    cardArea: new Map<PazaakTableSlots, PazaakCards>(),
    sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
    handCards: new Map<PazaakHandSlots, PazaakCards>()
  };

  static OpponentTable: IPazaakTable = {
    points: 0,
    winCount: 0,
    turnState: PazaakTurnState.INVALID,
    cardArea: new Map<PazaakTableSlots, PazaakCards>(),
    sideDeck: new Map<PazaakSideDeckSlots, PazaakCards>(),
    handCards: new Map<PazaakHandSlots, PazaakCards>()
  };
  
  static TurnMode: PazaakTurnMode = PazaakTurnMode.PLAYER;

  static {
    PazaakManager.Initialize();
  }

  /**
   * Initialize the Pazaak manager
   */
  static Initialize(){
    /**
     * Set the config based on the game engine
     */
    if(GameState.GameKey == GameEngineType.KOTOR){
      PazaakManager.Config = PazaakConfig_KOTOR;
    }else{
      PazaakManager.Config = PazaakConfig_TSL;
    }

    this.TotalSideDeckCards = PazaakManager.Config.data.sideDeckCards.length;

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
  }

  static StartGame(){
    this.Won = false;
    this.PlayerTable.points = 0;
    this.OpponentTable.points = 0;
    this.PlayerTable.winCount = 0;
    this.OpponentTable.winCount = 0;
    this.TurnMode = PazaakTurnMode.PLAYER;
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      this.PlayerTable.cardArea.set(i, PazaakCards.INVALID);
      this.OpponentTable.cardArea.set(i, PazaakCards.INVALID);
    }
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
    const card = Math.floor(Math.random() * 10);
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

  //-----------------//
  // Turn Management //
  //-----------------//

  static GetCurrentTable(){
    return this.TurnMode == PazaakTurnMode.PLAYER ? this.PlayerTable : this.OpponentTable;
  }

  /**
   * Begin the game
   */
  static BeginGame(){
    this.PlayerTable.turnState = PazaakTurnState.DRAW_CARD;
    this.OpponentTable.turnState = PazaakTurnState.WAITING;

    //Copy the side decks to the player and opponent tables
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      this.PlayerTable.sideDeck.set(i, this.SideDeck.get(i));
      this.OpponentTable.sideDeck.set(i, this.OpponentDeck.get(i));
    }

    //Initialize the player's hand  
    for(let i = 0; i < PazaakHandSlots.MAX_SLOTS; i++){
      this.PlayerTable.handCards.set(i, PazaakCards.INVALID);
      this.OpponentTable.handCards.set(i, PazaakCards.INVALID);
    }

    //Initialize the player's table
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      this.PlayerTable.cardArea.set(i, PazaakCards.INVALID);
      this.OpponentTable.cardArea.set(i, PazaakCards.INVALID);
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
      if(card != PazaakCards.INVALID){
        continue;
      }
      const drawCard = this.GetRandomCard();
      table.cardArea.set(i, drawCard);
      cardDrawn = true;
      break;
    }
    if(!cardDrawn){
      //TODO: Handle no space on the table
      table.turnState = PazaakTurnState.STAND;
      return;
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
  static PlayHandCard(handIndex: number){
    const card = this.PlayerTable.handCards.get(handIndex);
    if(card == PazaakCards.INVALID){
      console.error(`PazaakManager: Invalid hand card ${handIndex}`);
      return;
    }

    const table = this.GetCurrentTable();
    for(let i = 0; i < PazaakTableSlots.MAX_SLOTS; i++){
      const tableCard = table.cardArea.get(i);
      if(tableCard != PazaakCards.INVALID){
        continue;
      }
      //Play the card
      table.cardArea.set(i, card);
      //Remove the card from the player's hand
      table.handCards.set(handIndex, PazaakCards.INVALID);
      break;
    }
  }

  /**
   * End the turn
   */
  static EndTurn(){
    if(this.TurnMode == PazaakTurnMode.PLAYER){
      this.TurnMode = PazaakTurnMode.OPPONENT;
    }else{
      this.TurnMode = PazaakTurnMode.PLAYER;
    }
  }

  /**
   * Player stands
   */
  static Stand(){
    const table = this.GetCurrentTable();
    table.turnState = PazaakTurnState.STAND;
  }
}
