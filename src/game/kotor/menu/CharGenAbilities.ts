import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleCreature } from "@/module";
import { CharGenAttribute } from "@/enums/chargen/CharGenAttribute";
import { GameMenu } from "@/gui";
import { GameState } from "@/GameState";

/**
 * Attribute point-buy rules shared by both games:
 * every attribute starts at 8, 30 points to spend, hard cap of 18.
 */
const ATTRIBUTE_MIN = 8;
const ATTRIBUTE_MAX = 18;
const ATTRIBUTE_POINTS = 30;

/**
 * Per-attribute control name prefix and the chargen TLK strrefs for its name
 * and description (indexed by CharGenAttribute; identical in K1 and TSL).
 */
const ATTRIBUTE_ROWS: { attribute: CharGenAttribute; key: string; nameStrRef: number; descStrRef: number }[] = [
  { attribute: CharGenAttribute.STR, key: 'STR', nameStrRef: 211, descStrRef: 222 },
  { attribute: CharGenAttribute.DEX, key: 'DEX', nameStrRef: 212, descStrRef: 223 },
  { attribute: CharGenAttribute.CON, key: 'CON', nameStrRef: 213, descStrRef: 224 },
  { attribute: CharGenAttribute.WIS, key: 'WIS', nameStrRef: 214, descStrRef: 225 },
  { attribute: CharGenAttribute.INT, key: 'INT', nameStrRef: 215, descStrRef: 226 },
  { attribute: CharGenAttribute.CHA, key: 'CHA', nameStrRef: 216, descStrRef: 227 },
];

