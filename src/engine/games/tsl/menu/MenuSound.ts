import { AudioEngine } from "@engine/audio/AudioEngine";
import { GameState } from "@engine/runtime/GameState";
import type { GUILabel, GUISlider, GUIListBox, GUIButton } from "@engine/gui";
import { MenuSound as K1_MenuSound } from "@engine/games/kotor/menu/MenuSound";

const DEFAULT_GAIN = 0.75;

/** sound options description TLKs (TSL). */
const TLK_DESC_MUSIC = 0xa547;
const TLK_DESC_VO = 0xa548;
const TLK_DESC_FX = 0xa549;
const TLK_DESC_MOVIE = 0xbb31;

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
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    this.BTN_ADVANCED.addEventListener('click', (e) => {
      this.manager.MenuSoundAdvanced.open();
    });

    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      GameState.iniConfig.save();
      this.close();
    });
    this._button_b = this.BTN_BACK;

    this.BTN_DEFAULT.addEventListener('click', (e) => {
      e.stopPropagation();
      AudioEngine.GAIN_GUI = DEFAULT_GAIN;
      this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC = DEFAULT_GAIN);
      this.SLI_VO.setValue(AudioEngine.GAIN_VO = DEFAULT_GAIN);
      this.SLI_FX.setValue(AudioEngine.GAIN_SFX = DEFAULT_GAIN);
      this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE = DEFAULT_GAIN);
    });

    this.SLI_MUSIC.onValueChanged = (value: any) => {
      AudioEngine.GAIN_MUSIC = value;
    };

    this.SLI_VO.onValueChanged = (value: any) => {
      AudioEngine.GAIN_VO = value;
    };

    this.SLI_FX.onValueChanged = (value: any) => {
      AudioEngine.GAIN_SFX = value;
      AudioEngine.GAIN_GUI = value;
    };

    this.SLI_MOVIE.onValueChanged = (value: any) => {
      AudioEngine.GAIN_MOVIE = value;
    };

    this.SLI_MUSIC.attachINIProperty('Sound Options.Music Volume');
    this.SLI_VO.attachINIProperty('Sound Options.Voiceover Volume');
    this.SLI_FX.attachINIProperty('Sound Options.Sound Effects Volume');
    this.SLI_MOVIE.attachINIProperty('Sound Options.Movie Volume');

    this.LBL_MUSIC.addEventListener('hover', () => this.setDescription(TLK_DESC_MUSIC));
    this.SLI_MUSIC.addEventListener('hover', () => this.setDescription(TLK_DESC_MUSIC));
    this.LBL_VO.addEventListener('hover', () => this.setDescription(TLK_DESC_VO));
    this.SLI_VO.addEventListener('hover', () => this.setDescription(TLK_DESC_VO));
    this.LBL_FX.addEventListener('hover', () => this.setDescription(TLK_DESC_FX));
    this.SLI_FX.addEventListener('hover', () => this.setDescription(TLK_DESC_FX));
    this.LBL_MOVIE.addEventListener('hover', () => this.setDescription(TLK_DESC_MOVIE));
    this.SLI_MOVIE.addEventListener('hover', () => this.setDescription(TLK_DESC_MOVIE));
  }

  show() {
    super.show();
    this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
    this.SLI_VO.setValue(AudioEngine.GAIN_VO);
    this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
    this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);
    this.setDescription(TLK_DESC_MUSIC);
  }
  
}
