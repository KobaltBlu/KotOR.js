/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuCharacter as K1_MenuCharacter, GUILabel, GUIButton, GUISlider } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { OdysseyModel3D } from "../../../three/odyssey";

/* @file
* The MenuCharacter menu class.
*/

export class MenuCharacter extends K1_MenuCharacter {

  declare LBL_BAR6: GUILabel;
  declare LBL_STATSBORDER: GUILabel;
  declare LBL_MORE_BACK: GUILabel;
  declare LBL_XP_BACK: GUILabel;
  declare LBL_3DCHAR: GUILabel;
  declare BTN_3DCHAR: GUIButton;
  declare SLD_ALIGN: GUISlider;
  declare LBL_STR: GUILabel;
  declare LBL_FORTITUDE_STAT: GUILabel;
  declare LBL_REFLEX_STAT: GUILabel;
  declare LBL_WILL_STAT: GUILabel;
  declare LBL_DEFENSE_STAT: GUILabel;
  declare LBL_FORCE_STAT: GUILabel;
  declare LBL_VITALITY_STAT: GUILabel;
  declare LBL_DEX: GUILabel;
  declare LBL_CON: GUILabel;
  declare LBL_INT: GUILabel;
  declare LBL_CHA: GUILabel;
  declare LBL_WIS: GUILabel;
  declare LBL_STR_MOD: GUILabel;
  declare LBL_DEX_MOD: GUILabel;
  declare LBL_CON_MOD: GUILabel;
  declare LBL_INT_MOD: GUILabel;
  declare LBL_WIS_MOD: GUILabel;
  declare LBL_CHA_MOD: GUILabel;
  declare LBL_EXPERIENCE_STAT: GUILabel;
  declare LBL_NEEDED_XP: GUILabel;
  declare LBL_STRENGTH: GUILabel;
  declare LBL_DEXTERITY: GUILabel;
  declare LBL_CONSTITUTION: GUILabel;
  declare LBL_INTELLIGENCE: GUILabel;
  declare LBL_CHARISMA: GUILabel;
  declare LBL_REFLEX: GUILabel;
  declare LBL_WILL: GUILabel;
  declare LBL_EXPERIENCE: GUILabel;
  declare LBL_NEXT_LEVEL: GUILabel;
  declare LBL_FORCE: GUILabel;
  declare LBL_VITALITY: GUILabel;
  declare LBL_DEFENSE: GUILabel;
  declare LBL_FORTITUDE: GUILabel;
  declare LBL_BEVEL: GUILabel;
  declare LBL_WISDOM: GUILabel;
  declare LBL_BEVEL2: GUILabel;
  declare LBL_LIGHT: GUILabel;
  declare LBL_DARK: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare BTN_AUTO: GUIButton;
  declare BTN_LEVELUP: GUIButton;
  declare LBL_FORCEMASTERY: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'character_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charmain_light', ResourceTypes['mdl']), (mdlBuffer) => {
        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charmain_light', ResourceTypes['mdx']), (mdxBuffer) => {
          try{
  
            let model = new OdysseyModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

            //this.tGuiPanel.widget.children[2].children[0].position.z = -0.5;

            this._3dView = new LBL_3DView();
            this._3dView.visible = true;
            this._3dView.camera.aspect = this.lbl_3dview.extent.width / this.lbl_3dview.extent.height;
            this._3dView.camera.updateProjectionMatrix();
            this.lbl_3dview.getFill().material.uniforms.map.value = this._3dView.texture.texture;
            this.lbl_3dview.getFill().material.transparent = false;

            /*this.getControlByName('LBL_GOOD1').hide();
            this.getControlByName('LBL_GOOD2').hide();
            this.getControlByName('LBL_GOOD3').hide();
            this.getControlByName('LBL_GOOD4').hide();
            this.getControlByName('LBL_GOOD5').hide();
            this.getControlByName('LBL_GOOD6').hide();
            this.getControlByName('LBL_GOOD7').hide();
            this.getControlByName('LBL_GOOD8').hide();
            this.getControlByName('LBL_GOOD9').hide();
            this.getControlByName('LBL_GOOD10').hide();
            this.getControlByName('LBL_MORE').hide();

            this.getControlByName('BTN_AUTO').hide();
            this.getControlByName('BTN_LEVELUP').hide();

            this.getControlByName('LBL_LIGHT').extent.left = 10;
            this.getControlByName('LBL_DARK').extent.left = 10;*/
            
            OdysseyModel3D.FromMDL(model, { 
              onComplete: (model: OdysseyModel3D) => {
                //console.log('Model Loaded', model);
                this._3dViewModel = model;
                this._3dView.addModel(this._3dViewModel);

                this.camerahook = this._3dViewModel.getObjectByName('camerahook');
                
                this._3dView.camera.position.set(
                  this.camerahook.position.x,
                  this.camerahook.position.y,
                  this.camerahook.position.z
                );
      
                this._3dView.camera.quaternion.set(
                  this.camerahook.quaternion.x,
                  this.camerahook.quaternion.y,
                  this.camerahook.quaternion.z,
                  this.camerahook.quaternion.w
                );
      
                TextureLoader.LoadQueue(() => {

                  //AudioLoader.LoadMusic(bgMusic, (data) => {
                    //console.log('Loaded Background Music', bgMusic);
                    
                    //GameState.audioEngine.SetBackgroundMusic(data);
                    resolve();

                    //setTimeout( () => {
                      this._3dViewModel.playAnimation(0, true);
                    //}, 1000)
              
                  /*}, () => {
                    console.error('Background Music not found', bgMusic);
                    if(typeof this.onLoad === 'function')
                      this.onLoad();
                  });*/

                });

              },
              manageLighting: false,
              //context: this._3dView
            });
  
          }
          catch (e) {
            console.log(e);
            this.Remove();
          }
        }, (e: any) => {
          throw 'Resource not found in BIF archive ';
          this.Remove();
        });
      }, (e: any) => {
        throw 'Resource not found in BIF archive ';
        this.Remove();
      });
    });
  }

  Update(delta) {
    if (!this.bVisible)
      return;
    if (this.char)
      this.char.update(delta);
    try {
      this._3dView.render(delta);
      this.lbl_3dview.fill.children[0].material.needsUpdate = true;
    } catch (e: any) {
    }
  }

  Show() {
    super.Show();
    this.RecalculatePosition();
    if (this.char) {
      this._3dViewModel.children[0].children[1].remove(this.char);
    }
    this._3dView.camera.position.z = 1;
    let objectCreature = new ModuleCreature();
    let clone = PartyManager.party[0];
    objectCreature.appearance = clone.appearance;
    objectCreature.LoadModel(model => {
      model.position.set(0, 0, 0);
      model.rotation.x = -Math.PI / 2;
      model.rotation.z = Math.PI;
      model.box = new THREE.Box3().setFromObject(model);
      this.char = model;
      this._3dViewModel.children[0].children[1].add(this.char);
      TextureLoader.LoadQueue(() => {
        setTimeout(() => {
          this.char.playAnimation('good', true);
        }, 100);
      }, texName => {
      });
    });
    GameState.MenuActive = true;
    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();
    for (let i = 0; i < PartyManager.party.length; i++) {
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];
      if (!i) {
      } else {
        this['BTN_CHANGE' + i].show();
        if (this['BTN_CHANGE' + i].getFillTextureName() != portrait.baseresref) {
          this['BTN_CHANGE' + i].setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
            this['BTN_CHANGE' + i].setFillTexture(texture);
          });
        }
      }
    }
  }
  
}
