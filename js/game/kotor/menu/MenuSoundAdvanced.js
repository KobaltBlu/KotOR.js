/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuSound menu class.
 */

class MenuSoundAdvanced extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'optsoundadv',
      onLoad: () => {
        
        this.LBL_TITLE = this.getControlByName('LBL_TITLE');
        this.LB_DESC = this.getControlByName('LB_DESC');

        this.CB_FORCESOFTWARE = this.getControlByName('CB_FORCESOFTWARE');
        this.BTN_EAX = this.getControlByName('BTN_EAX');
        this.BTN_EAXLEFT = this.getControlByName('BTN_EAXLEFT');
        this.BTN_EAXRIGHT = this.getControlByName('BTN_EAXRIGHT');

        this.BTN_DEFAULT = this.getControlByName('BTN_DEFAULT');
        this.BTN_BACK = this.getControlByName('BTN_BACK');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');

        this.CB_FORCESOFTWARE.attachINIProperty('Sound Options.Force Software');
        this.CB_FORCESOFTWARE.onValueChanged = () => {
          console.log('CB_FORCESOFTWARE', 'onValueChanged');
          if(iniConfig.getProperty('Sound Options.Force Software') == 1){
            Game.audioEngine.SetReverbState(false);
          }else{
            Game.audioEngine.SetReverbState(true);
          }
        };

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          /*this.Hide();
          if(Game.Mode == Game.MODES.INGAME){
            Game.MenuSound.Show();
          }else{
            Game.MenuSound.Show();
          }*/
          this.Close();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

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

module.exports = MenuSoundAdvanced;