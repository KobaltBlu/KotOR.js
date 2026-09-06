import { AudioEngine } from "@/audio/AudioEngine";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider } from "@/gui";

const DEFAULT_GAIN = 0.75;

/** retail CSWGuiOptionsSound description TLKs (K1). */
const TLK_DESC_MUSIC = 0xa547;
const TLK_DESC_VO = 0xa548;
const TLK_DESC_FX = 0xa549;
const TLK_DESC_MOVIE = 0xbb31;
const TLK_DESC_ADVANCED = 0xbfb1;

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

  protected setDescription(strRef: number) {
    this.LB_DESC?.setItem(
      GameState.TLKManager.GetStringById(strRef)?.Value
        || GameState.TLKManager.TLKStrings?.[strRef]?.Value
        || ''
    );
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      GameState.iniConfig.save();
      this.close();
    });
    this._button_b = this.BTN_BACK;

    this.BTN_ADVANCED.addEventListener('click', (e) => {
      e.stopPropagation();
      this.manager.MenuSoundAdvanced.open();
    });

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
    this.BTN_ADVANCED.addEventListener('hover', () => this.setDescription(TLK_DESC_ADVANCED));
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
