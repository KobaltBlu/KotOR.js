/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenPortCust menu class.
 */

class CharGenPortCust extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'portcust',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.LBL_HEAD = this.getControlByName('LBL_HEAD');
        this.BTN_BACK = this.getControlByName('BTN_BACK');
        this.BTN_ACCEPT = this.getControlByName('BTN_ACCEPT');
        this.LBL_PORTRAIT = this.getControlByName('LBL_PORTRAIT');

        this.BTN_ARRL = this.getControlByName('BTN_ARRL');
        this.BTN_ARRR = this.getControlByName('BTN_ARRR');

        this.BTN_ARRL.addEventListener('click', (e) => {
          e.stopPropagation();
        
          let idx = CharGenClass.Classes[CharGenClass.SelectedClass].appearances.indexOf(Game.player.appearance);
          let arrayLength = CharGenClass.Classes[CharGenClass.SelectedClass].appearances.length;
          if(idx <= 0){
            Game.player.appearance = CharGenClass.Classes[CharGenClass.SelectedClass].appearances[arrayLength - 1];
          }else{
            Game.player.appearance = CharGenClass.Classes[CharGenClass.SelectedClass].appearances[--idx];
          }

          for(let i = 0; i < Global.kotor2DA.portraits.RowCount; i++){
            let port = Global.kotor2DA.portraits.rows[i];
            if(parseInt(port['appearancenumber']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }
          }

          Game.player.LoadModel( (model) => {
            this.updateCamera();
            this.UpdatePortrait();
            model.rotation.z = -Math.PI/2;
          });

        });

        this.BTN_ARRR.addEventListener('click', (e) => {
          e.stopPropagation();

          let idx = CharGenClass.Classes[CharGenClass.SelectedClass].appearances.indexOf(Game.player.appearance);
          let arrayLength = CharGenClass.Classes[CharGenClass.SelectedClass].appearances.length;
          if(idx >= arrayLength - 1){
            Game.player.appearance = CharGenClass.Classes[CharGenClass.SelectedClass].appearances[0];
          }else{
            Game.player.appearance = CharGenClass.Classes[CharGenClass.SelectedClass].appearances[++idx];
          }

          for(let i = 0; i < Global.kotor2DA.portraits.RowCount; i++){
            let port = Global.kotor2DA.portraits.rows[i];
            if(parseInt(port['appearancenumber']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == Game.player.appearance){
              Game.player.portraidId = i;
              break;
            }
          }

          Game.player.LoadModel( (model) => {
            this.updateCamera();
            this.UpdatePortrait();
            model.rotation.z = -Math.PI/2;
          });

        });

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          if(!this.exiting){
            this.exiting = true;
            //Restore previous appearance
            Game.player.appearance = this.appearance;
            Game.player.portraidId = this.portraidId;
            Game.player.LoadModel( (model) => {
              model.rotation.z = -Math.PI/2;
              this.exiting = false;
              this.Close();
            });
          }
        });

        this.BTN_ACCEPT.addEventListener('click', (e) => {
          e.stopPropagation();
          
          //Save appearance choice
          Game.player.template.GetFieldByLabel('Appearance_Type').SetValue(Game.player.appearance);
          Game.player.template.GetFieldByLabel('PortraitId').SetValue(Game.player.portraidId);
          Game.CharGenQuickPanel.step1 = true;

          this.Close();
        });

        this.tGuiPanel.widget.fill.position.z = -0.5

        this.LBL_HEAD._3dView = new LBL_3DView();
        this.LBL_HEAD._3dView.visible = true;
        this.LBL_HEAD._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
        this.LBL_HEAD._3dView.camera.updateProjectionMatrix();
        this.LBL_HEAD.widget.fill.children[0].material.map = this.LBL_HEAD._3dView.texture.texture;
        this.LBL_HEAD.widget.fill.children[0].material.transparent = false;

        Game.ModelLoader.load({
          file: 'cghead_light',
          onLoad: (mdl) => {
            this.cghead_light = mdl;
            this.Init3D();
            if(typeof this.onLoad === 'function')
              this.onLoad();
          }
        }); 

      }
    })

  }

  Init3D(){
    let control = this.LBL_HEAD;          
    THREE.AuroraModel.FromMDL(this.cghead_light, { 
      onComplete: (model) => {
        
        control._3dViewModel = model;
        control._3dView.addModel(control._3dViewModel);

        control.camerahook = control._3dViewModel.getObjectByName('camerahookm');
        
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

        //control._3dView.camera.position.z = 1;
        control._3dViewModel.playAnimation(0, true);

      },
      manageLighting: false,
      context: control._3dView
    });

    control.widget.fill.children[0].material.map = control._3dView.texture.texture;
    control.widget.fill.children[0].material.transparent = true;
    control.widget.fill.children[0].material.blending = 1;

  }

  Update(delta = 0){

    super.Update(delta);
    if(!this.bVisible)
      return;

    try{
      let modelControl = this.LBL_HEAD;
      Game.player.update(delta);
      modelControl._3dView.render(delta);
      modelControl.widget.fill.children[0].material.needsUpdate = true;
    }catch(e){
      console.error(e);
    }
  }

  
  UpdatePortrait(){
    let portraitId = Game.player.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];

    this.LBL_PORTRAIT.show();
    if(this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref){
      this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref)
      TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
        this.LBL_PORTRAIT.setFillTexture(texture);
      });
    }
  }


  Show(){
    super.Show();

    this.appearance = Game.player.appearance;
    this.portraidId = Game.player.portraidId;

    try{
      Game.player.model.parent.remove(Game.player.model);
    }catch(e){}
    this.LBL_HEAD._3dView.scene.add(Game.player.model);
    this.LBL_PORTRAIT.getFill().material.blending = 1;

    this.updateCamera();

    //this.LBL_HEAD._3dView.camera.position.z = Game.player.model.getObjectByName('camerahook').getWorldPosition().z;
    this.UpdatePortrait();

  }

  updateCamera(){
    if(Game.getCurrentPlayer().getGender() == 0){
      this.LBL_HEAD.camerahook = this.LBL_HEAD._3dViewModel.getObjectByName('camerahookm');
    }else{
      this.LBL_HEAD.camerahook = this.LBL_HEAD._3dViewModel.getObjectByName('camerahookf');
    }
    this.LBL_HEAD._3dView.camera.position.set(
      this.LBL_HEAD.camerahook.position.x,
      this.LBL_HEAD.camerahook.position.y,
      this.LBL_HEAD.camerahook.position.z
    );

    this.LBL_HEAD._3dView.camera.quaternion.set(
      this.LBL_HEAD.camerahook.quaternion.x,
      this.LBL_HEAD.camerahook.quaternion.y,
      this.LBL_HEAD.camerahook.quaternion.z,
      this.LBL_HEAD.camerahook.quaternion.w
    );
    
    this.LBL_HEAD._3dView.camera.position.z = Game.player.model.getObjectByName('camerahook').getWorldPosition().z;
  }

}

module.exports = CharGenPortCust;