import { GameState } from "../../../GameState";
import { GameMenu, LBL_3DView } from "../../../gui";
import type { GUILabel, GUIButton, GUISlider, GUIControl } from "../../../gui";
import { MDLLoader, TextureLoader } from "../../../loaders";
import type { ModuleCreature, ModuleItem } from "../../../module";
import { OdysseyModel3D } from "../../../three/odyssey";
import * as THREE from "three";
import { OdysseyModel } from "../../../odyssey";

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
          GameState.getCurrentPlayer().autoLevelUp();
          this.updateCharacterStats(GameState.getCurrentPlayer());
        }
      });
      this._button_y = this.BTN_AUTO;

      MDLLoader.loader.load('charrec_light').then((mdl: OdysseyModel) => {
          
        //this.tGuiPanel.widget.children[2].children[0].position.z = -0.5;
        this._3dView = new LBL_3DView(this.LBL_3DCHAR.extent.width, this.LBL_3DCHAR.extent.height);
        this._3dView.setControl(this.LBL_3DCHAR);
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
          
          this._3dView.camera.position.copy(
            model.camerahook.position
          );

          this._3dView.camera.quaternion.copy(
            model.camerahook.quaternion
          );

          TextureLoader.LoadQueue(() => {
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
    this.LBL_NEEDED_XP?.setText(GameState.TwoDAManager.datatables.get('exptable').rows[character.getTotalClassLevel()].xp.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    if (character.canLevelUp()) {
      this.BTN_AUTO?.show();
    } else {
      this.BTN_AUTO?.hide();
    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_CHA.onHoverIn();
    this.recalculatePosition();
    this.SLD_ALIGN?.setValue(0.5);
    this.updateCharacterPortrait(GameState.PartyManager.party[0]);
    this.updateCharacterStats(GameState.PartyManager.party[0]);
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    let btn_change: GUIControl;
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(btn_change){
        let partyMember = GameState.PartyManager.party[i];
        let portraitId = partyMember.getPortraitId();
        let portrait = GameState.TwoDAManager.datatables.get('portraits').rows[portraitId];
        if (i) {
          btn_change.show();
          if (btn_change.getFillTextureName() != portrait.baseresref) {
            btn_change.setFillTextureName(portrait.baseresref);
          }
        }
      }
    }
  }

  updateCharacterPortrait( creature: ModuleCreature ){
    if(!creature) return;

    this.SLD_ALIGN?.setValue(creature.getGoodEvil()/100);

    if (this.char) {
      this._3dViewModel.children[0].children[0].remove(this.char);
    }
    if(creature){
      this._3dView.camera.position.z = 1;
      let objectCreature = new GameState.Module.ModuleArea.ModuleCreature();
      let clone = creature;
      objectCreature.appearance = clone.appearance;
      objectCreature.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(objectCreature.appearance);
      if (clone.equipment.ARMOR) {
        objectCreature.equipment.ARMOR = new GameState.Module.ModuleArea.ModuleItem(clone.equipment.ARMOR.template);
      }
      if (clone.goodEvil >= 95) {
        this._3dViewModel.playAnimation('good');
      } else if (clone.goodEvil >= 90) {
        this._3dViewModel.playAnimation('align18');
      } else if (clone.goodEvil >= 85) {
        this._3dViewModel.playAnimation('align17');
      } else if (clone.goodEvil >= 80) {
        this._3dViewModel.playAnimation('align16');
      } else if (clone.goodEvil >= 75) {
        this._3dViewModel.playAnimation('align15');
      } else if (clone.goodEvil >= 70) {
        this._3dViewModel.playAnimation('align14');
      } else if (clone.goodEvil >= 65) {
        this._3dViewModel.playAnimation('align13');
      } else if (clone.goodEvil >= 60) {
        this._3dViewModel.playAnimation('align12');
      } else if (clone.goodEvil >= 55) {
        this._3dViewModel.playAnimation('align11');
      } else if (clone.goodEvil >= 50) {
        this._3dViewModel.playAnimation('align10');
      } else if (clone.goodEvil >= 45) {
        this._3dViewModel.playAnimation('align9');
      } else if (clone.goodEvil >= 40) {
        this._3dViewModel.playAnimation('align8');
      } else if (clone.goodEvil >= 35) {
        this._3dViewModel.playAnimation('align7');
      } else if (clone.goodEvil >= 30) {
        this._3dViewModel.playAnimation('align6');
      } else if (clone.goodEvil >= 25) {
        this._3dViewModel.playAnimation('align5');
      } else if (clone.goodEvil >= 20) {
        this._3dViewModel.playAnimation('align4');
      } else if (clone.goodEvil >= 15) {
        this._3dViewModel.playAnimation('align3');
      } else if (clone.goodEvil >= 10) {
        this._3dViewModel.playAnimation('align2');
      } else if (clone.goodEvil >= 5) {
        this._3dViewModel.playAnimation('align1');
      } else if (clone.goodEvil >= 0) {
        this._3dViewModel.playAnimation('evil');
      }
      objectCreature.loadModel().then( (model: OdysseyModel3D) => {
        model.position.set(0, 0, 0);
        model.rotation.x = -Math.PI / 2;
        model.rotation.z = Math.PI;
        model.box = new THREE.Box3().setFromObject(model);
        this.char = model;
        this._3dViewModel.children[0].children[0].add(this.char);
        TextureLoader.LoadQueue(() => {
          if (clone.goodEvil >= 95) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 90) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 85) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 80) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 75) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 70) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 65) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 60) {
            this.char.playAnimation('good', true);
          } else if (clone.goodEvil >= 55) {
            this.char.playAnimation('neutral', true);
          } else if (clone.goodEvil >= 50) {
            this.char.playAnimation('neutral', true);
          } else if (clone.goodEvil >= 45) {
            this.char.playAnimation('neutral', true);
          } else if (clone.goodEvil >= 40) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 35) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 30) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 25) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 20) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 15) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 10) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 5) {
            this.char.playAnimation('evil', true);
          } else if (clone.goodEvil >= 0) {
            this.char.playAnimation('evil', true);
          }
        });
      });
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_INV.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_ABI.click();
  }
  
}
