import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import type { ModuleCreature } from "../../../module";
import { TalentSpell } from "../../../talents/TalentSpell";
import { GameState } from "../../../GameState";
import { TextureLoader } from "../../../loaders";
import { GUIFeatItem } from "../gui/GUIFeatItem";
import { CreatureClassType } from "../../../enums/nwscript/CreatureClassType";

/**
 * MenuPowerLevelUp class.
 *
 * Shows a list of force powers available for the creature to learn and lets
 * the player pick up to `pendingForcePowerSlots` new powers.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPowerLevelUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPowerLevelUp extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DESC_LBL: GUILabel;
  LB_POWERS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_POWER: GUILabel;
  RECOMMENDED_BTN: GUIButton;
  SELECT_BTN: GUIButton;
  ACCEPT_BTN: GUIButton;
  BACK_BTN: GUIButton;

  /** The creature that is levelling up. */
  creature: ModuleCreature;
  /** How many new powers the player may pick in this visit. */
  remainingSelections: number = 0;
  /** Powers selected in this session (not yet committed). */
  selectedPowers: TalentSpell[] = [];

  constructor(){
    super();
    this.gui_resref = 'pwrlvlup';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      if(this.SELECT_BTN){
        this.SELECT_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectHighlightedPower();
        });
      }

      if(this.ACCEPT_BTN){
        this.ACCEPT_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          this.applyAndClose();
        });
      }

      if(this.BACK_BTN){
        this.BACK_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
        });
        this._button_b = this.BACK_BTN;
      }

      resolve();
    });
  }

  /**
   * Prepare the menu for a new levelling-up session.
   * @param creature - The creature that is levelling up.
   * @param slots - Number of new force powers the player may choose.
   */
  setCreatureAndSlots(creature: ModuleCreature, slots: number){
    this.creature = creature;
    this.remainingSelections = slots;
    this.selectedPowers = [];
  }

  show(){
    super.show();
    this.selectedPowers = [];
    this.buildPowerList();
    this.updateRemaining();
    if(this.LB_POWERS) this.LB_POWERS.GUIProtoItemClass = GUIFeatItem;
    TextureLoader.LoadQueue();
  }

  /**
   * Populate LB_POWERS with the force powers the creature can learn.
   * Each list entry is an array matching the GUIFeatItem "group" convention
   * [base, upgrade, master] used by the feat list box.
   */
  buildPowerList(){
    if(!this.LB_POWERS) return;
    this.LB_POWERS.clearItems();

    const creature = this.creature ?? GameState.CharGenManager?.selectedCreature as ModuleCreature;
    if(!creature) return;

    const spells = GameState.SWRuleSet.spells;
    const spellCount = GameState.SWRuleSet.spellCount;

    // Determine which class column to check (guardian/consular/sentinel)
    const mainClass = creature.getMainClass();
    const classId = mainClass ? mainClass.id : -1;
    const isForceUser = (
      classId === CreatureClassType.JEDIGUARDIAN ||
      classId === CreatureClassType.JEDICONSULAR ||
      classId === CreatureClassType.JEDISENTINEL
    );

    for(let i = 0; i < spellCount; i++){
      const spell = spells[i];
      if(!spell) continue;
      // Only include root spells (no prerequisites → a top-level power chain)
      if(spell.prerequisites && spell.prerequisites.length > 0) continue;

      // Check class availability
      if(isForceUser){
        const minLevel = (
          classId === CreatureClassType.JEDIGUARDIAN ? spell.guardian :
          classId === CreatureClassType.JEDICONSULAR ? spell.consular :
          spell.sentinel
        );
        if(minLevel <= 0) continue;
      }else{
        // Non-Jedi can only pick powers that are unrestricted (all three = 0 
        // means it's a generic power, e.g. first-tier powers)
        const anyClass = spell.guardian > 0 || spell.consular > 0 || spell.sentinel > 0;
        if(!anyClass) continue;
      }

      // Build the tier group: [base, upgrade, master]
      const group: (TalentSpell|null)[] = [spell, null, null];
      if(spell.nextSpell){
        group[1] = spell.nextSpell;
        if(spell.nextSpell.nextSpell){
          group[2] = spell.nextSpell.nextSpell;
        }
      }

      // Build a row object compatible with GUIFeatItem (uses feat.icon etc.)
      // Map spell fields to the shape GUIFeatItem expects.
      const rowGroup = group.map(s => {
        if(!s) return null;
        return {
          __rowlabel: String(s.id),
          __index: s.id,
          icon: s.iconresref,
          label: s.name,
          name: s.name,
          prereqfeat1: s.prerequisites?.[0] ?? '****',
          prereqfeat2: '****',
          constant: s.name || 'SPELL',
        };
      });

      this.LB_POWERS.addItem(rowGroup);
    }
    this.LB_POWERS.updateList();
  }

  /**
   * Grant the highlighted power chain's next learnable tier to the creature.
   */
  selectHighlightedPower(){
    const creature = this.creature ?? GameState.CharGenManager?.selectedCreature as ModuleCreature;
    if(!creature) return;
    if(this.remainingSelections <= 0) return;

    const selectedItem = this.LB_POWERS?.selectedItem;
    if(!selectedItem) return;

    const group: any[] = selectedItem.node as any[];
    if(!group || !group.length) return;

    // Find the highest tier in the chain that the creature can learn next.
    let spellToLearn: TalentSpell | undefined;
    const spells = GameState.SWRuleSet.spells;
    for(let i = group.length - 1; i >= 0; i--){
      const row = group[i];
      if(!row) continue;
      const spellId = parseInt(row.__rowlabel ?? row.__index ?? '0', 10) || 0;
      const spell = spells[spellId];
      if(!spell) continue;
      // Check prerequisites
      const prereqsMet = spell.prerequisites.every((prereqId: number) => creature.getHasSpell(prereqId));
      if(!creature.getHasSpell(spellId) && prereqsMet){
        spellToLearn = spell;
        break;
      }
    }

    if(!spellToLearn) return;

    // Add to the creature's main class immediately so getHasSpell() sees it
    // in follow-up checks (e.g. selecting an upgrade in the same session).
    const mainClass = creature.getMainClass();
    if(mainClass){
      const newSpell = TalentSpell.From2DA(
        GameState.TwoDAManager.datatables.get('spells')?.rows[spellToLearn.id]
      );
      if(newSpell){
        mainClass.addSpell(newSpell);
        this.selectedPowers.push(newSpell);
        this.remainingSelections--;
        this.updateRemaining();
      }
    }
  }

  /** Update the remaining-selections label. */
  updateRemaining(){
    if(this.REMAINING_SELECTIONS_LBL){
      this.REMAINING_SELECTIONS_LBL.setText(String(this.remainingSelections));
    }
    if(this.SELECTIONS_REMAINING_LBL){
      this.SELECTIONS_REMAINING_LBL.setText(String(this.remainingSelections));
    }
  }

  /** Apply selected powers and close the menu. */
  applyAndClose(){
    // Powers are already added to the creature in selectHighlightedPower().
    this.selectedPowers = [];
    this.close();
  }

}
