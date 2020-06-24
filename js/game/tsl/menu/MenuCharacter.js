/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuCharacter menu class.
 */

class MenuCharacter extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = 'blackfill';

    this.LoadMenu({
      name: 'character_p',
      onLoad: () => {

        this.lbl_3dview = this.getControlByName('LBL_3DCHAR');
        this._3dViewModel = undefined;

        /*this.BTN_CHANGE1 = this.getControlByName('BTN_CHANGE1');
        this.BTN_CHANGE2 = this.getControlByName('BTN_CHANGE2');*/

        this.BTN_EXIT = this.getControlByName('BTN_EXIT');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charmain_light', ResourceTypes['mdl']), (mdlBuffer) => {
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('charmain_light', ResourceTypes['mdx']), (mdxBuffer) => {
            try{
    
              let model = new AuroraModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

              this.tGuiPanel.widget.children[2].children[0].position.z = -0.5;

              this._3dView = new LBL_3DView();
              this._3dView.visible = true;
              this._3dView.camera.aspect = this.lbl_3dview.extent.width / this.lbl_3dview.extent.height;
              this._3dView.camera.updateProjectionMatrix();
              this.lbl_3dview.widget.fill.children[0].material.map = this._3dView.texture.texture;
              this.lbl_3dview.widget.fill.children[0].material.transparent = false;

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
  
                    //AudioLoader.LoadMusic(bgMusic, (data) => {
                      //console.log('Loaded Background Music', bgMusic);
                      
                      //Game.audioEngine.SetBackgroundMusic(data);
                      if(typeof this.onLoad === 'function')
                        this.onLoad();
  
                      //setTimeout( () => {
                      //  this._3dViewModel.buildSkeleton();
                        this._3dViewModel.playAnimation(0, true);
                      //}, 1000)
                
                    /*}, () => {
                      console.error('Background Music not found', bgMusic);
                      if(typeof this.onLoad === 'function')
                        this.onLoad();
                    });*/
  
                  }, (texName) => { });

                },
                manageLighting: false,
                //context: this._3dView
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

  Update(delta){
    if(!this.bVisible)
      return;

    if(this.char)
      this.char.update(delta);

    try{
      this._3dView.render(delta);
      this.lbl_3dview.fill.children[0].material.needsUpdate = true;
    }catch(e){}
  }

  Show(){
    super.Show();

    this.RecalculatePosition()

    if(this.char){
      this._3dViewModel.children[0].children[1].remove(this.char);
    }

    this._3dView.camera.position.z = 1;

    let objectCreature = new ModuleCreature();
    let clone = PartyManager.party[0];
    objectCreature.appearance = clone.appearance;
    
    objectCreature.LoadModel( (model) => {
      model.position.set(0, 0, 0)
      model.rotation.x = -Math.PI/2;
      model.rotation.z = Math.PI;
      model.box = new THREE.Box3().setFromObject(model);
      this.char = model;
      this._3dViewModel.children[0].children[1].add(this.char);
      TextureLoader.LoadQueue(() => {
        setTimeout( () => {
          //this.char.buildSkeleton();
          this.char.playAnimation('good', true);
        }, 100);
      }, (texName) => { });
    
    });
    
    Game.MenuActive = true;

    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();

    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      if(!i){
        
        /*if(this.lbl_portrait.getFillTextureName() != portrait.baseresref){
          this.lbl_portrait.setFillTextureName(portrait.baseresref)
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
            this.lbl_portrait.setFillTexture(texture);
          });
        }*/

      }else{
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