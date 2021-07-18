/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MainMenu menu class.
 */

class MainMenu extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'mainmenu16x12',
      onLoad: () => {

        Game.MainMenu.getControlByName('LB_MODULES').hide();
        Game.MainMenu.getControlByName('LBL_BW').hide();
        Game.MainMenu.getControlByName('LBL_LUCAS').hide();
        Game.MainMenu.getControlByName('LBL_NEWCONTENT').hide();
        Game.MainMenu.getControlByName('BTN_WARP').hide();

        this.lbl_3dview = Game.MainMenu.getControlByName('LBL_3DVIEW');

        this.btn_newgame = Game.MainMenu.getControlByName('BTN_NEWGAME');
        this.btn_loadgame = Game.MainMenu.getControlByName('BTN_LOADGAME');
        this.btn_movies = Game.MainMenu.getControlByName('BTN_MOVIES');
        this.btn_options = Game.MainMenu.getControlByName('BTN_OPTIONS');
        this.btn_exit = Game.MainMenu.getControlByName('BTN_EXIT');

        //this.btn_newgame.hideBorder();
        //this.btn_loadgame.hideBorder();
        //this.btn_movies.hideBorder();
        //this.btn_options.hideBorder();
        //this.btn_exit.hideBorder();

        this.btn_newgame.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.LoadModule('end_m01aa', null, () => { console.log('ready to load'); })
          Game.LoadScreen.setLoadBackground('load_chargen' ,() => {
            Game.LoadScreen.Open();
            Game.CharGenClass.Init( () => {
              Game.LoadScreen.Close();
              Game.CharGenClass.Open();
            });
          });
        });

        this.btn_loadgame.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
          Game.MenuSaveLoad.Open()
        });

        this.btn_movies.addEventListener('click', (e) => {
          e.stopPropagation();
          //this.Hide();
          Game.MainMovies.Open();
          //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
        });

        this.btn_options.addEventListener('click', (e) => {
          e.stopPropagation();
          //this.Hide();
          Game.MainOptions.Open();
        });

        this.btn_exit.addEventListener('click', (e) => {
          e.stopPropagation();
          window.close();
        });

        let bgMusic = 'mus_theme_cult';            
      
        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('mainmenu', ResourceTypes['mdl']), (mdlBuffer) => {
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel('mainmenu', ResourceTypes['mdx']), (mdxBuffer) => {
            try{
    
              let model = new AuroraModel( new BinaryReader(Buffer.from(mdlBuffer)), new BinaryReader(Buffer.from(mdxBuffer)) );

              this.tGuiPanel.widget.fill.visible = false;

              this._3dView = new LBL_3DView();
              this._3dView.visible = true;
              this.lbl_3dview.getFill().material.uniforms.map.value = this._3dView.texture.texture;
              this.lbl_3dview.getFill().material.transparent = false;
              
              
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
  
                    AudioLoader.LoadMusic(bgMusic, (data) => {
                      
                      this.bgMusicBuffer = data;
                      
                      if(typeof this.onLoad === 'function')
                        this.onLoad();
  
                      //setTimeout( () => {
                      //  this._3dViewModel.buildSkeleton();
                        this._3dViewModel.playAnimation(0, true);
                      //}, 1000)
                
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
            this.Remove();
            throw 'Resource not found in BIF archive ';
          });
        }, (e) => {
          this.Remove();
          throw 'Resource not found in BIF archive ';
        });

      }
    })

  }

  Update(delta = 0){
    super.Update(delta);
    try{
      this._3dView.render(delta);
      this.lbl_3dview.getFill().material.needsUpdate = true;
    }catch(e){}
  }

  Show(){
    super.Show();

    Game.audioEngine.SetBackgroundMusic(this.bgMusicBuffer);

    //Game.MainOptions.Hide();
    //Game.MainMovies.Hide();

    Game.AlphaTest = 0.5;

  }

}

module.exports = MainMenu;