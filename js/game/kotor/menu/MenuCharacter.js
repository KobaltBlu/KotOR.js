/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuCharacter menu class.
 */

class MenuCharacter extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'character',
      onLoad: () => {

        this.lbl_3dview = this.getControlByName('LBL_3DCHAR');
        this._3dViewModel = undefined;

        this.BTN_CHANGE1 = this.getControlByName('BTN_CHANGE1');
        this.BTN_CHANGE2 = this.getControlByName('BTN_CHANGE2');

        this.LBL_CLASS1 = this.getControlByName('LBL_CLASS1');
        this.LBL_CLASS2 = this.getControlByName('LBL_CLASS2');

        this.LBL_LEVEL1 = this.getControlByName('LBL_LEVEL1');
        this.LBL_LEVEL2 = this.getControlByName('LBL_LEVEL2');

        this.LBL_VITALITY_STAT = this.getControlByName('LBL_VITALITY_STAT');
        this.LBL_FORCE_STAT = this.getControlByName('LBL_FORCE_STAT');
        this.LBL_DEFENSE_STAT = this.getControlByName('LBL_DEFENSE_STAT');

        this.LBL_STR = this.getControlByName('LBL_STR');
        this.LBL_DEX = this.getControlByName('LBL_DEX');
        this.LBL_CON = this.getControlByName('LBL_CON');
        this.LBL_INT = this.getControlByName('LBL_INT');
        this.LBL_WIS = this.getControlByName('LBL_WIS');
        this.LBL_CHA = this.getControlByName('LBL_CHA');

        this.LBL_STR_MOD = this.getControlByName('LBL_STR_MOD');
        this.LBL_DEX_MOD = this.getControlByName('LBL_DEX_MOD');
        this.LBL_CON_MOD = this.getControlByName('LBL_CON_MOD');
        this.LBL_INT_MOD = this.getControlByName('LBL_INT_MOD');
        this.LBL_WIS_MOD = this.getControlByName('LBL_WIS_MOD');
        this.LBL_CHA_MOD = this.getControlByName('LBL_CHA_MOD');

        this.LBL_FORTITUDE_STAT = this.getControlByName('LBL_FORTITUDE_STAT');
        this.LBL_REFLEX = this.getControlByName('LBL_REFLEX');
        this.LBL_WILL = this.getControlByName('LBL_WILL');

        this.LBL_EXPERIENCE_STAT = this.getControlByName('LBL_EXPERIENCE_STAT');
        this.LBL_NEEDED_XP = this.getControlByName('LBL_NEEDED_XP');

        this.BTN_EXIT = this.getControlByName('BTN_EXIT');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
          //Game.InGameOverlay.Show();
        });

        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charrec_light', ResourceTypes['mdl']), (mdlBuffer) => {
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charrec_light', ResourceTypes['mdx']), (mdxBuffer) => {
            try{
    
              let model = new AuroraModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

              this.tGuiPanel.widget.children[2].children[0].position.z = -0.5;

              this._3dView = new LBL_3DView(this.lbl_3dview.extent.width, this.lbl_3dview.extent.height);
              this._3dView.setControl(this.lbl_3dview);
              this._3dView.visible = true;

              this.getControlByName('LBL_GOOD1').hide();
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
              this.getControlByName('LBL_DARK').extent.left = 10;
              
              THREE.AuroraModel.FromMDL(model, { 
                onComplete: (model) => {
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
  
                    if(typeof this.onLoad === 'function')
                      this.onLoad();

                    this._3dViewModel.playAnimation(0, true);
  
                  });

                },
                manageLighting: false,
                context: this._3dView
              });
    
            }
            catch (e) {
              console.log(e);
              this.Remove();
            }
          }, (e) => {
            throw 'Resource not found in BIF archive ';
            this.Remove();
          });
        }, (e) => {
          throw 'Resource not found in BIF archive ';
          this.Remove();
        });

      }
    })

  }

  Update(delta = 0){
    super.Update(delta);

    if(!this.bVisible)
      return;

    if(this.char)
      this.char.update(delta);

    try{
      this._3dView.render(delta);
      this.lbl_3dview.fill.children[0].material.needsUpdate = true;
    }catch(e){}
  }

  updateCharacterStats(character){

    this.LBL_CLASS1.hide();
    this.LBL_LEVEL1.hide();
    this.LBL_CLASS2.hide();
    this.LBL_LEVEL2.hide();

    if(character.classes[0]){
      this.LBL_CLASS1.setText(character.classes[0].getName());
      this.LBL_LEVEL1.setText(character.classes[0].level);
      this.LBL_CLASS1.show();
      this.LBL_LEVEL1.show();
      this.LBL_CLASS1.extent.top = 98;
      this.LBL_CLASS1.recalculate();
    }

    if(character.classes[1]){
      this.LBL_CLASS2.setText(character.classes[1].getName());
      this.LBL_LEVEL2.setText(character.classes[1].level);
      this.LBL_CLASS2.show();
      this.LBL_LEVEL2.show();
    }

    this.LBL_VITALITY_STAT.setText(character.getHP()+'/'+character.getMaxHP());
    this.LBL_FORCE_STAT.setText(character.getFP()+'/'+character.getMaxFP());
    this.LBL_DEFENSE_STAT.setText(character.getAC());

    this.LBL_STR.setText(character.getSTR());
    this.LBL_DEX.setText(character.getDEX());
    this.LBL_CON.setText(character.getCON());
    this.LBL_INT.setText(character.getINT());
    this.LBL_WIS.setText(character.getWIS());
    this.LBL_CHA.setText(character.getCHA());

    this.LBL_STR_MOD.setText(Math.floor((character.getSTR() - 10)/2));
    this.LBL_DEX_MOD.setText(Math.floor((character.getDEX() - 10)/2));
    this.LBL_CON_MOD.setText(Math.floor((character.getCON() - 10)/2));
    this.LBL_INT_MOD.setText(Math.floor((character.getINT() - 10)/2));
    this.LBL_WIS_MOD.setText(Math.floor((character.getWIS() - 10)/2));
    this.LBL_CHA_MOD.setText(Math.floor((character.getCHA() - 10)/2));

    this.LBL_EXPERIENCE_STAT.setText(character.experience.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    this.LBL_NEEDED_XP.setText(
      Global.kotor2DA.exptable.rows[
        character.getTotalClassLevel()
      ].xp.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    );

  }

  Show(){
    super.Show();

    this.RecalculatePosition()

    if(this.char){
      this._3dViewModel.children[0].children[0].remove(this.char);
    }

    this._3dView.camera.position.z = 1;

    let objectCreature = new ModuleCreature();
    let clone = PartyManager.party[0];
    objectCreature.appearance = clone.appearance;

    if(clone.equipment.ARMOR){
      objectCreature.equipment.ARMOR = new ModuleItem(clone.equipment.ARMOR.template);
    }

    if(clone.goodEvil >= 95){
      this._3dViewModel.playAnimation('good');
    }else if(clone.goodEvil >= 90){
      this._3dViewModel.playAnimation('align18');
    }else if(clone.goodEvil >= 85){
      this._3dViewModel.playAnimation('align17');
    }else if(clone.goodEvil >= 80){
      this._3dViewModel.playAnimation('align16');
    }else if(clone.goodEvil >= 75){
      this._3dViewModel.playAnimation('align15');
    }else if(clone.goodEvil >= 70){
      this._3dViewModel.playAnimation('align14');
    }else if(clone.goodEvil >= 65){
      this._3dViewModel.playAnimation('align13');
    }else if(clone.goodEvil >= 60){
      this._3dViewModel.playAnimation('align12');
    }else if(clone.goodEvil >= 55){
      this._3dViewModel.playAnimation('align11');
    }else if(clone.goodEvil >= 50){
      this._3dViewModel.playAnimation('align10');
    }else if(clone.goodEvil >= 45){
      this._3dViewModel.playAnimation('align9');
    }else if(clone.goodEvil >= 40){
      this._3dViewModel.playAnimation('align8');
    }else if(clone.goodEvil >= 35){
      this._3dViewModel.playAnimation('align7');
    }else if(clone.goodEvil >= 30){
      this._3dViewModel.playAnimation('align6');
    }else if(clone.goodEvil >= 25){
      this._3dViewModel.playAnimation('align5');
    }else if(clone.goodEvil >= 20){
      this._3dViewModel.playAnimation('align4');
    }else if(clone.goodEvil >= 15){
      this._3dViewModel.playAnimation('align3');
    }else if(clone.goodEvil >= 10){
      this._3dViewModel.playAnimation('align2');
    }else if(clone.goodEvil >= 5){
      this._3dViewModel.playAnimation('align1');
    }else if(clone.goodEvil >= 0){
      this._3dViewModel.playAnimation('evil');
    }
    
    objectCreature.LoadModel( (model) => {
      model.position.set(0, 0, 0)
      model.rotation.x = -Math.PI/2;
      model.rotation.z = Math.PI;
      model.box = new THREE.Box3().setFromObject(model);
      this.char = model;
      this._3dViewModel.children[0].children[0].add(this.char);
      TextureLoader.LoadQueue(() => {
        
        if(clone.goodEvil >= 95){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 90){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 85){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 80){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 75){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 70){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 65){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 60){
          this.char.playAnimation('good', true);
        }else if(clone.goodEvil >= 55){
          this.char.playAnimation('neutral', true);
        }else if(clone.goodEvil >= 50){
          this.char.playAnimation('neutral', true);
        }else if(clone.goodEvil >= 45){
          this.char.playAnimation('neutral', true);
        }else if(clone.goodEvil >= 40){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 35){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 30){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 25){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 20){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 15){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 10){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 5){
          this.char.playAnimation('evil', true);
        }else if(clone.goodEvil >= 0){
          this.char.playAnimation('evil', true);
        }
        
      }, (texName) => { });
    
    });

    this.updateCharacterStats(PartyManager.party[0]);

    
    Game.MenuActive = true;

    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    //Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/

    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();

    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      if(i){
        this['BTN_CHANGE'+(i)].show();
        if(this['BTN_CHANGE'+(i)].getFillTextureName() != portrait.baseresref){
          this['BTN_CHANGE'+(i)].setFillTextureName(portrait.baseresref)
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
            this['BTN_CHANGE'+(i)].setFillTexture(texture);
          });
        }
      }
    }

  }

}

module.exports = MenuCharacter;