import { AudioEngine } from "../../../audio/AudioEngine";
import type { GUILabel, GUISlider, GUIListBox, GUIButton } from "../../../gui";
import { MenuSound as K1_MenuSound } from "../../kotor/KOTOR";

/**
 * MenuSound class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSound.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSound extends K1_MenuSound {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare SLI_MUSIC: GUISlider;
  declare LBL_MUSIC: GUILabel;
  declare LBL_VO: GUILabel;
  declare SLI_VO: GUISlider;
  declare LBL_FX: GUILabel;
  declare LBL_MOVIE: GUILabel;
  declare SLI_FX: GUISlider;
  declare SLI_MOVIE: GUISlider;
  declare LB_DESC: GUIListBox;
  declare BTN_ADVANCED: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsound_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_ADVANCED.addEventListener('click', (e) => {
        this.manager.MenuSoundAdvanced.open();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

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
  
}
