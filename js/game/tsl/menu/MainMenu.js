/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MainMenu menu class.
 */

class MainMenu extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'mainmenu8x6_p',
      onLoad: () => {

        Game.MainMenu.getControlByName('LB_MODULES').hide();
        //Game.MainMenu.getControlByName('LBL_BW').hide();
        //Game.MainMenu.getControlByName('LBL_LUCAS').hide();
        Game.MainMenu.getControlByName('LBL_NEWCONTENT').hide();
        Game.MainMenu.getControlByName('BTN_WARP').hide();

        this.lbl_3dview = Game.MainMenu.getControlByName('LBL_3DVIEW');

        this.btn_newgame = Game.MainMenu.getControlByName('BTN_NEWGAME');
        this.btn_loadgame = Game.MainMenu.getControlByName('BTN_LOADGAME');
        this.btn_movies = Game.MainMenu.getControlByName('BTN_MOVIES');
        this.btn_options = Game.MainMenu.getControlByName('BTN_OPTIONS');
        this.btn_exit = Game.MainMenu.getControlByName('BTN_EXIT');

        this.btn_newgame.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.LoadModule('end_m01aa', null, () => { console.log('ready to load'); })
          Game.LoadScreen.setLoadBackground('load_chargen' ,() => {
            Game.LoadScreen.Show();
            Game.CharGenClass.Init( () => {
              Game.LoadScreen.Hide();
              Game.CharGenClass.Show();
            });
          });
        });

        this.btn_loadgame.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuSaveLoad.Show();
        });

        this.btn_movies.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
        });

        this.btn_options.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Hide();
          Game.MainOptions.Show();
        });

        this.btn_exit.addEventListener('click', (e) => {
          e.stopPropagation();
          window.close();
        });

        let bgMusic = 'mus_sion';            
      
        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('mainmenu01', ResourceTypes['mdl']), (mdlBuffer) => {
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('mainmenu01', ResourceTypes['mdx']), (mdxBuffer) => {
            try{
    
              let model = new AuroraModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

              this.tGuiPanel.widget.fill.visible = false;

              this._3dView = new LBL_3DView();
              this._3dView.visible = true;
              this.lbl_3dview.widget.fill.children[0].material.map = this._3dView.texture.texture;
              this.lbl_3dview.widget.fill.children[0].material.transparent = false;
              
              
              THREE.AuroraModel.FromMDL(model, { 
                onComplete: (model) => {
                  console.log('Model Loaded', model);
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
  
                    AudioLoader.LoadMusic(bgMusic, (data) => {
                      console.log('Loaded Background Music', bgMusic);
                      
                      Game.audioEngine.SetBackgroundMusic(data);
                      if(typeof this.onLoad === 'function')
                        this.onLoad();
  
                      //this._3dViewModel.buildSkeleton();
                      this._3dViewModel.playAnimation(0, true);
                
                    }, () => {
                      console.error('Background Music not found', bgMusic);
                      if(typeof this.onLoad === 'function')
                        this.onLoad();
                    });
  
                  }, (texName) => { });

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
        if(typeof this.onLoad === 'function')
          this.onLoad();
      }
    })

  }

  Update(delta = 0){
    try{
      this._3dView.render(delta);
      this.lbl_3dview.fill.children[0].material.needsUpdate = true;
    }catch(e){}
  }

  Show(){
    super.Show();

    Game.MainOptions.Hide();
    //Game.MainMovies.Hide();

    Game.AlphaTest = 0.5;

  }

}

module.exports = MainMenu;