import { PazaakTurnMode } from "../../../enums/minigames/PazaakTurnMode";
import { PazaakHandSlots } from "../../../enums/minigames/PazaakHandSlots";
import { PazaakTableSlots } from "../../../enums/minigames/PazaakTableSlots";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { PazaakTurnState } from "../../../enums/minigames/PazaakTurnState";

/**
 * MenuPazaakGame class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakGame extends GameMenu {

  LBL_NPCSIDEDECK: GUILabel;
  LBL_PLRSIDEDECK: GUILabel;
  BTN_NPC0: GUIButton;
  BTN_NPC3: GUIButton;
  BTN_NPC6: GUIButton;
  BTN_PLR0: GUIButton;
  BTN_PLR3: GUIButton;
  BTN_PLR6: GUIButton;
  BTN_PLR7: GUIButton;
  BTN_PLR4: GUIButton;
  BTN_PLR1: GUIButton;
  BTN_NPC7: GUIButton;
  BTN_NPC4: GUIButton;
  BTN_NPC1: GUIButton;
  BTN_PLR5: GUIButton;
  BTN_PLR2: GUIButton;
  BTN_PLR8: GUIButton;
  BTN_NPC8: GUIButton;
  BTN_NPC5: GUIButton;
  BTN_NPC2: GUIButton;
  BTN_NPCSIDE2: GUIButton;
  BTN_NPCSIDE0: GUIButton;
  BTN_PLRSIDE2: GUIButton;
  BTN_PLRSIDE0: GUIButton;
  BTN_NPCSIDE3: GUIButton;
  BTN_NPCSIDE1: GUIButton;
  BTN_PLRSIDE3: GUIButton;
  BTN_PLRSIDE1: GUIButton;
  LBL_NPC0: GUILabel;
  LBL_NPC3: GUILabel;
  LBL_NPC6: GUILabel;
  LBL_PLR0: GUILabel;
  LBL_PLR3: GUILabel;
  LBL_PLR6: GUILabel;
  LBL_NPC1: GUILabel;
  LBL_NPC4: GUILabel;
  LBL_NPC7: GUILabel;
  LBL_PLR1: GUILabel;
  LBL_PLR4: GUILabel;
  LBL_PLR7: GUILabel;
  LBL_NPC2: GUILabel;
  LBL_NPC8: GUILabel;
  LBL_NPC5: GUILabel;
  LBL_PLR2: GUILabel;
  LBL_PLR5: GUILabel;
  LBL_PLR8: GUILabel;
  LBL_PLRSIDE0: GUILabel;
  LBL_PLRSIDE2: GUILabel;
  LBL_NPCSIDE0: GUILabel;
  LBL_NPCSIDE2: GUILabel;
  LBL_PLRSIDE1: GUILabel;
  LBL_PLRSIDE3: GUILabel;
  LBL_NPCSIDE1: GUILabel;
  LBL_NPCSIDE3: GUILabel;
  LBL_PLRNAME: GUILabel;
  LBL_NPCNAME: GUILabel;
  LBL_PLRTOTAL: GUILabel;
  LBL_NPCTOTAL: GUILabel;
  LBL_PLRSCORE0: GUILabel;
  LBL_PLRSCORE1: GUILabel;
  LBL_PLRSCORE2: GUILabel;
  LBL_NPCSCORE2: GUILabel;
  LBL_NPCSCORE1: GUILabel;
  LBL_NPCSCORE0: GUILabel;
  LBL_PLRTURN: GUILabel;
  LBL_NPCTURN: GUILabel;
  BTN_XTEXT: GUIButton;
  BTN_YTEXT: GUIButton;
  BTN_FLIP0: GUIButton;
  LBL_FLIPLEGEND: GUILabel;
  LBL_FLIPICON: GUILabel;
  BTN_FLIP1: GUIButton;
  BTN_FLIP2: GUIButton;
  BTN_FLIP3: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaakgame';
    this.background = '1600x1200pazaak';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      /**
       * Flip hand cards
       */
      this.BTN_FLIP0.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.flipHandCard(0, 0);
      });

      this.BTN_FLIP1.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.flipHandCard(0, 1);
      });

      this.BTN_FLIP2.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.flipHandCard(0, 2);
      });

      this.BTN_FLIP3.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.flipHandCard(0, 3);
      });

      /**
       * Play hand cards
       */
      this.BTN_PLRSIDE0.swapBorderAndHighliteOnHover = false;
      this.BTN_PLRSIDE0.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.playHandCard(0, 0);
      });

      this.BTN_PLRSIDE1.swapBorderAndHighliteOnHover = false;
      this.BTN_PLRSIDE1.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.playHandCard(0, 1);
      }); 

      this.BTN_PLRSIDE2.swapBorderAndHighliteOnHover = false;
      this.BTN_PLRSIDE2.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.playHandCard(0, 2);
      });

      this.BTN_PLRSIDE3.swapBorderAndHighliteOnHover = false;
      this.BTN_PLRSIDE3.addEventListener('click', () => {
        if(this.noClicks() || GameState.PazaakManager.Tables[0].handCardPlayed){
          return;
        }
        this.playHandCard(0, 3);
      });

      this.BTN_NPCSIDE0.swapBorderAndHighliteOnHover = false;
      this.BTN_NPCSIDE1.swapBorderAndHighliteOnHover = false;
      this.BTN_NPCSIDE2.swapBorderAndHighliteOnHover = false;
      this.BTN_NPCSIDE3.swapBorderAndHighliteOnHover = false;
      
      /**
       * End turn
       */
      this.BTN_XTEXT.addEventListener('click', () => {
        if(this.noClicks()){
          return;
        }
        GameState.PazaakManager.AddEndTurnAction(PazaakTurnMode.PLAYER);
      });

      /**
       * Stand
       */
      this.BTN_YTEXT.addEventListener('click', () => {
        if(this.noClicks()){
          return;
        }
        GameState.PazaakManager.AddStandAction(PazaakTurnMode.PLAYER);
      });

      resolve();
    });
  }

  /**
   * Flip a hand card
   * @param tableIndex - The index of the table
   * @param cardIndex - The index of the card
   */
  flipHandCard(tableIndex: number, cardIndex: number){
    const flipped = GameState.PazaakManager.Tables[tableIndex].flipCards.get(cardIndex);
    GameState.PazaakManager.Tables[tableIndex].flipCards.set(cardIndex, !flipped);
  }

  /**
   * Play a hand card
   * @param tableIndex - The index of the table
   * @param cardIndex - The index of the card
   */
  playHandCard(tableIndex: number, cardIndex: number){
    const flipped = GameState.PazaakManager.Tables[tableIndex].flipCards.get(cardIndex);
    GameState.PazaakManager.AddPlayHandCardAction(tableIndex, cardIndex, flipped);
  }

  getTableCardButton(tableIndex: number, cardIndex: number){
    if(tableIndex == PazaakTurnMode.PLAYER){
      return this.getControlByName(`BTN_PLR${cardIndex}`);
    }else{
      return this.getControlByName(`BTN_NPC${cardIndex}`);
    }
  }

  /**
   * Get the card label for a table
   * @param tableIndex - The index of the table
   * @param cardIndex - The index of the card
   * @returns The card label
   */
  getTableCardLabel(tableIndex: number, cardIndex: number){
    if(tableIndex == PazaakTurnMode.PLAYER){
      return this.getControlByName(`LBL_PLR${cardIndex}`);
    }else{
      return this.getControlByName(`LBL_NPC${cardIndex}`);
    }
  }

  getHandCardButton(tableIndex: number, cardIndex: number){
    if(tableIndex == PazaakTurnMode.PLAYER){
      return this.getControlByName(`BTN_PLRSIDE${cardIndex}`);
    }else{
      return this.getControlByName(`BTN_NPCSIDE${cardIndex}`);
    }
  }

  getHandCardLabel(tableIndex: number, cardIndex: number){
    if(tableIndex == PazaakTurnMode.PLAYER){
      return this.getControlByName(`LBL_PLRSIDE${cardIndex}`);
    }else{
      return this.getControlByName(`LBL_NPCSIDE${cardIndex}`);
    }
  }

  getHandCardFlipButton(tableIndex: number, cardIndex: number){
    if(tableIndex == PazaakTurnMode.PLAYER){
      return this.getControlByName(`BTN_FLIP${cardIndex}`);
    }else{
      return undefined;
    }
  }

  /**
   * Set the turn indicator
   * @param turn - The turn number
   */
  setTurnIndicator(turn: number){
    if(turn == 0){
      this.LBL_PLRTURN.show();
      this.LBL_NPCTURN.hide();
    }else{
      this.LBL_PLRTURN.hide();
      this.LBL_NPCTURN.show();
    }
  }

  /**
   * Set the win counter for a table
   * @param tableIndex - The index of the table
   * @param winCount - The number of wins
   * @param score - The score of the table
   */
  setTableWinCounter(tableIndex: number, winCount: number, score: number = 0){
    if(tableIndex == PazaakTurnMode.PLAYER){
      this.LBL_PLRTOTAL.setText(score.toString());
      for(let i = 0; i < 3; i++){
        this.getControlByName(`LBL_PLRSCORE${i}`)?.setFillTextureName(i >= winCount ? 'lbl_winmark01' : 'lbl_winmark02'); 
      }
    }else{
      this.LBL_NPCTOTAL.setText(score.toString());
      for(let i = 0; i < 3; i++){
        this.getControlByName(`LBL_NPCSCORE${i}`)?.setFillTextureName(i >= winCount ? 'lbl_winmark01' : 'lbl_winmark02');
      }
    }
  }

  /**
   * Check if the player can click
   * @returns True if the player can click, false otherwise
   */
  noClicks(){
    return (
      GameState.PazaakManager.Actions.length > 0 || 
      GameState.PazaakManager.TurnMode != PazaakTurnMode.PLAYER
    );
  }

  open(){
    super.open();
    GameState.PazaakManager.BeginGame();
  }

  /**
   * Update the menu
   * @param delta - The delta time
   */
  update(delta: number){
    super.update(delta);
    if(!GameState.MenuManager.InGameConfirm.isVisible()){
      GameState.PazaakManager.ProcessActionQueue(delta);
    }
    this.rebuild();
  }

  /**
   * Rebuild the menu
   */
  rebuild(){
    this.setTurnIndicator(GameState.PazaakManager.TurnMode);

    if(GameState.PartyManager.Player){
      this.LBL_PLRNAME.setText(GameState.PartyManager.Player.name);
    }
    // this.LBL_NPCNAME.setText(GameState.PazaakManager.Opponent.name);

    this.BTN_XTEXT.pulsing = (GameState.PazaakManager.TurnState == PazaakTurnState.END_TURN);
    this.BTN_XTEXT.disableSelection = this.noClicks();
    this.BTN_YTEXT.pulsing = (GameState.PazaakManager.TurnState == PazaakTurnState.STAND);
    this.BTN_YTEXT.disableSelection = this.noClicks();

    if(this.BTN_XTEXT.pulsing){
      if(GameState.PazaakManager.TurnMode != PazaakTurnMode.PLAYER){
        this.BTN_XTEXT.defaultColor.setRGB(0, 0.658824, 0.980392);
        this.BTN_XTEXT.defaultHighlightColor.setRGB(0, 0.658824, 0.980392);
      }else{
        this.BTN_XTEXT.defaultColor.setRGB(1, 0, 0);
        this.BTN_XTEXT.defaultHighlightColor.setRGB(1, 0, 0);
      }
    }else{
      this.BTN_XTEXT.defaultColor.setRGB(0, 0.658824, 0.980392);
      this.BTN_XTEXT.defaultHighlightColor.setRGB(1, 1, 0);
    }

    if(this.BTN_YTEXT.pulsing){
      if(GameState.PazaakManager.TurnMode != PazaakTurnMode.PLAYER){
        this.BTN_XTEXT.defaultColor.setRGB(0, 0.658824, 0.980392);
        this.BTN_YTEXT.defaultHighlightColor.setRGB(0, 0.658824, 0.980392);
      }else{
        this.BTN_XTEXT.defaultColor.setRGB(1, 0, 0);
        this.BTN_YTEXT.defaultHighlightColor.setRGB(1, 0, 0);
      }
    }else{
      this.BTN_YTEXT.defaultColor.setRGB(0, 0.658824, 0.980392);
      this.BTN_YTEXT.defaultHighlightColor.setRGB(1, 1, 0);
    }

    for(let i = 0; i < 2; i++){
      const table = GameState.PazaakManager.Tables[i];

      this.setTableWinCounter(i, table.winCount, table.points);

      /**
       * Update table card area
       */
      for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
        const slot = table.cardArea.get(j);
        const tableCardButton = this.getTableCardButton(i, j);
        const tableCardLabel = this.getTableCardLabel(i, j);
        if(slot == undefined){
          tableCardButton.hide();
          tableCardLabel.hide();
          continue;
        };

        tableCardButton.show();
        tableCardButton.setFillTextureName(slot.textures[!slot.flipped ? 0 : 1]);

        tableCardLabel.show();
        tableCardLabel.setText(slot.modifierLabel);
      }

      /**
       * Update player hand cards
       */
      for(let j = 0; j < PazaakHandSlots.MAX_SLOTS; j++){
        const slot = table.handCards.get(j);
        const handCardButton = this.getHandCardButton(i, j);
        const handCardLabel = this.getHandCardLabel(i, j);
        const handCardFlipButton = this.getHandCardFlipButton(i, j);
        const flipped = table.flipCards.get(j);
        const swapped = table.swapValueCards.get(j);
        if(slot == undefined || slot == -1){
          handCardButton.hide();
          handCardLabel.hide();
          if(handCardFlipButton){
            handCardFlipButton.hide();
          }
          continue;
        }

        const card = GameState.PazaakManager.Config.data.sideDeckCards[slot];

        if(i == PazaakTurnMode.PLAYER){
          handCardButton.setFillTextureName(card.textures[!flipped ? 0 : 1], false);
          handCardLabel.show();
          handCardLabel.setText(card.modifierLabel);
          handCardButton.disableSelection = this.noClicks() || table.handCardPlayed;
        }else{
          handCardButton.setFillTextureName('lbl_cardback', false);
          handCardLabel.hide();
          handCardLabel.setText('');
          handCardButton.disableSelection = true;
        }
        handCardButton.show();
        
        if(handCardFlipButton){
          if(card.reversible){
            handCardFlipButton.show();
            handCardFlipButton.disableSelection = this.noClicks() || table.handCardPlayed;
          }else{
            handCardFlipButton.hide();
          }
        }
      }
    }

  }
  
}
