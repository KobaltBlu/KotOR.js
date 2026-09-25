import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUIProtoItem } from "@/gui";
import { GUIFeatItem, FeatItemState } from "@/game/kotor/gui/GUIFeatItem";
import type { ModuleCreature } from "@/module";
import type { CreatureClass } from "@/combat/CreatureClass";
import type { TalentFeat } from "@/talents";
import { GameState } from "@/GameState";

/**
 * CharGenFeats class.
 *
 * Level-1 feat selection. The creature's class decides which feats are
 * listed (feat.2da <code>_list), which are granted automatically
 * (<code>_granted) and how many may be picked (featgain.2da <code>_reg).
 * Picks are kept in a working copy until BTN_ACCEPT commits them to the
 * creature; BTN_BACK discards them.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenFeats.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenFeats extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  DESC_LBL: GUILabel;
  STD_SELECTIONS_REMAINING_LBL: GUILabel;
  STD_REMAINING_SELECTIONS_LBL: GUILabel;
  LB_FEATS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_NAME: GUILabel;
  BTN_RECOMMENDED: GUIButton;
  BTN_SELECT: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  creature: ModuleCreature;

  /** Feats picked on this screen but not committed to the creature yet */
  selectedFeats: TalentFeat[] = [];
  /** Ids of the picks a previous BTN_ACCEPT committed, so re-entering the screen can change them */
  committedPickIds: number[] = [];
  /** The feat shown in LBL_NAME / LB_DESC and targeted by BTN_SELECT */
  focusedFeat: TalentFeat;
  /** Feat picks available at the creature's current class level */
  maxPicks: number = 0;
  /** Chains (base -> improved -> master) currently listed in LB_FEATS */
  featGroups: TalentFeat[][] = [];

  constructor(){
    super();
    this.gui_resref = 'ftchrgen';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
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
        //Discard the working copy; the next show() rebuilds it from the creature
        this.close();
      });
    }

    if(this.BTN_ACCEPT){
      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.canAccept()){
          return;
        }
        this.commitSelection();
        this.close();
      });
    }

    if(this.BTN_SELECT){
      this.BTN_SELECT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.focusedFeat){
          this.toggleFeat(this.focusedFeat);
        }
      });
    }

    if(this.BTN_RECOMMENDED){
      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyRecommendedFeats();
      });
    }

    if(this.LB_FEATS){
      this.LB_FEATS.setProtoBuilder(this.getFeatItemClass());
    }
  }

  /**
   * The list row class used for LB_FEATS; the TSL subclass swaps in its own.
   */
  protected getFeatItemClass(): typeof GUIProtoItem {
    return GUIFeatItem;
  }

  show() {
    super.show();
    this.reload();
  }

  setCreature(creature: ModuleCreature){
    if(creature !== this.creature){
      //Picks committed for another creature mean nothing for this one
      this.committedPickIds = [];
    }
    this.creature = creature;
  }

  /**
   * Forgets everything picked so far (the creature's feats are left alone).
   */
  reset(){
    this.selectedFeats = [];
    this.committedPickIds = [];
    this.focusedFeat = undefined;
  }

  /**
   * The class the feats are picked for. During character generation the
   * creature has exactly one class.
   */
  getCreatureClass(): CreatureClass {
    if(!this.creature || !this.creature.classes || !this.creature.classes.length){
      return undefined;
    }
    return this.creature.classes[0];
  }

  getClassLevel(): number {
    const creatureClass = this.getCreatureClass();
    return Math.max(1, creatureClass ? creatureClass.level : 1);
  }

  /**
   * Rebuilds the working copy and the list from the creature's current feats.
   */
  reload(){
    this.focusedFeat = undefined;
    this.selectedFeats = [];
    this.maxPicks = 0;
    this.featGroups = [];

    if(!this.creature){
      console.warn('CharGenFeats.reload', 'No creature set');
      if(this.LB_FEATS){
        this.LB_FEATS.setItems([]);
      }
      this.updateRemainingLabel();
      this.setFocusedFeat(undefined);
      return;
    }

    this.addGrantedFeats();

    const creatureClass = this.getCreatureClass();
    this.maxPicks = creatureClass ? creatureClass.getFeatPickCount(this.getClassLevel()) : 0;

    //Picks committed by an earlier Accept stay selected so they can still be changed
    this.committedPickIds = this.committedPickIds.filter((id) => this.creature.getHasFeat(id));
    for(let i = 0; i < this.committedPickIds.length; i++){
      const feat = GameState.SWRuleSet.feats[this.committedPickIds[i]];
      if(feat && this.selectedFeats.length < this.maxPicks){
        this.selectedFeats.push(feat);
      }
    }

    this.buildFeatList();
    this.updateRemainingLabel();
    this.setFocusedFeat(this.selectedFeats.length ? this.selectedFeats[0] : undefined);
  }

  /**
   * Gives the creature every feat its class grants automatically at or below
   * its current class level (feat.2da <code>_list == 3, <code>_granted).
   * Idempotent: feats the creature already has (e.g. granted by the
   * quick/custom panel) are skipped.
   */
  addGrantedFeats() {
    const creatureClass = this.getCreatureClass();
    if(!creatureClass){
      return;
    }

    const level = this.getClassLevel();
    const feats = GameState.SWRuleSet.feats;
    for(let i = 0; i < feats.length; i++){
      const feat = feats[i];
      if(!feat){ continue; }
      if(!creatureClass.isFeatGrantedAtLevel(feat, level)){ continue; }
      if(this.creature.getHasFeat(feat.id)){ continue; }
      //addFeat(id) builds a fresh TalentFeat for the creature
      this.creature.addFeat(feat.id);
    }
  }

  /**
   * Groups the feats the class can hold into chains keyed by feat id:
   * [base, improved, master]. A chain starts at a feat without prerequisites
   * that the creature owns or can pick; its members are the class-available
   * feats that require it (both prerequisites set = third tier).
   */
  buildFeatList() {
    this.featGroups = [];
    const creatureClass = this.getCreatureClass();
    if(!creatureClass || !this.creature){
      if(this.LB_FEATS){
        this.LB_FEATS.setItems([]);
      }
      return;
    }

    const feats = GameState.SWRuleSet.feats;
    const isChainMember = (feat: TalentFeat) => !!feat && creatureClass.isFeatAvailable(feat);

    const groups: TalentFeat[][] = [];
    for(let i = 0; i < feats.length; i++){
      const feat = feats[i];
      if(!feat){ continue; }

      //Only chain roots start a row
      if(feat.prereqFeat1 >= 0 || feat.prereqFeat2 >= 0){ continue; }

      const owned = this.creature.getHasFeat(feat.id);
      if(!owned && !creatureClass.isFeatSelectable(feat)){ continue; }

      const group: TalentFeat[] = [feat];
      for(let j = 0; j < feats.length; j++){
        const chainFeat = feats[j];
        if(!chainFeat || chainFeat === feat || !isChainMember(chainFeat)){ continue; }

        const req1 = chainFeat.prereqFeat1;
        const req2 = chainFeat.prereqFeat2;
        if(req1 != feat.id && req2 != feat.id){ continue; }

        if(req1 >= 0 && req2 >= 0){
          if(!group[2]){ group[2] = chainFeat; }
        }else{
          if(!group[1]){ group[1] = chainFeat; }
        }
      }

      //A third tier that only names the second tier as its prerequisite
      if(group[1] && !group[2]){
        const second = group[1];
        for(let j = 0; j < feats.length; j++){
          const chainFeat = feats[j];
          if(!chainFeat || chainFeat === feat || chainFeat === second || !isChainMember(chainFeat)){ continue; }
          const onlySecond = (chainFeat.prereqFeat1 == second.id && chainFeat.prereqFeat2 < 0) ||
            (chainFeat.prereqFeat2 == second.id && chainFeat.prereqFeat1 < 0);
          if(onlySecond){
            group[2] = chainFeat;
            break;
          }
        }
      }

      groups.push(group);
    }

    groups.sort((groupa, groupb) => {
      const categoryA = groupa[0].toolsCategories || 0;
      const categoryB = groupb[0].toolsCategories || 0;
      if(categoryA != categoryB){
        return categoryA - categoryB;
      }
      return groupa[0].id - groupb[0].id;
    });

    this.featGroups = groups;
    if(this.LB_FEATS){
      this.LB_FEATS.setItems(groups);
    }
  }

  /*
   * Selection model
   */

  getRemainingPicks(): number {
    return Math.max(0, this.maxPicks - this.selectedFeats.length);
  }

  isFeatSelected(feat: TalentFeat): boolean {
    if(!feat){ return false; }
    return this.selectedFeats.some((selected) => selected.id == feat.id);
  }

  /**
   * True when the creature holds the feat independently of this screen's
   * picks (granted feats, or picks committed for good elsewhere).
   */
  isFeatOwned(feat: TalentFeat): boolean {
    if(!feat || !this.creature){ return false; }
    return this.creature.getHasFeat(feat.id) && this.committedPickIds.indexOf(feat.id) == -1;
  }

  isFeatFocused(feat: TalentFeat): boolean {
    return !!feat && !!this.focusedFeat && this.focusedFeat.id == feat.id;
  }

  /**
   * Whether a prerequisite counts as satisfied: owned by the creature or
   * picked on this screen.
   */
  protected hasFeatForPrerequisite(featId: number): boolean {
    if(featId < 0){ return true; }
    if(this.selectedFeats.some((selected) => selected.id == featId)){
      return true;
    }
    return !!this.creature && this.creature.getHasFeat(featId) && this.committedPickIds.indexOf(featId) == -1;
  }

  meetsPrerequisites(feat: TalentFeat): boolean {
    if(!feat){ return false; }
    if(feat.prereqFeat1 >= 0 && !this.hasFeatForPrerequisite(feat.prereqFeat1)){ return false; }
    if(feat.prereqFeat2 >= 0 && !this.hasFeatForPrerequisite(feat.prereqFeat2)){ return false; }

    //orreqfeat0..4: at least one of the listed feats is required (Aurora cls_feat semantics; unused by vanilla K1 rows)
    const orRequirements = [feat.orReqFeat0, feat.orReqFeat1, feat.orReqFeat2, feat.orReqFeat3, feat.orReqFeat4]
      .filter((id) => typeof id === 'number' && id >= 0);
    if(orRequirements.length && !orRequirements.some((id) => this.hasFeatForPrerequisite(id))){
      return false;
    }
    return true;
  }

  /**
   * feat.2da level / attribute / attack bonus minimums. minspelllvl and
   * reqskill are not checked: neither applies to a level-1 pick.
   */
  meetsMinimums(feat: TalentFeat): boolean {
    if(!feat || !this.creature){ return false; }
    const level = Math.max(1, this.creature.getTotalClassLevel());
    if(feat.minCharLevel > level){ return false; }
    if(feat.minStr > 0 && this.creature.getSTR() < feat.minStr){ return false; }
    if(feat.minDex > 0 && this.creature.getDEX() < feat.minDex){ return false; }
    if(feat.minInt > 0 && this.creature.getINT() < feat.minInt){ return false; }
    if(feat.minWis > 0 && this.creature.getWIS() < feat.minWis){ return false; }
    if(feat.minAttackBonus > 0){
      const creatureClass = this.getCreatureClass();
      if(creatureClass && creatureClass.getBaseAttackBonus() < feat.minAttackBonus){ return false; }
    }
    return true;
  }

  /**
   * Whether the feat could be picked now. `ignoreRemaining` answers the
   * display question (would it be pickable with a pick left?).
   */
  canSelectFeat(feat: TalentFeat, ignoreRemaining: boolean = false): boolean {
    const creatureClass = this.getCreatureClass();
    if(!feat || !creatureClass){ return false; }
    if(!creatureClass.isFeatSelectable(feat)){ return false; }
    if(this.isFeatOwned(feat) || this.isFeatSelected(feat)){ return false; }
    if(!ignoreRemaining && this.getRemainingPicks() <= 0){ return false; }
    if(!this.meetsPrerequisites(feat)){ return false; }
    if(!this.meetsMinimums(feat)){ return false; }
    return true;
  }

  getFeatState(feat: TalentFeat): FeatItemState {
    if(this.isFeatSelected(feat)){
      return FeatItemState.SELECTED;
    }
    if(this.isFeatOwned(feat)){
      return FeatItemState.OWNED;
    }
    if(this.canSelectFeat(feat, true)){
      return FeatItemState.AVAILABLE;
    }
    return FeatItemState.LOCKED;
  }

  hasSelectableFeats(): boolean {
    const feats = GameState.SWRuleSet.feats;
    for(let i = 0; i < feats.length; i++){
      if(feats[i] && this.canSelectFeat(feats[i])){
        return true;
      }
    }
    return false;
  }

  /**
   * Every pick has to be spent before the screen can be accepted, unless the
   * data offers nothing to pick (never soft-lock character generation).
   */
  canAccept(): boolean {
    if(this.getRemainingPicks() <= 0){
      return true;
    }
    return !this.hasSelectableFeats();
  }

  toggleFeat(feat: TalentFeat){
    if(this.isFeatSelected(feat)){
      this.deselectFeat(feat);
    }else if(this.canSelectFeat(feat)){
      this.selectedFeats.push(feat);
    }else{
      return;
    }
    this.onSelectionChanged();
  }

  /**
   * Drops the feat from the working copy along with any pick that depended on it.
   */
  deselectFeat(feat: TalentFeat){
    this.selectedFeats = this.selectedFeats.filter((selected) => selected.id != feat.id);

    let changed = true;
    while(changed){
      changed = false;
      for(let i = this.selectedFeats.length - 1; i >= 0; i--){
        if(!this.meetsPrerequisites(this.selectedFeats[i])){
          this.selectedFeats.splice(i, 1);
          changed = true;
        }
      }
    }
  }

  /**
   * Replaces the working copy with the class recommended feats
   * (feat.2da <code>_recom order) up to the number of picks available.
   */
  applyRecommendedFeats(){
    const creatureClass = this.getCreatureClass();
    if(!creatureClass){
      return;
    }

    this.selectedFeats = [];

    const candidates = GameState.SWRuleSet.feats.filter((feat) => {
      return !!feat && creatureClass.isFeatSelectable(feat) && creatureClass.getFeatRecommendedOrder(feat) > 0;
    }).sort((a, b) => {
      const orderA = creatureClass.getFeatRecommendedOrder(a);
      const orderB = creatureClass.getFeatRecommendedOrder(b);
      if(orderA != orderB){
        return orderA - orderB;
      }
      return a.id - b.id;
    });

    //Repeat so a recommended chain member becomes pickable once its base was picked
    let progress = true;
    while(this.getRemainingPicks() > 0 && progress){
      progress = false;
      for(let i = 0; i < candidates.length; i++){
        if(this.getRemainingPicks() <= 0){ break; }
        if(this.canSelectFeat(candidates[i])){
          this.selectedFeats.push(candidates[i]);
          progress = true;
        }
      }
    }

    this.onSelectionChanged();
    this.setFocusedFeat(this.selectedFeats.length ? this.selectedFeats[0] : this.focusedFeat);
  }

  /**
   * Writes the working copy to the creature: picks from an earlier Accept
   * that were deselected are removed, the current picks are added.
   */
  commitSelection(){
    if(!this.creature){
      return;
    }

    for(let i = 0; i < this.committedPickIds.length; i++){
      const id = this.committedPickIds[i];
      if(!this.selectedFeats.some((selected) => selected.id == id)){
        this.removeCreatureFeat(id);
      }
    }

    for(let i = 0; i < this.selectedFeats.length; i++){
      //addFeat(id) builds a fresh TalentFeat and skips duplicates
      this.creature.addFeat(this.selectedFeats[i].id);
    }

    this.committedPickIds = this.selectedFeats.map((selected) => selected.id);
  }

  protected removeCreatureFeat(featId: number){
    const feats = this.creature.feats;
    if(!feats){ return; }
    for(let i = feats.length - 1; i >= 0; i--){
      if(feats[i].id == featId){
        feats.splice(i, 1);
      }
    }
  }

  /*
   * UI feedback
   */

  protected onSelectionChanged(){
    this.updateRemainingLabel();
    this.updateSelectButton();
    this.refreshFeatItems();
  }

  /**
   * Called by the list rows when a feat icon is clicked.
   */
  onFeatItemClick(feat: TalentFeat, item?: GUIFeatItem){
    this.setFocusedFeat(feat);
  }

  /**
   * Shows the feat's name and description and points BTN_SELECT at it.
   */
  setFocusedFeat(feat: TalentFeat){
    this.focusedFeat = feat;

    if(this.LBL_NAME){
      this.LBL_NAME.setText(feat ? this.getTLKString(feat.name) : '');
    }

    if(this.LB_DESC){
      const description = feat ? this.getTLKString(feat.description) : '';
      this.LB_DESC.setItem(description.length ? description : null);
    }

    this.updateSelectButton();
    this.refreshFeatItems();
  }

  updateSelectButton(){
    if(!this.BTN_SELECT){
      return;
    }
    const feat = this.focusedFeat;
    if(feat && (this.isFeatSelected(feat) || this.canSelectFeat(feat))){
      this.BTN_SELECT.show();
    }else{
      this.BTN_SELECT.hide();
    }
  }

  updateRemainingLabel(){
    if(this.STD_REMAINING_SELECTIONS_LBL){
      this.STD_REMAINING_SELECTIONS_LBL.setText(this.getRemainingPicks());
    }
  }

  /**
   * Updates the rows in place (locked/available/owned/selected/focused).
   */
  refreshFeatItems(){
    if(!this.LB_FEATS){
      return;
    }
    const rows = this.LB_FEATS.children;
    for(let i = 0; i < rows.length; i++){
      const row = rows[i] as GUIFeatItem;
      if(typeof row.updateFeatStates === 'function'){
        row.updateFeatStates();
      }
    }
    this.LB_FEATS.markListRttDirty();
  }

  getTLKString(strRef: number): string {
    const tlkString = GameState.TLKManager?.TLKStrings?.[strRef];
    return tlkString ? tlkString.Value : '';
  }

}
