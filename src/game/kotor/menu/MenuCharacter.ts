import { GameState } from "@/GameState";
import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel, GUIButton, GUISlider, GUIControl } from "@/gui";
import { MDLLoader, TextureLoader } from "@/loaders";
import type { ModuleCreature, ModuleItem } from "@/module";
import { OdysseyModel3D } from "@/three/odyssey";
import * as THREE from "three";
import { OdysseyModel } from "@/odyssey";

/**
 * MenuCharacter class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuCharacter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCharacter extends GameMenu {

  LBL_3DCHAR: GUILabel;
  BTN_3DCHAR: GUIButton;
  LBL_ADORN: GUILabel;
  SLD_ALIGN: GUISlider;
  LBL_STR: GUILabel;
  LBL_FORTITUDE_STAT: GUILabel;
  LBL_REFLEX_STAT: GUILabel;
  LBL_WILL_STAT: GUILabel;
  LBL_DEFENSE_STAT: GUILabel;
  LBL_FORCE_STAT: GUILabel;
  LBL_VITALITY_STAT: GUILabel;
  LBL_DEX: GUILabel;
  LBL_CON: GUILabel;
  LBL_INT: GUILabel;
  LBL_CHA: GUILabel;
  LBL_WIS: GUILabel;
  LBL_STR_MOD: GUILabel;
  LBL_DEX_MOD: GUILabel;
  LBL_CON_MOD: GUILabel;
  LBL_INT_MOD: GUILabel;
  LBL_WIS_MOD: GUILabel;
  LBL_CHA_MOD: GUILabel;
  LBL_CLASS1: GUILabel;
  LBL_EXPERIENCE_STAT: GUILabel;
  LBL_NAME: GUILabel;
  LBL_NEEDED_XP: GUILabel;
  LBL_STRENGTH: GUILabel;
  LBL_DEXTERITY: GUILabel;
  LBL_CONSTITUTION: GUILabel;
  LBL_INTELLIGENCE: GUILabel;
  LBL_CHARISMA: GUILabel;
  LBL_REFLEX: GUILabel;
  LBL_WILL: GUILabel;
  LBL_EXPERIENCE: GUILabel;
  LBL_NEXT_LEVEL: GUILabel;
  LBL_FORCE: GUILabel;
  LBL_VITALITY: GUILabel;
  LBL_DEFENSE: GUILabel;
  LBL_FORTITUDE: GUILabel;
  LBL_BEVEL: GUILabel;
  LBL_CLASS2: GUILabel;
  LBL_WISDOM: GUILabel;
  LBL_CLASS: GUILabel;
  LBL_LEVEL: GUILabel;
  LBL_LEVEL1: GUILabel;
  LBL_LEVEL2: GUILabel;
  LBL_GOOD1: GUIButton;
  LBL_GOOD2: GUIButton;
  LBL_GOOD3: GUIButton;
  LBL_GOOD4: GUIButton;
  LBL_GOOD5: GUIButton;
  LBL_GOOD6: GUIButton;
  LBL_GOOD7: GUIButton;
  LBL_GOOD8: GUIButton;
  LBL_GOOD9: GUIButton;
  LBL_GOOD10: GUIButton;
  LBL_BEVEL2: GUILabel;
  LBL_MORE: GUILabel;
  LBL_LIGHT: GUILabel;
  LBL_DARK: GUILabel;
  BTN_EXIT: GUIButton;
  BTN_SCRIPTS: GUIButton;
  BTN_AUTO: GUIButton;
  BTN_LEVELUP: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;
  _3dViewModel: OdysseyModel3D;
  _3dView: LBL_3DView;
  char: OdysseyModel3D;
  /** Invalidate overlapping async portrait loads (prevents duplicate meshes). */
  portraitGen: number = 0;
  /** Yaw applied by BTN_3DCHAR rotate (retail RotateCharacter ±10°). */
  portraitYaw: number = 0;

  constructor(){
    super();
    this.gui_resref = 'character';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.SLD_ALIGN.setVertical();
      this.SLD_ALIGN.disableSelection = true;

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.BTN_AUTO.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.getCurrentPlayer().canLevelUp()){
          GameState.LevelUpManager.autoLevelUp(GameState.getCurrentPlayer());
          this.updateCharacterStats(GameState.getCurrentPlayer());
        }
      });
      this._button_y = this.BTN_AUTO;

      this.BTN_LEVELUP?.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.LevelUpManager?.showLevelUpGUI?.(GameState.getCurrentPlayer());
      });
      this._button_x = this.BTN_LEVELUP;

      // retail HandleInputEvent 0x29 → ScriptSelect.
      this.BTN_SCRIPTS?.addEventListener('click', (e) => {
        e.stopPropagation();
        const creature = GameState.PartyManager?.party?.[0];
        if(!creature) return;
        GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
        this.manager.MenuScriptSelect?.openForCreature?.(creature);
      });

      this.BTN_CHANGE1?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (GameState.PartyManager.party.length > 1) {
          GameState.PartyManager.SwitchLeaderAtIndex(1);
          this.updateCharacterPortrait(GameState.PartyManager.party[0]);
          this.updateCharacterStats(GameState.PartyManager.party[0]);
          this.updatePartyMemberPortraitButtons();
        }
      });
      this.BTN_CHANGE2?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (GameState.PartyManager.party.length > 2) {
          GameState.PartyManager.SwitchLeaderAtIndex(2);
          this.updateCharacterPortrait(GameState.PartyManager.party[0]);
          this.updateCharacterStats(GameState.PartyManager.party[0]);
          this.updatePartyMemberPortraitButtons();
        }
      });

      // Retail RotateCharacterLeft/Right — ±10° yaw while held.
      // Approximate with click nudges until hold-axis input is wired.
      this.BTN_3DCHAR?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotatePortrait(10);
      });

      GameState.PartyManager.AddEventListener('change', () => {
        if (!this.bVisible) return;
        this.updateCharacterPortrait(GameState.PartyManager.party[0]);
        this.updateCharacterStats(GameState.PartyManager.party[0]);
        this.updatePartyMemberPortraitButtons();
      });

      MDLLoader.loader.load('charrec_light').then((mdl: OdysseyModel) => {

        this._3dView = new LBL_3DView(this.LBL_3DCHAR.extent.width, this.LBL_3DCHAR.extent.height);
        this._3dView.setControl(this.LBL_3DCHAR);
        this._3dView.setViewAngle();
        this._3dView.visible = true;

        this.LBL_GOOD1?.hide();
        this.LBL_GOOD2?.hide();
        this.LBL_GOOD3?.hide();
        this.LBL_GOOD4?.hide();
        this.LBL_GOOD5?.hide();
        this.LBL_GOOD6?.hide();
        this.LBL_GOOD7?.hide();
        this.LBL_GOOD8?.hide();
        this.LBL_GOOD9?.hide();
        this.LBL_GOOD10?.hide();
        this.LBL_MORE?.hide();

        this.BTN_AUTO?.hide();
        this.BTN_LEVELUP?.hide();

        OdysseyModel3D.FromMDL(mdl, {
          // manageLighting: false,
          context: this._3dView
        }).then((model: OdysseyModel3D) => {
          //console.log('Model Loaded', model);
          this._3dViewModel = model;
          this._3dView.addModel(this._3dViewModel);
          this.attachPortraitCamera();

          TextureLoader.LoadQueue().then(() => {
            this.LBL_3DCHAR.setFillTexture(this.LBL_3DCHAR.getFillTexture());
            this._3dViewModel.playAnimation(0, true);
            resolve();
          });

        }).catch((e: any) => {
          resolve();
        });
      }).catch((e: any) => {
        resolve();
      });
    });
  }

  /**
   * Retail AttachModel — camerahook + world Z = getCameraHeight().
   */
  attachPortraitCamera(creature?: ModuleCreature) {
    if(!this._3dView || !this._3dViewModel?.camerahook) return;
    const headHeight = creature?.getCameraHeight?.() ?? 1.5;
    this._3dView.attachCameraToHook(
      this._3dViewModel.camerahook,
      { x: 0, y: 0, z: headHeight },
      true,
    );
  }

  /** Retail RotateCharacter — yaw degrees about upright axis. */
  rotatePortrait(yawDeg: number) {
    if(!this.char) return;
    this.portraitYaw += (yawDeg * Math.PI) / 180;
    this.char.rotation.z = -Math.PI / 2 + this.portraitYaw;
  }

  clearPortraitChar() {
    this.portraitGen++;
    if(this.char){
      try{ this.char.removeFromParent(); }catch(e){}
      try{ this.char.dispose?.(); }catch(e){}
      this.char = undefined;
    }
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
    if (this.char)
      this.char.update(delta);
    try {
      this._3dView.render(delta);
    } catch (e: any) {
    }
  }

  updateCharacterStats(character: ModuleCreature) {
    if(!character) return;
    this.LBL_CLASS1?.hide();
    this.LBL_LEVEL1?.hide();
    this.LBL_CLASS2?.hide();
    this.LBL_LEVEL2?.hide();
    if (character.classes[0]) {
      this.LBL_LEVEL1?.setText(character.classes[0].level);
      this.LBL_LEVEL1?.show();
      if(this.LBL_CLASS1){
        this.LBL_CLASS1.setText(character.classes[0].getName());
        this.LBL_CLASS1.show();
        this.LBL_CLASS1.extent.top = 98;
        this.LBL_CLASS1.recalculate();
      }
    }
    if (character.classes[1]) {
      this.LBL_CLASS2?.setText(character.classes[1].getName());
      this.LBL_LEVEL2?.setText(character.classes[1].level);
      this.LBL_CLASS2?.show();
      this.LBL_LEVEL2?.show();
    }
    this.LBL_VITALITY_STAT?.setText(character.getHP() + '/' + character.getMaxHP());
    this.LBL_FORCE_STAT?.setText(character.getFP() + '/' + character.getMaxFP());
    this.LBL_DEFENSE_STAT?.setText(character.getAC());
    this.LBL_STR?.setText(character.getSTR());
    this.LBL_DEX?.setText(character.getDEX());
    this.LBL_CON?.setText(character.getCON());
    this.LBL_INT?.setText(character.getINT());
    this.LBL_WIS?.setText(character.getWIS());
    this.LBL_CHA?.setText(character.getCHA());
    this.LBL_STR_MOD?.setText(Math.floor((character.getSTR() - 10) / 2));
    this.LBL_DEX_MOD?.setText(Math.floor((character.getDEX() - 10) / 2));
    this.LBL_CON_MOD?.setText(Math.floor((character.getCON() - 10) / 2));
    this.LBL_INT_MOD?.setText(Math.floor((character.getINT() - 10) / 2));
    this.LBL_WIS_MOD?.setText(Math.floor((character.getWIS() - 10) / 2));
    this.LBL_CHA_MOD?.setText(Math.floor((character.getCHA() - 10) / 2));
    this.LBL_EXPERIENCE_STAT?.setText(character.experience.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    const neededXp = GameState.SWRuleSet?.expTable?.expList?.[character.getTotalClassLevel()];
    this.LBL_NEEDED_XP?.setText(
      (neededXp != null ? String(neededXp) : '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    );
    if (character.canLevelUp()) {
      this.BTN_AUTO?.show();
      this.BTN_LEVELUP?.show();
    } else {
      this.BTN_AUTO?.hide();
      this.BTN_LEVELUP?.hide();
    }
  }

  /**
   * Refresh the party member portrait buttons (BTN_CHANGE1, BTN_CHANGE2) to match current party order.
   */
  updatePartyMemberPortraitButtons() {
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    let btn_change: GUIControl;
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      if (btn_change) {
        const partyMember = GameState.PartyManager.party[i];
        const portraitResRef = partyMember.getPortraitResRef();
        if (i) {
          btn_change.show();
          if (btn_change.getFillTextureName() != portraitResRef) {
            btn_change.setFillTextureName(portraitResRef);
          }
        }
      }
    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_CHA.onHoverIn();
    this.recalculatePosition();
    this.portraitYaw = 0;
    this.updateCharacterPortrait(GameState.PartyManager.party[0]);
    this.updateCharacterStats(GameState.PartyManager.party[0]);
    this.updatePartyMemberPortraitButtons();
  }

  hide() {
    if(this.manager?.MenuScriptSelect?.isVisible?.()){
      this.manager.MenuScriptSelect.close();
    }
    this.clearPortraitChar();
    super.hide();
  }

  /**
   * Retail SetStats 3D path — copy appearance onto a dedicated
   * client creature, identity pose + Setup3DScene (never the live party model).
   */
  updateCharacterPortrait( creature: ModuleCreature ){
    if(!creature || !this._3dView) return;

    // Retail SetCurValue(sld_align, 100 - goodEvil)
    const goodEvil = creature.getGoodEvil?.() ?? creature.goodEvil | 0;
    this.SLD_ALIGN?.setValue((100 - goodEvil) / 100);

    this.clearPortraitChar();
    const gen = this.portraitGen;
    this.attachPortraitCamera(creature);
    this.playCharRecAlignmentAnim(goodEvil);

    const objectCreature = new GameState.Module.ModuleArea.ModuleCreature();
    objectCreature.setAppearance(creature.appearance);
    objectCreature.goodEvil = goodEvil;
    if (creature.equipment?.ARMOR) {
      objectCreature.equipment.ARMOR = new GameState.Module.ModuleArea.ModuleItem(creature.equipment.ARMOR.template);
    }

    void objectCreature.loadModel().then( (model: OdysseyModel3D) => {
      if(gen !== this.portraitGen || !this.bVisible){
        try{ model?.dispose?.(); }catch(e){}
        return;
      }
      model.position.set(0, 0, 0);
      // Facing offset for charrec_light camerahook space (+ optional BTN_3DCHAR yaw)
      model.rotation.set(0, 0, -Math.PI / 2 + this.portraitYaw);
      model.box = new THREE.Box3().setFromObject(model);
      this.char = model;
      const portraitAttachRoot = this._3dViewModel?.getRootOdysseyNode?.() || this._3dViewModel;
      portraitAttachRoot?.add(this.char);
      void TextureLoader.LoadQueue().then(() => {
        if(gen !== this.portraitGen || !this.char) return;
        this.char.playAnimation(this.getPortraitIdleAnim(goodEvil), true);
      });
    });
  }

  /** Retail Setup3DScene light-room anim from alignment. */
  playCharRecAlignmentAnim(goodEvil: number) {
    if(!this._3dViewModel) return;
    let anim = 'align10';
    if (goodEvil >= 95) anim = 'good';
    else if (goodEvil >= 90) anim = 'align18';
    else if (goodEvil >= 85) anim = 'align17';
    else if (goodEvil >= 80) anim = 'align16';
    else if (goodEvil >= 75) anim = 'align15';
    else if (goodEvil >= 70) anim = 'align14';
    else if (goodEvil >= 65) anim = 'align13';
    else if (goodEvil >= 60) anim = 'align12';
    else if (goodEvil >= 55) anim = 'align11';
    else if (goodEvil >= 50) anim = 'align10';
    else if (goodEvil >= 45) anim = 'align9';
    else if (goodEvil >= 40) anim = 'align8';
    else if (goodEvil >= 35) anim = 'align7';
    else if (goodEvil >= 30) anim = 'align6';
    else if (goodEvil >= 25) anim = 'align5';
    else if (goodEvil >= 20) anim = 'align4';
    else if (goodEvil >= 15) anim = 'align3';
    else if (goodEvil >= 10) anim = 'align2';
    else if (goodEvil >= 5) anim = 'align1';
    else anim = 'evil';
    this._3dViewModel.playAnimation(anim);
  }

  /** Retail Setup3DScene creature idle: good / neutral / evil thresholds. */
  getPortraitIdleAnim(goodEvil: number): string {
    if (goodEvil >= 60) return 'good';
    if (goodEvil >= 40) return 'neutral';
    return 'evil';
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_INV.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_ABI.click();
  }

}