/**
 * CharGenAbilities class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenAbilities.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenAbilities extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DEX_POINTS_BTN: GUIButton;
  DEX_LBL: GUILabel;
  DEX_MINUS_BTN: GUIButton;
  DEX_PLUS_BTN: GUIButton;
  CON_POINTS_BTN: GUIButton;
  CON_PLUS_BTN: GUIButton;
  CON_MINUS_BTN: GUIButton;
  CON_LBL: GUILabel;
  WIS_POINTS_BTN: GUIButton;
  WIS_LBL: GUILabel;
  WIS_MINUS_BTN: GUIButton;
  WIS_PLUS_BTN: GUIButton;
  INT_POINTS_BTN: GUIButton;
  INT_PLUS_BTN: GUIButton;
  INT_MINUS_BTN: GUIButton;
  INT_LBL: GUILabel;
  CHA_POINTS_BTN: GUIButton;
  CHA_PLUS_BTN: GUIButton;
  CHA_MINUS_BTN: GUIButton;
  CHA_LBL: GUILabel;
  DESC_LBL: GUILabel;
  COST_LBL: GUILabel;
  COST_POINTS_LBL: GUILabel;
  LBL_MODIFIER: GUILabel;
  LBL_ABILITY_MOD: GUILabel;
  LB_DESC: GUIListBox;
  STR_POINTS_BTN: GUIButton;
  STR_LBL: GUILabel;
  STR_MINUS_BTN: GUIButton;
  STR_PLUS_BTN: GUIButton;
  BTN_RECOMMENDED: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  creature: ModuleCreature;

  /** The attribute row currently being hovered/clicked; drives the cost/modifier/description feedback */
  focusedAttribute: CharGenAttribute = CharGenAttribute.STR;

  constructor(){
    super();
    this.gui_resref = 'abchrgen';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //this.lbl_hint = this.getControlByName('LBL_HINT');
      this.wireControls();
      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        //Discard the working copy; the next show() reloads it from the creature
        this.close();
      });
    }

    if(this.BTN_ACCEPT){
      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();

        //Every point has to be spent before the attributes can be accepted (reone abilities.cpp, strategywiki chargen)
        if(GameState.CharGenManager.availPoints > 0){
          return;
        }

        if(this.creature){
          this.creature.str = GameState.CharGenManager.str;
          this.creature.dex = GameState.CharGenManager.dex;
          this.creature.con = GameState.CharGenManager.con;
          this.creature.wis = GameState.CharGenManager.wis;
          this.creature.int = GameState.CharGenManager.int;
          this.creature.cha = GameState.CharGenManager.cha;
        }

        this.manager.CharGenMain.updateAttributes();

        this.close();
      });
    }

    if(this.BTN_RECOMMENDED){
      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyRecommendedAttributes();
        this.updateButtonStates();
        this.setFocusedAttribute(this.focusedAttribute);
      });
    }

    for(let i = 0; i < ATTRIBUTE_ROWS.length; i++){
      this.wireAttributeRow(ATTRIBUTE_ROWS[i].attribute, ATTRIBUTE_ROWS[i].key);
    }
  }

  /**
   * Wires the +/- buttons and the hover/click focus feedback for one attribute row.
   * The +/- buttons are children of the *_POINTS_BTN, so click routing (deepest
   * control first) still hands them the click even though the value button
   * gets its own click listener.
   */
  protected wireAttributeRow(attribute: CharGenAttribute, key: string){
    const label = this.getControlByName(`${key}_LBL`);
    const pointsBtn = this.getControlByName(`${key}_POINTS_BTN`);
    const minusBtn = this.getControlByName(`${key}_MINUS_BTN`);
    const plusBtn = this.getControlByName(`${key}_PLUS_BTN`);

    const focus = () => {
      this.setFocusedAttribute(attribute);
    };

    if(label){
      label.addEventListener('hover', focus);
    }

    if(pointsBtn){
      pointsBtn.addEventListener('hover', focus);
      pointsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        focus();
      });
    }

    if(minusBtn){
      minusBtn.addEventListener('hover', focus);
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.decrementAttribute(attribute);
        this.updateButtonStates();
        focus();
      });
    }

    if(plusBtn){
      plusBtn.addEventListener('hover', focus);
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.incrementAttribute(attribute);
        this.updateButtonStates();
        focus();
      });
    }
  }

  show(){
    super.show();
    this.loadFromCreature();
    this.updateButtonStates();
    this.setFocusedAttribute(this.focusedAttribute);
  }

  setCreature(creature: ModuleCreature){
    this.creature = creature;
  }

  /**
   * Loads the working copy (CharGenManager.str..cha / availPoints) from the
   * creature's currently accepted attributes.
   */
  loadFromCreature(){
    if(!this.creature){
      console.warn('CharGenAbilities.loadFromCreature', 'No creature set');
      return;
    }

    GameState.CharGenManager.str = this.clampAttribute(this.creature.str);
    GameState.CharGenManager.dex = this.clampAttribute(this.creature.dex);
    GameState.CharGenManager.con = this.clampAttribute(this.creature.con);
    GameState.CharGenManager.wis = this.clampAttribute(this.creature.wis);
    GameState.CharGenManager.int = this.clampAttribute(this.creature.int);
    GameState.CharGenManager.cha = this.clampAttribute(this.creature.cha);
    this.recalculateAvailablePoints();
  }

  /**
   * Sets the working copy to the class recommended values and the remaining
   * points to whatever those values leave over.
   */
  applyRecommendedAttributes(){
    if(!this.creature || !this.creature.classes || !this.creature.classes[0]){
      console.warn('CharGenAbilities.applyRecommendedAttributes', 'No creature/class set');
      return;
    }

    const creatureClass = this.creature.classes[0];
    GameState.CharGenManager.str = this.clampAttribute(creatureClass.str);
    GameState.CharGenManager.dex = this.clampAttribute(creatureClass.dex);
    GameState.CharGenManager.con = this.clampAttribute(creatureClass.con);
    GameState.CharGenManager.wis = this.clampAttribute(creatureClass.wis);
    GameState.CharGenManager.int = this.clampAttribute(creatureClass.int);
    GameState.CharGenManager.cha = this.clampAttribute(creatureClass.cha);
    this.recalculateAvailablePoints();
  }

  recalculateAvailablePoints(){
    let spent = 0;
    for(let i = 0; i < ATTRIBUTE_ROWS.length; i++){
      spent += this.getTotalAttributeCost(this.getAttributeValue(ATTRIBUTE_ROWS[i].attribute));
    }
    GameState.CharGenManager.availPoints = Math.max(0, ATTRIBUTE_POINTS - spent);
  }

  incrementAttribute(attribute: CharGenAttribute){
    const value = this.getAttributeValue(attribute);
    const cost = this.getIncrementCost(value);
    if(value >= ATTRIBUTE_MAX || cost > GameState.CharGenManager.availPoints){
      return;
    }
    this.setAttributeValue(attribute, value + 1);
    GameState.CharGenManager.availPoints = Math.max(0, GameState.CharGenManager.availPoints - cost);
  }

  decrementAttribute(attribute: CharGenAttribute){
    const value = this.getAttributeValue(attribute);
    if(value <= ATTRIBUTE_MIN){
      return;
    }
    this.setAttributeValue(attribute, value - 1);
    //Refund the cost of the increment being undone (value-1 -> value)
    GameState.CharGenManager.availPoints += this.getIncrementCost(value - 1);
  }

  updateButtonStates(){
    if(!this.creature){
      console.warn('CharGenAbilities.updateButtonStates', 'No creature set');
      return;
    }

    for(let i = 0; i < ATTRIBUTE_ROWS.length; i++){
      const row = ATTRIBUTE_ROWS[i];
      const value = this.getAttributeValue(row.attribute);
      const pointsBtn = this.getControlByName(`${row.key}_POINTS_BTN`);
      const minusBtn = this.getControlByName(`${row.key}_MINUS_BTN`);
      const plusBtn = this.getControlByName(`${row.key}_PLUS_BTN`);
      const bonusLbl = this.getControlByName(`LBL_BONUS_${row.key}`);

      if(pointsBtn){
        pointsBtn.setText(value);
      }

      if(minusBtn){
        if(value > ATTRIBUTE_MIN){
          minusBtn.show();
        }else{
          minusBtn.hide();
        }
      }

      if(plusBtn){
        if(value < ATTRIBUTE_MAX && this.getIncrementCost(value) <= GameState.CharGenManager.availPoints){
          plusBtn.show();
        }else{
          plusBtn.hide();
        }
      }

      //TSL: per-row modifier labels
      if(bonusLbl){
        bonusLbl.setText(this.formatModifier(this.getAttributeModifier(value)));
      }
    }

    if(this.REMAINING_SELECTIONS_LBL){
      this.REMAINING_SELECTIONS_LBL.setText(GameState.CharGenManager.availPoints);
    }
  }

  /**
   * Updates the cost / modifier / description feedback for the hovered or clicked attribute.
   */
  setFocusedAttribute(attribute: CharGenAttribute){
    const row = ATTRIBUTE_ROWS.find((r) => r.attribute === attribute) || ATTRIBUTE_ROWS[0];
    this.focusedAttribute = row.attribute;
    const value = this.getAttributeValue(row.attribute);

    if(this.COST_POINTS_LBL){
      this.COST_POINTS_LBL.setText(this.getIncrementCost(value));
    }

    if(this.LBL_ABILITY_MOD){
      this.LBL_ABILITY_MOD.setText(this.formatModifier(this.getAttributeModifier(value)));
    }

    if(this.LB_DESC){
      const description = this.getTLKString(row.descStrRef);
      if(description){
        this.LB_DESC.setItem(description);
      }
    }
  }

  getAttributeValue(attribute: CharGenAttribute): number {
    switch(attribute){
      case CharGenAttribute.STR: return GameState.CharGenManager.str;
      case CharGenAttribute.DEX: return GameState.CharGenManager.dex;
      case CharGenAttribute.CON: return GameState.CharGenManager.con;
      case CharGenAttribute.WIS: return GameState.CharGenManager.wis;
      case CharGenAttribute.INT: return GameState.CharGenManager.int;
      case CharGenAttribute.CHA: return GameState.CharGenManager.cha;
    }
    return ATTRIBUTE_MIN;
  }

  setAttributeValue(attribute: CharGenAttribute, value: number){
    switch(attribute){
      case CharGenAttribute.STR: GameState.CharGenManager.str = value; break;
      case CharGenAttribute.DEX: GameState.CharGenManager.dex = value; break;
      case CharGenAttribute.CON: GameState.CharGenManager.con = value; break;
      case CharGenAttribute.WIS: GameState.CharGenManager.wis = value; break;
      case CharGenAttribute.INT: GameState.CharGenManager.int = value; break;
      case CharGenAttribute.CHA: GameState.CharGenManager.cha = value; break;
    }
  }

  /**
   * Cost of raising an attribute from `value` to `value + 1`:
   * 1 up to 14, 2 for 15 and 16, 3 for 17 and 18.
   */
  getIncrementCost(value: number): number {
    const next = value + 1;
    if(next <= 14) return 1;
    if(next <= 16) return 2;
    return 3;
  }

  /**
   * Total points spent to raise an attribute from the base of 8 to `value`.
   */
  getTotalAttributeCost(value: number): number {
    let total = 0;
    for(let v = ATTRIBUTE_MIN; v < value; v++){
      total += this.getIncrementCost(v);
    }
    return total;
  }

  /**
   * Cost of the next increment for the given attribute (working copy).
   */
  getAttributeCost(index = 0){
    return this.getIncrementCost(this.getAttributeValue(index));
  }

  getAttributeModifier(value: number): number {
    return Math.floor((value - 10) / 2);
  }

  formatModifier(modifier: number): string {
    return (modifier >= 0 ? '+' : '') + modifier;
  }

  clampAttribute(value: any): number {
    const parsed = parseInt(value as any);
    if(isNaN(parsed)) return ATTRIBUTE_MIN;
    return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, parsed));
  }

  getTLKString(strRef: number): string {
    const tlkString = GameState.TLKManager?.TLKStrings?.[strRef];
    return tlkString ? tlkString.Value : '';
  }

  reset(){
    GameState.CharGenManager.availPoints = ATTRIBUTE_POINTS;
    GameState.CharGenManager.str = ATTRIBUTE_MIN;
    GameState.CharGenManager.dex = ATTRIBUTE_MIN;
    GameState.CharGenManager.con = ATTRIBUTE_MIN;
    GameState.CharGenManager.wis = ATTRIBUTE_MIN;
    GameState.CharGenManager.int = ATTRIBUTE_MIN;
    GameState.CharGenManager.cha = ATTRIBUTE_MIN;
    if(this.creature){
      this.creature.str = ATTRIBUTE_MIN;
      this.creature.dex = ATTRIBUTE_MIN;
      this.creature.con = ATTRIBUTE_MIN;
      this.creature.wis = ATTRIBUTE_MIN;
      this.creature.int = ATTRIBUTE_MIN;
      this.creature.cha = ATTRIBUTE_MIN;
    }
    this.focusedAttribute = CharGenAttribute.STR;
  }

}
