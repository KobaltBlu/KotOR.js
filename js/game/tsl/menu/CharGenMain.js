/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenMain menu class.
 */

class CharGenMain extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.state = CharGenMain.STATES.NONE;

    this.LoadMenu({
      name: 'maincg_p',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        //Hidden Elements
        /*this.LBL_LEVEL = this.getControlByName('LBL_LEVEL');
        this.LBL_LEVEL_VAL = this.getControlByName('LBL_LEVEL_VAL');
        this.OLD_LBL = this.getControlByName('OLD_LBL');
        this.NEW_LBL = this.getControlByName('NEW_LBL');

        this.LBL_LEVEL.hide();
        this.LBL_LEVEL_VAL.hide();
        this.OLD_LBL.hide();
        this.NEW_LBL.hide();*/


        //Visible Elements

        this.LBL_NAME = this.getControlByName('LBL_NAME');
        this.PORTRAIT_LBL = this.getControlByName('PORTRAIT_LBL');
        this.MODEL_LBL = this.getControlByName('MODEL_LBL');

        this.tGuiPanel.widget.fill.children[0].position.z = -0.5;

        this.MODEL_LBL._3dView = new LBL_3DView();
        this.MODEL_LBL._3dView.visible = true;
        this.MODEL_LBL._3dView.camera.aspect = this.MODEL_LBL.extent.width / this.MODEL_LBL.extent.height;
        this.MODEL_LBL._3dView.camera.updateProjectionMatrix();
        this.MODEL_LBL.widget.fill.children[0].material.map = this.MODEL_LBL._3dView.texture.texture;
        this.MODEL_LBL.widget.fill.children[0].material.transparent = false;

        Game.ModelLoader.load({
          file: 'cgbody_light',
          onLoad: (mdl) => {
            this.cgbody_light = mdl;
            this.Init3D();
            if(typeof this.onLoad === 'function')
              this.onLoad();
          }
        });  

      }
    })

  }

  Init3D(){
    let control = this.MODEL_LBL;  

    //console.log('3D Texture', control._3dView.texture.texture);
    
    THREE.AuroraModel.FromMDL(this.cgbody_light, { 
      onComplete: (model) => {
        //console.log('Model Loaded', model);
        control._3dViewModel = model;
        control._3dView.addModel(control._3dViewModel);

        control.camerahook = control._3dViewModel.getObjectByName('camerahook');
        
        control._3dView.camera.position.set(
          control.camerahook.position.x,
          control.camerahook.position.y,
          control.camerahook.position.z
        );

        control._3dView.camera.quaternion.set(
          control.camerahook.quaternion.x,
          control.camerahook.quaternion.y,
          control.camerahook.quaternion.z,
          control.camerahook.quaternion.w
        );

        control._3dView.camera.position.z = 1;

        //control._3dViewModel.buildSkeleton();
        control._3dViewModel.playAnimation(0, true);

      },
      manageLighting: false,
      context: control._3dView
    });
  }

  Update(delta = 0){

    super.Update(delta);
      if(!this.bVisible)
        return;

    try{
      
      let modelControl = this.MODEL_LBL;
      Game.player.update(delta);
      modelControl._3dView.render(delta);
      modelControl.widget.fill.children[0].material.needsUpdate = true;
      
    }catch(e){
      console.error(e);
    }
  }

  Hide(){
    super.Hide();
    /*let panelQuickorCustom = Game.CharGenQuickOrCustom.tGuiPanel.getControl();
    Game.scene_gui.remove(panelQuickorCustom);

    let panelQuick = Game.CharGenQuickPanel.tGuiPanel.getControl();
    Game.scene_gui.remove(panelQuick);

    let panelCustom = Game.CharGenCustomPanel.tGuiPanel.getControl();
    Game.scene_gui.remove(panelCustom);*/
  }

  Show(){
    super.Show();

    Game.MenuActive = true;
    
    try{
      Game.player.model.parent.remove(Game.player.model);
    }catch(e){}
    this.MODEL_LBL._3dView.scene.add(Game.player.model);

    let portraitId = Game.player.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];

    this.PORTRAIT_LBL.show();
    if(this.PORTRAIT_LBL.getFillTextureName() != portrait.baseresref){
      this.PORTRAIT_LBL.setFillTextureName(portrait.baseresref)
      TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
        this.PORTRAIT_LBL.setFillTexture(texture);
      });
    }

  }

}

CharGenMain.STATES = {
  NONE: 0,
  CUSTOM: 1,
  QUICK: 2
}

module.exports = CharGenMain;