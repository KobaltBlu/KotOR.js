import { PazaakCards } from "../../../enums/minigames/PazaakCards";
import { PazaakSideDeckSlots } from "../../../enums/minigames/PazaakSideDeckSlots";
import { PazaakCardGUITextures } from "../../../enums/minigames/PazaakCardGUITextures";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIControl } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

const MSG_CONFIRM_SIDE_DECK = 32322;
const MSG_YOU_WIN = 32334;
const MSG_TIED = 32338;
const MSG_YOU_LOSE = 32335;

/**
 * MenuPazaakSetup class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuPazaakSetup.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakSetup extends GameMenu {

  LBL_TITLE: GUILabel;
  BTN_AVAIL00: GUIButton;
  BTN_AVAIL01: GUIButton;
  BTN_AVAIL02: GUIButton;
  BTN_AVAIL03: GUIButton;
  BTN_AVAIL04: GUIButton;
  BTN_AVAIL05: GUIButton;
  BTN_AVAIL15: GUIButton;
  BTN_AVAIL14: GUIButton;
  BTN_AVAIL13: GUIButton;
  BTN_AVAIL12: GUIButton;
  BTN_AVAIL11: GUIButton;
  BTN_AVAIL10: GUIButton;
  BTN_AVAIL24: GUIButton;
  BTN_AVAIL23: GUIButton;
  BTN_AVAIL25: GUIButton;
  BTN_AVAIL22: GUIButton;
  BTN_AVAIL21: GUIButton;
  BTN_AVAIL20: GUIButton;
  BTN_CHOSEN8: GUIButton;
  BTN_CHOSEN6: GUIButton;
  BTN_CHOSEN4: GUIButton;
  BTN_CHOSEN2: GUIButton;
  BTN_CHOSEN9: GUIButton;
  BTN_CHOSEN0: GUIButton;
  BTN_CHOSEN7: GUIButton;
  BTN_CHOSEN5: GUIButton;
  BTN_CHOSEN3: GUIButton;
  BTN_CHOSEN1: GUIButton;
  LBL_AVAIL00: GUILabel;
  LBL_AVAIL01: GUILabel;
  LBL_AVAIL02: GUILabel;
  LBL_AVAIL03: GUILabel;
  LBL_AVAIL04: GUILabel;
  LBL_AVAIL05: GUILabel;
  LBL_AVAIL10: GUILabel;
  LBL_AVAIL11: GUILabel;
  LBL_AVAIL12: GUILabel;
  LBL_AVAIL13: GUILabel;
  LBL_AVAIL14: GUILabel;
  LBL_AVAIL15: GUILabel;
  LBL_AVAIL20: GUILabel;
  LBL_AVAIL21: GUILabel;
  LBL_AVAIL22: GUILabel;
  LBL_AVAIL23: GUILabel;
  LBL_AVAIL24: GUILabel;
  LBL_AVAIL25: GUILabel;
  LBL_CHOSEN0: GUILabel;
  LBL_CHOSEN2: GUILabel;
  LBL_CHOSEN4: GUILabel;
  LBL_CHOSEN6: GUILabel;
  LBL_CHOSEN8: GUILabel;
  LBL_CHOSEN1: GUILabel;
  LBL_CHOSEN3: GUILabel;
  LBL_CHOSEN5: GUILabel;
  LBL_CHOSEN7: GUILabel;
  LBL_CHOSEN9: GUILabel;
  LBL_AVAILNUM05: GUILabel;
  LBL_AVAILNUM15: GUILabel;
  LBL_AVAILNUM25: GUILabel;
  LBL_AVAILNUM24: GUILabel;
  LBL_AVAILNUM14: GUILabel;
  LBL_AVAILNUM04: GUILabel;
  LBL_AVAILNUM03: GUILabel;
  LBL_AVAILNUM13: GUILabel;
  LBL_AVAILNUM23: GUILabel;
  LBL_AVAILNUM22: GUILabel;
  LBL_AVAILNUM12: GUILabel;
  LBL_AVAILNUM02: GUILabel;
  LBL_AVAILNUM01: GUILabel;
  LBL_AVAILNUM11: GUILabel;
  LBL_AVAILNUM21: GUILabel;
  LBL_AVAILNUM20: GUILabel;
  LBL_AVAILNUM10: GUILabel;
  LBL_AVAILNUM00: GUILabel;
  LBL_RTEXT: GUILabel;
  LBL_LTEXT: GUILabel;
  BTN_YTEXT: GUIButton;
  BTN_ATEXT: GUIButton;

  selectedCard: PazaakCards = PazaakCards.INVALID;
  selectedSideCard: PazaakSideDeckSlots = PazaakSideDeckSlots.INVALID;

  knownCards: Map<number, boolean> = new Map();

  constructor(){
    super();
    this.gui_resref = 'pazaaksetup';
    this.background = '1600x1200pazaak';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      /**
       * Begin the game
       */
      this.BTN_ATEXT.addEventListener('click', () => {
        console.log('PazaakSetup: Begin Game');
        this.close();
        GameState.MenuManager.MenuPazaakGame.open();
      });

      /**
       * Add card to the side deck
       */
      this.BTN_YTEXT.addEventListener('click', () => {
        console.log('BTN_YTEXT');
      });
      this.BTN_YTEXT.hide();

      /**
       * Available cards
       */
      for(let i = 0; i < PazaakCards.MAX_CARDS; i++){
        const card = GameState.PazaakManager.Cards.get(i);
        if(card){
          const button = this.getCardButton(i);
          if(!button){
            continue;
          }
          button.swapBorderAndHighliteOnHover = false;
          button.addEventListener('click', () => {
            this.selectedCard = i;
            console.log(`PazaakSetup: Selected card ${i}, count: ${card.count}`);
            if(card.count <= 0){
              return;
            }
            for(let j = 0; j < PazaakSideDeckSlots.MAX_SLOTS; j++){
              const sideCard = GameState.PazaakManager.PlayerSideDeck.get(j);
              if(sideCard != PazaakCards.INVALID){
                continue;
              }
              GameState.PazaakManager.MoveCardToSideDeck(card.card, j);
              this.rebuild();
              break;
            }
          });
        }
      }

      /**
       * Side deck cards
       */
      for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
        const button = this.getSideCardButton(i);
        if(!button){
          continue;
        }
        button.swapBorderAndHighliteOnHover = false;
        button.addEventListener('click', () => {
          const card = GameState.PazaakManager.PlayerSideDeck.get(i);
          this.selectedSideCard = i;
          console.log(`PazaakSetup: Side card ${i} - ${card}`);
          if(card != PazaakCards.INVALID){
            GameState.PazaakManager.MoveSideDeckCardToMainDeck(i);
            this.rebuild();
          }
        });
      }

      resolve();
    });
  }

  open(){
    super.open();
    if(GameState.PazaakManager.MaxWager > 0){
      GameState.MenuManager.MenuPazaakWager.open();
    }
    this.knownCards.clear();
    for(let i = 0; i < PazaakCards.MAX_CARDS; i++){
      const card = GameState.PazaakManager.Cards.get(i);
      if(card && card.count > 0){
        this.knownCards.set(i, true);
      }else{
        this.knownCards.set(i, false);
      }
    }
    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      const card = GameState.PazaakManager.PlayerSideDeck.get(i);
      if(card && card != PazaakCards.INVALID){
        this.knownCards.set(card, true);
      }
    }
    this.rebuild();
  }

  getCardButton(cardIndex: PazaakCards){
    const rowIndex = Math.floor(cardIndex / 6);
    const columnIndex = cardIndex % 6;
    const buttonTag = `BTN_AVAIL${rowIndex}${columnIndex}`;
    return (this as any)[buttonTag] as GUIButton;
  }

  getCardLabel(cardIndex: PazaakCards){
    const rowIndex = Math.floor(cardIndex / 6);
    const columnIndex = cardIndex % 6;
    const labelTag = `LBL_AVAIL${rowIndex}${columnIndex}`;
    return (this as any)[labelTag] as GUIControl;
  }

  getCardCountLabel(cardIndex: PazaakCards){
    const rowIndex = Math.floor(cardIndex / 6);
    const columnIndex = cardIndex % 6;
    const labelTag = `LBL_AVAILNUM${rowIndex}${columnIndex}`;
    return (this as any)[labelTag] as GUIControl;
  }

  getSideCardButton(cardIndex: PazaakCards){
    const buttonTag = `BTN_CHOSEN${cardIndex}`;
    return (this as any)[buttonTag] as GUIButton;
  }

  getSideCardLabel(cardIndex: PazaakCards){
    const labelTag = `LBL_CHOSEN${cardIndex}`;
    return (this as any)[labelTag] as GUIControl;
  }

  setCardCount(cardIndex: PazaakCards, count: number){
    const rowIndex = Math.floor(cardIndex / 6);
    const columnIndex = cardIndex % 6;
    const labelTag = `LBL_AVAILNUM${rowIndex}${columnIndex}`;
    const label = (this as any)[labelTag] as GUIControl;
    if(!label){
      console.error(`Label ${labelTag} - ${cardIndex} not found`);
      return;
    }
    label.setText(count.toString());
  }

  rebuild(){
    for(let i = 0; i < PazaakCards.MAX_CARDS; i++){
      const card = GameState.PazaakManager.Cards.get(i);
      if(card){
        this.setCardCount(i, card.count);
      }

      const bCardAvailable = card.count > 0;
      const bCardKnown = this.knownCards.get(i);

      const button = this.getCardButton(i);
      if(button){
        button.swapBorderAndHighliteOnHover = false;
        button.disableSelection = !bCardAvailable;
        bCardAvailable || bCardKnown ? button.show() : button.hide();
      }
      const label = this.getCardCountLabel(i);
      if(label){
        bCardAvailable || bCardKnown ? label.show() : label.hide();
      }
      const label2 = this.getCardLabel(i);
      if(label2){
        bCardAvailable || bCardKnown ? label2.show() : label2.hide();
      }
    }

    for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
      const card = GameState.PazaakManager.PlayerSideDeck.get(i);
      const button = this.getSideCardButton(i);
      const label = this.getSideCardLabel(i);
      if(!button || !label){
        continue;
      }
      button.swapBorderAndHighliteOnHover = false;
      if(typeof card === 'number' && card != PazaakCards.INVALID){
        label.setText(card.toString());
        const type = Math.floor(card/6);
        const modifier = (card % 6) + 1;
        if(type === 0){
          button.setFillTextureName(PazaakCardGUITextures.CARD_POS, false);
          label.setText(`+${modifier}`);
        }else if(type === 1){
          button.setFillTextureName(PazaakCardGUITextures.CARD_NEG, false);
          label.setText(`-${modifier}`);
        }else if(type === 2){
          button.setFillTextureName(PazaakCardGUITextures.CARD_TWOSIDED_POS, false);
          label.setText(`±${modifier}`);
        }
      }else{
        label.setText('');
        button.setFillTextureName(PazaakCardGUITextures.CARD_BACK, false);
      }
    }
  }
}
