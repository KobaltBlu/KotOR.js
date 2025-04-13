import { TwoDAObject } from "../../resource/TwoDAObject";

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

  static ModifierToCardIndex(cardModifier: string){
    if(cardModifier == '+1'){
      return 0;
    }else if(cardModifier == '+2'){
      return 1;
    }else if(cardModifier == '+3'){
      return 2;
    }else if(cardModifier == '+4'){
      return 3;
    }else if(cardModifier == '+5'){
      return 4;
    }else if(cardModifier == '+6'){
      return 5;
    }else if(cardModifier == '-1'){
      return 6;
    }else if(cardModifier == '-2'){
      return 7;
    }else if(cardModifier == '-3'){
      return 8;
    }else if(cardModifier == '-4'){
      return 9;
    }else if(cardModifier == '-5'){
      return 10;
    }else if(cardModifier == '-6'){
      return 11;
    }else if(cardModifier == '+-1'){
      return 12;
    }else if(cardModifier == '+-2'){
      return 13;
    }else if(cardModifier == '+-3'){
      return 14;
    }else if(cardModifier == '+-4'){
      return 15;
    }else if(cardModifier == '+-5'){
      return 16;
    }else if(cardModifier == '+-6'){
      return 17;
    }else if(cardModifier == '$$'){ //TSL only
      return 18;
    }else if(cardModifier == 'F1'){ //TSL only
      return 19;
    }else if(cardModifier == 'F2'){ //TSL only
      return 20;
    }else if(cardModifier == 'TT'){ //TSL only
      return 21;
    }else if(cardModifier == 'VV'){ //TSL only
      return 22;
    }
    return -1;
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
