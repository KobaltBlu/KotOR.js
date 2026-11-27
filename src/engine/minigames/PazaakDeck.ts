import { TwoDAObject } from "@core/resource/TwoDAObject";
import { PazaakCards } from "@core/enums/minigames/PazaakCards";

export class PazaakDeck {

  id: number = -1;
  deckname: string = '';
  card0: string = '+1'; //modifier label eg '+1' default to '+1'
  card1: string = '+1'; //modifier label eg '+2' default to '+1'
  card2: string = '+1'; //modifier label eg '+3' default to '+1'
  card3: string = '+1'; //modifier label eg '+4' default to '+1'
  card4: string = '+1'; //modifier label eg '+5' default to '+1'
  card5: string = '+1'; //modifier label eg '+6' default to '+1'
  card6: string = '+1'; //modifier label eg '-1' default to '+1'
  card7: string = '+1'; //modifier label eg '-2' default to '+1'
  card8: string = '+1'; //modifier label eg '-3' default to '+1'
  card9: string = '+1'; //modifier label eg '-4' default to '+1'
  
  cards: number[] = []; //card indexes converted from modifier labels

  /**
   * Convert a pazaakdecks.2da entry into a side card index.
   *
   * The first character picks the card family and the second its value (1-6):
   * `+N` plus, `-N` minus, `*N` plus/minus (`+-N` is also accepted).
   * TSL gold cards: `$` Double, `F1` Flip 2&4, `F2` Flip 3&6, `T` Tie Breaker,
   * `V` ±1/±2 (letters are case-insensitive).
   */
  static ModifierToCardIndex(cardModifier: string): PazaakCards {
    const entry = (cardModifier || '').trim();
    if(!entry.length){
      return PazaakCards.INVALID;
    }

    const family = entry.charAt(0).toUpperCase();
    switch(family){
      case '$': return PazaakCards.DOUBLE;
      case 'F': return entry.charAt(1) == '1' ? PazaakCards.FLIP_2_AND_4 : PazaakCards.FLIP_3_AND_6;
      case 'T': return PazaakCards.TIE_BREAKER;
      case 'V': return PazaakCards.PLUS_MINUS_1_OR_2;
    }

    const digits = entry.startsWith('+-') ? entry.substring(2) : entry.substring(1);
    const value = parseInt(digits.charAt(0), 10);
    if(isNaN(value) || value < 1 || value > 6){
      return PazaakCards.INVALID;
    }
    if(entry.startsWith('+-') || family == '*'){
      return PazaakCards.PLUS_MINUS_1 + (value - 1);
    }
    if(family == '-'){
      return PazaakCards.MINUS_1 + (value - 1);
    }
    if(family == '+'){
      return PazaakCards.PLUS_1 + (value - 1);
    }
    return PazaakCards.INVALID;
  }

  static From2DA(row: any = {}){
    const deck = new PazaakDeck();

    deck.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('deckname'))
      deck.deckname = TwoDAObject.normalizeValue(row.deckname, 'string', '') as string;
    
    if(row.hasOwnProperty('card0'))
      deck.card0 = TwoDAObject.normalizeValue(row.card0, 'string', '') as string;
    
    if(row.hasOwnProperty('card1'))
      deck.card1 = TwoDAObject.normalizeValue(row.card1, 'string', '') as string;
    
    if(row.hasOwnProperty('card2'))
      deck.card2 = TwoDAObject.normalizeValue(row.card2, 'string', '') as string;
    
    if(row.hasOwnProperty('card3'))
      deck.card3 = TwoDAObject.normalizeValue(row.card3, 'string', '') as string;
    
    if(row.hasOwnProperty('card4'))
      deck.card4 = TwoDAObject.normalizeValue(row.card4, 'string', '') as string;
    
    if(row.hasOwnProperty('card5'))
      deck.card5 = TwoDAObject.normalizeValue(row.card5, 'string', '') as string;
    
    if(row.hasOwnProperty('card6'))
      deck.card6 = TwoDAObject.normalizeValue(row.card6, 'string', '') as string;
    
    if(row.hasOwnProperty('card7'))
      deck.card7 = TwoDAObject.normalizeValue(row.card7, 'string', '') as string;
    
    if(row.hasOwnProperty('card8'))
      deck.card8 = TwoDAObject.normalizeValue(row.card8, 'string', '') as string;
    
    if(row.hasOwnProperty('card9'))
      deck.card9 = TwoDAObject.normalizeValue(row.card9, 'string', '') as string;

    deck.cards = [
      PazaakDeck.ModifierToCardIndex(deck.card0),
      PazaakDeck.ModifierToCardIndex(deck.card1),
      PazaakDeck.ModifierToCardIndex(deck.card2),
      PazaakDeck.ModifierToCardIndex(deck.card3),
      PazaakDeck.ModifierToCardIndex(deck.card4),
      PazaakDeck.ModifierToCardIndex(deck.card5),
      PazaakDeck.ModifierToCardIndex(deck.card6),
      PazaakDeck.ModifierToCardIndex(deck.card7),
      PazaakDeck.ModifierToCardIndex(deck.card8),
      PazaakDeck.ModifierToCardIndex(deck.card9)
    ];

    return deck;
  }
}
