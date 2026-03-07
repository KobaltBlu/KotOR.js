import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";
import { ModuleObjectScript } from "../../../enums/module/ModuleObjectScript";

/**
 * MenuCamp class.
 *
 * The camp/rest menu that appears when the player chooses to rest.
 * Restores all party members to full HP and Force Points.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuCamp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCamp extends GameMenu {

  declare BTN_REST: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LBL_HINT: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'camp';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_REST?.addEventListener('click', (e) => {
        e.stopPropagation();
        MenuCamp.doRest();
        this.close();
      });
      if(this.BTN_REST) this._button_a = this.BTN_REST;

      this.BTN_CANCEL?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      if(this.BTN_CANCEL) this._button_b = this.BTN_CANCEL;

      resolve();
    });
  }

  /**
   * Restore all party members to full HP and Force Points.
   * Runs the module's OnPlayerRest script and triggers a save.
   */
  static doRest(){
    const party = GameState.PartyManager.party;
    for(let i = 0; i < party.length; i++){
      const member = party[i];
      member.setHP(member.getMaxHP());
      member.setFP(member.getMaxFP());
      // Clear any dying/dead state
      if(member.isDead()){
        member.setHP(1);
      }
    }

    // Fire the module's OnPlayerRest script if present
    if(GameState.module?.scripts){
      const restScript = GameState.module.scripts[ModuleObjectScript.ModuleOnPlayerRest];
      if(restScript){
        const instance = restScript.newInstance?.();
        if(instance) instance.run(GameState.PartyManager.party[0], 0);
      }
    }

    // Auto-save after resting
    if(GameState.module){
      GameState.module.save().catch((e: unknown) => console.error('MenuCamp auto-save error', e));
    }
  }

  /**
   * Returns true when the current area allows camping.
   * In KOTOR, areas without the "no-escape" flag allow camping.
   */
  static canRest(): boolean {
    // If in combat or area explicitly forbids resting, deny
    if(GameState.PartyManager.party.some(m => m.combatData?.combatState)){
      return false;
    }
    // Default: allow rest (area-specific restrictions can be added later)
    return true;
  }

}
