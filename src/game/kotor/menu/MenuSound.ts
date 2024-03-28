import { AudioEngine } from "../../../audio/AudioEngine";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider } from "../../../gui";

/**
 * MenuSound class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSound.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSound extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_MUSIC: GUISlider;
  LBL_MUSIC: GUILabel;
  LBL_VO: GUILabel;
  SLI_VO: GUISlider;
  LBL_FX: GUILabel;
  LBL_MOVIE: GUILabel;
  SLI_FX: GUISlider;
  SLI_MOVIE: GUISlider;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ADVANCED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsound';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ADVANCED.addEventListener('click', (e) => {
        e.stopPropagation();
        //this.Hide();
        this.manager.MenuSoundAdvanced.open();
      });

      //this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
      //this.SLI_VO.setValue(AudioEngine.GAIN_VO);
      //this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
      //this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);

      this.SLI_MUSIC.onValueChanged = (value: any) => {
        AudioEngine.GAIN_MUSIC = value;
      };

      this.SLI_VO.onValueChanged = (value: any) => {
        AudioEngine.GAIN_VO = value;
      };

      this.SLI_FX.onValueChanged = (value: any) => {
        AudioEngine.GAIN_SFX = value;
      };

      this.SLI_MOVIE.onValueChanged = (value: any) => {
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
      resolve();
    });
  }

  show() {
    super.show();
    this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
    this.SLI_VO.setValue(AudioEngine.GAIN_VO);
    this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
    this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);
  }
  
}
