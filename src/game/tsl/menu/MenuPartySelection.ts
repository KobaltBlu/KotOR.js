import { GameState } from "@/GameState";
import { LBL_3DView } from "@/gui";
import type { GUILabel, GUICheckBox, GUIButton } from "@/gui";
import { MDLLoader } from "@/loaders";
import { ModuleCreature } from "@/module/ModuleCreature";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { MenuPartySelection as K1_MenuPartySelection } from "@/game/kotor/KOTOR";

const TLK_AVAILABLE = 0x61c;

/**
 * MenuPartySelection class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * (partyselect_p): extends K1 pending-toggle flow
 * with 12 slots, charrec_light 3D preview, and nAllowCancel.
 *
 * @file MenuPartySelection.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPartySelection extends K1_MenuPartySelection {

  declare LBL_NAMEBACK: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_CHAR8: GUILabel;
  declare LBL_CHAR7: GUILabel;
  declare LBL_CHAR6: GUILabel;
  declare LBL_CHAR3: GUILabel;
  declare LBL_CHAR4: GUILabel;
  declare LBL_CHAR5: GUILabel;
  declare LBL_CHAR2: GUILabel;
  declare LBL_CHAR9: GUILabel;
  declare LBL_CHAR1: GUILabel;
  declare LBL_CHAR0: GUILabel;
  declare BTN_NPC0: GUICheckBox;
  declare BTN_NPC1: GUICheckBox;
  declare BTN_NPC2: GUICheckBox;
  declare BTN_NPC9: GUICheckBox;
  declare BTN_NPC3: GUICheckBox;
  declare BTN_NPC4: GUICheckBox;
  declare BTN_NPC5: GUICheckBox;
  declare BTN_NPC6: GUICheckBox;
  declare BTN_NPC7: GUICheckBox;
  declare BTN_NPC8: GUICheckBox;
  declare LBL_NA8: GUILabel;
  declare LBL_NA5: GUILabel;
  declare LBL_NA2: GUILabel;
  declare LBL_NA9: GUILabel;
  declare LBL_NA6: GUILabel;
  declare LBL_NA3: GUILabel;
  declare LBL_NA0: GUILabel;
  declare LBL_NA1: GUILabel;
  declare LBL_NA4: GUILabel;
  declare LBL_NA7: GUILabel;
  declare LBL_3D: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LBL_COUNT: GUILabel;
  declare LBL_BEVEL_M: GUILabel;
  declare LBL_NPC_NAME: GUILabel;
  declare LBL_NPC_LEVEL: GUILabel;
  declare LBL_BEVEL_L: GUILabel;
  declare BTN_ACCEPT: GUIButton;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_CHAR11: GUILabel;
  declare LBL_CHAR10: GUILabel;
  declare BTN_NPC11: GUICheckBox;
  declare BTN_NPC10: GUICheckBox;
  declare LBL_NA11: GUILabel;
  declare LBL_NA10: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DONE: GUIButton;

  char: ModuleCreature;
  previewNpcId: number = -1;
  LBL_3D_VIEW: any;
  charrec_light: OdysseyModel;
  previewLoadToken = 0;

  constructor(){
    super();
    this.gui_resref = 'partyselect_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.childMenu = this.manager.MenuTop;

      for(let i = 0; i < 12; i++){
        this.wireNpcButton(i);
      }

      this.BTN_DONE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDone();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onBack();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onToggleFocused();
      });

      this.LBL_3D_VIEW = new LBL_3DView(this.LBL_3D.extent.width, this.LBL_3D.extent.height);
      this.LBL_3D_VIEW.setControl(this.LBL_3D);

      MDLLoader.loader.load('charrec_light')
      .then((mdl: OdysseyModel) => {
        this.charrec_light = mdl;

        OdysseyModel3D.FromMDL(this.charrec_light, {
          context: this.LBL_3D_VIEW
        }).then((model: OdysseyModel3D) => {
          this.LBL_3D_VIEW.model = model;
          this.LBL_3D_VIEW.addModel(this.LBL_3D_VIEW.model);

          this.LBL_3D_VIEW.camerahook = this.LBL_3D_VIEW.model.getObjectByName('camerahook');

          if(this.LBL_3D_VIEW.camerahook){
            this.LBL_3D_VIEW.camera.position.copy(
              this.LBL_3D_VIEW.camerahook.position
            );
            this.LBL_3D_VIEW.camera.quaternion.copy(
              this.LBL_3D_VIEW.camerahook.quaternion
            );
          }
          this.LBL_3D_VIEW.camera.position.z = 1;

          this.LBL_3D_VIEW.camera.updateProjectionMatrix();
          this.LBL_3D_VIEW.visible = true;
          resolve();
        }).catch(() => {
          resolve();
        });
      }).catch(() => {
        resolve();
      });
    });
  }

  /**
   * Do not override forceNPC / script from show params — open already stored them.
   * Parent show handles init; we only refresh 3D for the focused NPC.
   */
  async show() {
    await super.show();
  }

  hide() {
    this.clearPreview();
    super.hide();
  }

  update(delta: number) {
    super.update(delta);
    if(!this.bVisible) return;

    if(this.char instanceof ModuleCreature){
      this.char.update(delta);
      if(this.char.model instanceof OdysseyModel3D && this.char.model.bonesInitialized){
        this.char.model.update(delta);
      }
      try {
        this.LBL_3D_VIEW.render(delta);
      }catch(e: any){}
    }
  }

  updateCount() {
    const remaining = GameState.PartyManager.MaxNPCCount - this.selectedCount;
    const available = GameState.TLKManager.GetStringById(TLK_AVAILABLE)?.Value ?? '';
    this.LBL_COUNT.setText(`${remaining} ${available}`.trim());
  }

  protected clearPreview(){
    this.previewNpcId = -1;
    if(this.char instanceof ModuleCreature){
      try {
        this.char.destroy();
      }catch(e){}
      this.char = undefined;
    }
  }

  /**
   * TSL: load creature into LBL_3D scene (charrec_light + Setup3DScene).
   */
  protected async updatePreview(npcId: number, _creature: ModuleCreature){
    if(this.previewNpcId == npcId && this.char instanceof ModuleCreature){
      this.LBL_3D.show();
      return;
    }

    const token = ++this.previewLoadToken;
    this.LBL_3D.show();

    GameState.PartyManager.LoadPartyMemberCreature(npcId, (creature: ModuleCreature) => {
      if(token != this.previewLoadToken){
        if(creature instanceof ModuleCreature){
          try { creature.destroy(); }catch(e){}
        }
        return;
      }
      if(!(creature instanceof ModuleCreature)){
        this.clearPreview();
        return;
      }
      if(this.char instanceof ModuleCreature){
        try { this.char.destroy(); }catch(e){}
      }
      this.char = creature;
      this.previewNpcId = npcId;
      creature.position.set(0, 0, 0);
      if(creature.model){
        creature.model.rotation.z = -Math.PI / 2;
        this.LBL_3D_VIEW.group.creatures.add(creature.model);
      }
    });
  }

  protected onEnterUnavailable(){
    super.onEnterUnavailable();
    this.clearPreview();
    if(this.LBL_3D) this.LBL_3D.hide();
  }

}
