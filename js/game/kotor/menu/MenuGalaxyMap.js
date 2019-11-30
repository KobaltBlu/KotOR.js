/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuGalaxyMap menu class.
 */

class MenuGalaxyMap extends GameMenu {

  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      loadscreen: '',
    }, this.args);

    this.background = '1600x1200map';

    this.LoadMenu({
      name: 'galaxymap',
      onLoad: () => {

        this.selectedPlanet = 0;

        this.THREED_PlanetDisplay = this.getControlByName('3D_PlanetDisplay');
        this.THREED_PlanetModel = this.getControlByName('3D_PlanetModel');
        this.LBL_Planet_Taris = this.getControlByName('LBL_Planet_Taris');
        this.LBL_Planet_Dantooine = this.getControlByName('LBL_Planet_Dantooine');
        this.LBL_Planet_Tatooine = this.getControlByName('LBL_Planet_Tatooine');
        this.LBL_Planet_Kashyyyk = this.getControlByName('LBL_Planet_Kashyyyk');
        this.LBL_Planet_Manaan = this.getControlByName('LBL_Planet_Manaan');
        this.LBL_Planet_Korriban = this.getControlByName('LBL_Planet_Korriban');
        this.LBL_Planet_UnknownWorld = this.getControlByName('LBL_Planet_UnknownWorld');
        this.LBL_Planet_EndarSpire = this.getControlByName('LBL_Planet_EndarSpire');
        this.LBL_Planet_Leviathan = this.getControlByName('LBL_Planet_Leviathan');
        this.LBL_Planet_StarForge = this.getControlByName('LBL_Planet_StarForge');

        
        this.LBL_PLANETNAME = this.getControlByName('LBL_PLANETNAME');
        this.LBL_DESC = this.getControlByName('LBL_DESC');
        this.LBL_Live01 = this.getControlByName('LBL_Live01');
        this.LBL_Live02 = this.getControlByName('LBL_Live02');
        this.LBL_Live03 = this.getControlByName('LBL_Live03');
        this.LBL_Live04 = this.getControlByName('LBL_Live04');
        this.LBL_Live05 = this.getControlByName('LBL_Live05');


        this.BTN_ACCEPT = this.getControlByName('BTN_ACCEPT');
        this.BTN_BACK = this.getControlByName('BTN_BACK');
  
        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.MenuActive = false;
          //Game.InGameOverlay.Show();
          //this.Hide();
          this.Close();
          Planetary.SetCurrentPlanet(Game.getGlobalNumber('K_CURRENT_PLANET'));
        });

        this.BTN_ACCEPT.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.MenuActive = false;
          //Game.InGameOverlay.Show();
          //this.Hide();
          this.Close();

          if(this.script instanceof NWScript){
            this.script.run(Game.player);
          }

        });

        this.script = null;

        ResourceLoader.loadResource(ResourceTypes['ncs'], 'k_sup_galaxymap', (buffer) => {
          if(buffer.length){
            this.script = new NWScript(buffer);
            this.script.name = 'k_sup_galaxymap';
          }
        }, () => {
          
        });

        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('galaxy', ResourceTypes['mdl']), (mdlBuffer) => {
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('galaxy', ResourceTypes['mdx']), (mdxBuffer) => {
            try{
    
              let model = new AuroraModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

              this.tGuiPanel.widget.fill.visible = false;

              this._3dView = new LBL_3DView();
              this._3dView.visible = true;
              this.THREED_PlanetDisplay.widget.fill.children[0].material.map = this._3dView.texture.texture;
              this.THREED_PlanetDisplay.widget.fill.children[0].material.transparent = false;
              
              
              THREE.AuroraModel.FromMDL(model, { 
                onComplete: (model) => {
                  //console.log('Model Loaded', model);
                  this._3dViewModel = model;

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
                  this._3dView.addModel(this._3dViewModel);
                  TextureLoader.LoadQueue(() => {
  
                    if(typeof this.onLoad === 'function')
                      this.onLoad();

                    //setTimeout( () => {
                      //this._3dViewModel.buildSkeleton();
                      //this._3dViewModel.playAnimation(0, true);
                    //}, 1000)
  
                  }, (texName) => { });

                },
                context: this._3dView
              });
    
            }
            catch (e) {
              console.log(e);
              this.Remove();
            }
          }, (e) => {
            throw 'Resource not found in BIF archive ';
            //this.Remove();
          });
        }, (e) => {
          throw 'Resource not found in BIF archive ';
          //this.Remove();
        });

      }
    })

  }

  Update(delta = 0){
    super.Update(delta);
    try{
      this._3dView.render(delta);
      this.THREED_PlanetDisplay.fill.children[0].material.needsUpdate = true;
    }catch(e){}
  }

  UpdateScale(){
    let controls = Game.MenuGalaxyMap.tGuiPanel.children;
    for(let i = 0; i < controls.length; i++){
      let control = controls[i];
      let plnt = Planetary.GetPlanetByGUITag(control.name);
      if(plnt){
        if(plnt == Planetary.current){
          control.widget.scale.setScalar(1.25);
        }else{
          control.widget.scale.setScalar(1);
        }
      }
    }
  }

  Show( object = null ){

    super.Show();

    Game.MenuActive = true;
    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Hide();*/

    this.selectedPlanet = Game.getGlobalNumber('K_CURRENT_PLANET');
    this.UpdateScale();
    let controls = Game.MenuGalaxyMap.tGuiPanel.children;
    for(let i = 0; i < controls.length; i++){
      let control = controls[i];
      let plnt = Planetary.GetPlanetByGUITag(control.name);
      if(plnt){
        if(plnt.enabled){
          control.show();
          control.disableBorder = true;
          control.hideBorder();
          control.addEventListener('click', (e) => {
            e.stopPropagation();
            this.LBL_PLANETNAME.setText(plnt.getName());
            this.LBL_DESC.setText(plnt.getDescription());
            Planetary.SetCurrentPlanet(plnt.getId());
            this.UpdateScale();
          });
        }else{
          control.hide();
          control.disableBorder = true;
          control.hideBorder();
          control.removeEventListener('click');
        }
      }
    }

  }

}

module.exports = MenuGalaxyMap;