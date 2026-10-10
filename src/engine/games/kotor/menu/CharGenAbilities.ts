import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import type { Creature } from "@engine/module/Creature";
import { CharGenAttribute } from "@core/enums/chargen/CharGenAttribute";
import { costToDecreaseAbility, costToIncreaseAbility } from "@engine/rules/ability-points";
import { GameMenu } from "@engine/gui";
import { GameState } from "@engine/runtime/GameState";

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

  creature: Creature;
  /** Focused ability for cost/desc labels (chargen UX). */
  selectedAttribute: CharGenAttribute = CharGenAttribute.STR;
  /** When true, Accept only picks +1 attribute for LevelUpManager draft. */
  levelUpMode: boolean = false;
  levelUpAcceptCallback?: () => void;

  /** KotOR dialog.tlk ability descriptions (STR…CHA). */
  private static readonly ABILITY_DESC_STRREF: Record<number, number> = {
    [CharGenAttribute.STR]: 132,
    [CharGenAttribute.DEX]: 133,
    [CharGenAttribute.CON]: 134,
    [CharGenAttribute.WIS]: 136,
    [CharGenAttribute.INT]: 135,
    [CharGenAttribute.CHA]: 137,
  };

  constructor(){
    super();
    this.gui_resref = 'abchrgen';
    this.background = '';
    this.voidFill = true;
  }

  private getScore(attr: CharGenAttribute): number {
    const mgr = GameState.CharGenManager;
    switch(attr){
      case CharGenAttribute.STR: return mgr.str;
      case CharGenAttribute.DEX: return mgr.dex;
      case CharGenAttribute.CON: return mgr.con;
      case CharGenAttribute.WIS: return mgr.wis;
      case CharGenAttribute.INT: return mgr.int;
      case CharGenAttribute.CHA: return mgr.cha;
      default: return 8;
    }
  }

  private setScore(attr: CharGenAttribute, value: number) {
    const mgr = GameState.CharGenManager;
    switch(attr){
      case CharGenAttribute.STR: mgr.str = value; break;
      case CharGenAttribute.DEX: mgr.dex = value; break;
      case CharGenAttribute.CON: mgr.con = value; break;
      case CharGenAttribute.WIS: mgr.wis = value; break;
      case CharGenAttribute.INT: mgr.int = value; break;
      case CharGenAttribute.CHA: mgr.cha = value; break;
    }
  }

  private getCreatureBase(attr: CharGenAttribute): number {
    if(!this.creature) return 8;
    switch(attr){
      case CharGenAttribute.STR: return this.creature.str;
      case CharGenAttribute.DEX: return this.creature.dex;
      case CharGenAttribute.CON: return this.creature.con;
      case CharGenAttribute.WIS: return this.creature.wis;
      case CharGenAttribute.INT: return this.creature.int;
      case CharGenAttribute.CHA: return this.creature.cha;
      default: return 8;
    }
  }

  private tryIncrease(attr: CharGenAttribute) {
    if(this.levelUpMode){
      this.selectedAttribute = attr;
      this.updateFocusedAbilityLabels();
      return;
    }
    if(!this.creature) return;
    const score = this.getScore(attr);
    const cost = costToIncreaseAbility(score);
    if(cost > GameState.CharGenManager.availPoints) return;
    if(score >= 18) return;
    this.setScore(attr, score + 1);
    GameState.CharGenManager.availPoints -= cost;
  }

  private tryDecrease(attr: CharGenAttribute) {
    if(this.levelUpMode) return;
    if(!this.creature) return;
    const score = this.getScore(attr);
    if(score <= 8 || score <= this.getCreatureBase(attr)) return;
    const refund = costToDecreaseAbility(score);
    this.setScore(attr, score - 1);
    GameState.CharGenManager.availPoints += refund;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();

        if(this.levelUpMode){
          this.levelUpAcceptCallback?.();
          this.levelUpAcceptCallback = undefined;
          this.levelUpMode = false;
          this.close();
          return;
        }

        if(this.creature){
          this.creature.str = GameState.CharGenManager.str;
          this.creature.dex = GameState.CharGenManager.dex;
          this.creature.con = GameState.CharGenManager.con;
          this.creature.wis = GameState.CharGenManager.wis;
          this.creature.int = GameState.CharGenManager.int;
          this.creature.cha = GameState.CharGenManager.cha;
          GameState.CharGenManager.applyClassSavingThrows(this.creature as any);
        }

        this.manager.CharGenMain.updateAttributes();
        this.manager.CharGenCustomPanel?.abilityCreationCompleted?.();
        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.availPoints = 0;
        if(this.creature?.classes?.[0]){
          const cls = this.creature.classes[0];
          GameState.CharGenManager.str = cls.str | 0;
          GameState.CharGenManager.dex = cls.dex | 0;
          GameState.CharGenManager.con = cls.con | 0;
          GameState.CharGenManager.wis = cls.wis | 0;
          GameState.CharGenManager.int = cls.int | 0;
          GameState.CharGenManager.cha = cls.cha | 0;
        }
        this.updateButtonStates();
      });

      const bindSelect = (btn: GUIButton, attr: CharGenAttribute) => {
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedAttribute = attr;
          this.updateFocusedAbilityLabels();
        });
      };
      bindSelect(this.STR_POINTS_BTN, CharGenAttribute.STR);
      bindSelect(this.DEX_POINTS_BTN, CharGenAttribute.DEX);
      bindSelect(this.CON_POINTS_BTN, CharGenAttribute.CON);
      bindSelect(this.WIS_POINTS_BTN, CharGenAttribute.WIS);
      bindSelect(this.INT_POINTS_BTN, CharGenAttribute.INT);
      bindSelect(this.CHA_POINTS_BTN, CharGenAttribute.CHA);

      const bindMinus = (btn: GUIButton, attr: CharGenAttribute) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedAttribute = attr;
          this.tryDecrease(attr);
          this.updateButtonStates();
        });
      };
      const bindPlus = (btn: GUIButton, attr: CharGenAttribute) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedAttribute = attr;
          this.tryIncrease(attr);
          this.updateButtonStates();
        });
      };

      bindMinus(this.STR_MINUS_BTN, CharGenAttribute.STR);
      bindMinus(this.DEX_MINUS_BTN, CharGenAttribute.DEX);
      bindMinus(this.CON_MINUS_BTN, CharGenAttribute.CON);
      bindMinus(this.WIS_MINUS_BTN, CharGenAttribute.WIS);
      bindMinus(this.INT_MINUS_BTN, CharGenAttribute.INT);
      bindMinus(this.CHA_MINUS_BTN, CharGenAttribute.CHA);

      bindPlus(this.STR_PLUS_BTN, CharGenAttribute.STR);
      bindPlus(this.DEX_PLUS_BTN, CharGenAttribute.DEX);
      bindPlus(this.CON_PLUS_BTN, CharGenAttribute.CON);
      bindPlus(this.WIS_PLUS_BTN, CharGenAttribute.WIS);
      bindPlus(this.INT_PLUS_BTN, CharGenAttribute.INT);
      bindPlus(this.CHA_PLUS_BTN, CharGenAttribute.CHA);

      resolve();
    });
  }

  show(){
    super.show();
    if(!this.creature){
      this.creature = GameState.CharGenManager.selectedCreature;
    }
    this.updateButtonStates();
  }

  setCreature(creature: Creature){
    this.creature = creature;
  }

  updateButtonStates(){
    const mgr = GameState.CharGenManager;
    this.STR_POINTS_BTN.setText(mgr.str);
    this.DEX_POINTS_BTN.setText(mgr.dex);
    this.CON_POINTS_BTN.setText(mgr.con);
    this.WIS_POINTS_BTN.setText(mgr.wis);
    this.INT_POINTS_BTN.setText(mgr.int);
    this.CHA_POINTS_BTN.setText(mgr.cha);

    this.STR_MINUS_BTN.show();
    this.DEX_MINUS_BTN.show();
    this.CON_MINUS_BTN.show();
    this.WIS_MINUS_BTN.show();
    this.INT_MINUS_BTN.show();
    this.CHA_MINUS_BTN.show();

    this.STR_PLUS_BTN.show();
    this.DEX_PLUS_BTN.show();
    this.CON_PLUS_BTN.show();
    this.WIS_PLUS_BTN.show();
    this.INT_PLUS_BTN.show();
    this.CHA_PLUS_BTN.show();

    if(mgr.str <= 8 || this.creature?.str == mgr.str) this.STR_MINUS_BTN.hide();
    if(mgr.dex <= 8 || this.creature?.dex == mgr.dex) this.DEX_MINUS_BTN.hide();
    if(mgr.con <= 8 || this.creature?.con == mgr.con) this.CON_MINUS_BTN.hide();
    if(mgr.wis <= 8 || this.creature?.wis == mgr.wis) this.WIS_MINUS_BTN.hide();
    if(mgr.int <= 8 || this.creature?.int == mgr.int) this.INT_MINUS_BTN.hide();
    if(mgr.cha <= 8 || this.creature?.cha == mgr.cha) this.CHA_MINUS_BTN.hide();

    if(costToIncreaseAbility(mgr.str) > mgr.availPoints || mgr.str >= 18) this.STR_PLUS_BTN.hide();
    if(costToIncreaseAbility(mgr.dex) > mgr.availPoints || mgr.dex >= 18) this.DEX_PLUS_BTN.hide();
    if(costToIncreaseAbility(mgr.con) > mgr.availPoints || mgr.con >= 18) this.CON_PLUS_BTN.hide();
    if(costToIncreaseAbility(mgr.wis) > mgr.availPoints || mgr.wis >= 18) this.WIS_PLUS_BTN.hide();
    if(costToIncreaseAbility(mgr.int) > mgr.availPoints || mgr.int >= 18) this.INT_PLUS_BTN.hide();
    if(costToIncreaseAbility(mgr.cha) > mgr.availPoints || mgr.cha >= 18) this.CHA_PLUS_BTN.hide();

    this.REMAINING_SELECTIONS_LBL.setText(mgr.availPoints);
    this.updateFocusedAbilityLabels();
  }

  updateFocusedAbilityLabels() {
    const score = this.getScore(this.selectedAttribute);
    const cost = costToIncreaseAbility(score);
    const mod = Math.floor((score - 10) / 2);
    this.COST_POINTS_LBL?.setText?.(String(cost));
    this.LBL_ABILITY_MOD?.setText?.(mod >= 0 ? `+${mod}` : String(mod));
    const strRef = CharGenAbilities.ABILITY_DESC_STRREF[this.selectedAttribute];
    const desc = strRef != null
      ? (GameState.TLKManager.GetStringById?.(strRef)?.Value
        ?? GameState.TLKManager.TLKStrings?.[strRef]?.Value
        ?? '')
      : '';
    this.LB_DESC?.setItem?.(desc || null);
  }

  getAttributeCost(index = 0){
    return costToIncreaseAbility(this.getScore(index));
  }

  reset(){
    GameState.CharGenManager.availPoints = 30;
    GameState.CharGenManager.str = 8;
    GameState.CharGenManager.dex = 8;
    GameState.CharGenManager.con = 8;
    GameState.CharGenManager.wis = 8;
    GameState.CharGenManager.int = 8;
    GameState.CharGenManager.cha = 8;
    if(this.creature){
      this.creature.str = 8;
      this.creature.dex = 8;
      this.creature.con = 8;
      this.creature.wis = 8;
      this.creature.int = 8;
      this.creature.cha = 8;
    }
  }
  
}
