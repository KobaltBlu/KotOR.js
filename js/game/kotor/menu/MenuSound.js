/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuSound menu class.
 */

class MenuSound extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'optsound',
      onLoad: () => {

        
        this.LBL_MUSIC = this.getControlByName('LBL_MUSIC');
        this.LBL_VO = this.getControlByName('LBL_VO');
        this.LBL_FX = this.getControlByName('LBL_FX');
        this.LBL_MOVIE = this.getControlByName('LBL_MOVIE');

        this.SLI_MUSIC = this.getControlByName('SLI_MUSIC');
        this.SLI_VO = this.getControlByName('SLI_VO');
        this.SLI_FX = this.getControlByName('SLI_FX');
        this.SLI_MOVIE = this.getControlByName('SLI_MOVIE');
        
        this.LB_DESC = this.getControlByName('LB_DESC');
        this.BTN_DEFAULT = this.getControlByName('BTN_DEFAULT');


        this.BTN_ADVANCED = this.getControlByName('BTN_ADVANCED');
        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          /*this.Hide();
          if(Game.Mode == Game.MODES.INGAME){
            Game.MenuOptions.Show();
          }else{
            Game.MainOptions.Show();
          }*/
          this.Close();
        });
        this._button_b = this.BTN_BACK;

        this.BTN_ADVANCED.addEventListener('click', (e) => {
          e.stopPropagation();
          //this.Hide();
          Game.MenuSoundAdvanced.Open();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

        //this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
        //this.SLI_VO.setValue(AudioEngine.GAIN_VO);
        //this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
        //this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);

        this.SLI_MUSIC.onValueChanged = (value) => {
          AudioEngine.GAIN_MUSIC = value;
        };

        this.SLI_VO.onValueChanged = (value) => {
          AudioEngine.GAIN_VO = value;
        };

        this.SLI_FX.onValueChanged = (value) => {
          AudioEngine.GAIN_FX = value;
        };

        this.SLI_MOVIE.onValueChanged = (value) => {
          AudioEngine.GAIN_MOVIE = value;
        };

        this.SLI_MUSIC.attachINIProperty('Sound Options.Music Volume');
        this.SLI_VO.attachINIProperty('Sound Options.Voiceover Volume');
        this.SLI_FX.attachINIProperty('Sound Options.Sound Effects Volume');
        this.SLI_MOVIE.attachINIProperty('Sound Options.Movie Volume');

        this.LBL_MUSIC.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_MUSIC.getHintText())
        });

        this.SLI_MUSIC.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_MUSIC.getHintText())
        });

        this.LBL_VO.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_VO.getHintText())
        });

        this.SLI_VO.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_VO.getHintText())
        });

        this.LBL_FX.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_FX.getHintText())
        });

        this.SLI_FX.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_FX.getHintText())
        });

        this.LBL_MOVIE.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_MOVIE.getHintText())
        });

        this.SLI_MOVIE.addEventListener( 'hover', () => {
          //console.log(this.LBL_MUSIC.getHintText());
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(this.LBL_MOVIE.getHintText())
        });

      }
    })

  }

  Show(){
    super.Show();
    this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
    this.SLI_VO.setValue(AudioEngine.GAIN_VO);
    this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
    this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);
  }

}

module.exports = MenuSound;