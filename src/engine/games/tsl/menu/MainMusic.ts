import { GameState } from "@engine/runtime/GameState";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { AudioLoader } from "@engine/audio/AudioLoader";
import { GameMenu } from "@engine/gui/GameMenu";
import type { GUILabel, GUIButton, GUIListBox, GUISlider } from "@engine/gui";
import { GUIMusicItem } from "@engine/games/tsl/gui/GUIMusicItem";
import { TwoDAObject } from "@core/resource/TwoDAObject";

/** TLK 0xBDAC — LBL_TRACKNUM default strref (GUI ctor). */
const TLK_TRACKNUM_DEFAULT = 0xBDAC;

interface MusicItem {
  filename: string;
  strrefname: number;
  unlockplanet: number;
  /** Index among unlocked songs (0-based). */
  listIndex: number;
}

/**
 * MainMusic class.
 *
 * (titlemusic_p) — UnlockedPlanetSongs bitmask,
 * PopulateSongList / OnSongPicked / OnPlayPicked / OnLoopPicked / OnNextPicked / OnStopPicked.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MainMusic.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainMusic extends GameMenu {

  declare LBL_MUSIC_TITLE: GUILabel;
  declare BTN_LOOP: GUIButton;
  declare BTN_STOP: GUIButton;
  declare BTN_NEXT: GUIButton;
  declare BTN_PLAY: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_UNLOCKED: GUILabel;
  declare LBL_TRACKNAME: GUILabel;
  declare LBL_TRACKNUM: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LB_MUSIC: GUIListBox;
  declare SLI_VOLUME: GUISlider;

  selected: MusicItem | undefined;
  selectedIndex = 0;
  loop: boolean = false;
  /** Planet unlock flags 0..10 from Game Options.UnlockedPlanetSongs; planet 0 always unlocked. */
  unlockedPlanets: boolean[] = [];
  musicList: MusicItem[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemusic_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_MUSIC.setProtoBuilder(GUIMusicItem);

      this.loadUnlockedPlanets();
      this.populateSongList();

      this.LBL_TRACKNAME.setText('');
      this.LBL_TRACKNUM.setText(GameState.TLKManager.GetStringById(TLK_TRACKNUM_DEFAULT).Value || '');

      this.LB_MUSIC.onSelected = (node: MusicItem) => {
        this.onSongPicked(node);
      };

      // list item A-button → OnPlayPicked
      this.LB_MUSIC.onClicked = (node: MusicItem) => {
        this.onSongPicked(node);
        this.onPlayPicked();
      };

      this.BTN_PLAY.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onPlayPicked();
      });

      this.BTN_STOP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onStopPicked();
      });

      this.BTN_NEXT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onNextPicked();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopMusic();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_LOOP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onLoopPicked();
      });

      // options = Sound Options.Music Volume (0–100)
      this.SLI_VOLUME.attachINIProperty('Sound Options.Music Volume');
      this.SLI_VOLUME.onValueChanged = (value: number) => {
        value = Math.min(1, Math.max(0, value));
        AudioEngine.GAIN_MUSIC = value;
        GameState.iniConfig.setProperty('Sound Options.Music Volume', (value * 100) | 0);
      };

      resolve();
    });
  }

  /**
   * Ctor: read UnlockedPlanetSongs bitmask; force planet 0 unlocked.
   */
  loadUnlockedPlanets(): void {
    const raw = GameState.iniConfig.getProperty('Game Options.UnlockedPlanetSongs');
    const mask = parseInt(String(raw ?? '0'), 10) || 0;
    this.unlockedPlanets = [];
    for(let i = 0; i < 11; i++){
      this.unlockedPlanets[i] = (mask & (1 << i)) !== 0;
    }
    this.unlockedPlanets[0] = true;
  }

  /**
   * PopulateSongList — musictable rows with UnlockPlanet in 0..10 and unlocked.
   */
  populateSongList(): void {
    this.musicList = [];
    const table = GameState.TwoDAManager.datatables.get('musictable');
    if(!table){
      this.LB_MUSIC.setItems([]);
      return;
    }

    for(let i = 0; i < table.RowCount; i++){
      const row = table.getRowByIndex(i);
      const filename = TwoDAObject.normalizeValue(row.filename ?? row.FileName, 'string', '');
      const strrefname = TwoDAObject.normalizeValue(row.strrefname ?? row.StrrefName, 'number', -1);
      const unlockplanet = TwoDAObject.normalizeValue(row.unlockplanet ?? row.UnlockPlanet, 'number', -1);
      if(unlockplanet < 0 || unlockplanet >= 11) continue;
      if(!this.unlockedPlanets[unlockplanet]) continue;
      this.musicList.push({
        filename,
        strrefname,
        unlockplanet,
        listIndex: this.musicList.length,
      });
    }

    this.LB_MUSIC.setItems(this.musicList);
  }

  /**
   * OnSongPicked — update selection + LBL_TRACKNUM as "%d/%d".
   */
  onSongPicked(node: MusicItem): void {
    if(!node) return;
    this.selected = node;
    this.selectedIndex = this.musicList.indexOf(node);
    if(this.selectedIndex < 0) this.selectedIndex = 0;
    this.LBL_TRACKNAME.setText(GameState.TLKManager.GetStringById(node.strrefname).Value || '');
    this.LBL_TRACKNUM.setText(`${this.selectedIndex + 1}/${this.musicList.length}`);
  }

  /**
   * OnPlayPicked
   */
  async onPlayPicked(): Promise<void> {
    if(!this.musicList.length || !this.selected) return;
    try{
      const engine = AudioEngine.GetAudioEngine();
      if(engine.areaMusicDayAudioEmitter.playing){
        await engine.areaMusicDayAudioEmitter.fadeOutAndStop(0.5);
      }
      const data = await AudioLoader.LoadMusic(this.selected.filename);
      engine.setAudioBuffer('BACKGROUND_MUSIC_DAY', data.buffer as ArrayBuffer, this.selected.filename);
      await engine.areaMusicDayAudioEmitter.play(this.loop);
      this.LBL_TRACKNAME.setText(GameState.TLKManager.GetStringById(this.selected.strrefname).Value || '');
    }catch(e){
      console.error('MainMusic: Background Music not found', this.selected.filename, e);
    }
  }

  /**
   * OnLoopPicked — toggle loop + BTN_LOOP border pulsing.
   */
  onLoopPicked(): void {
    this.loop = !this.loop;
    this.BTN_LOOP.pulsing = this.loop;
    const emitter = AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter;
    if(emitter.node){
      emitter.node.loop = this.loop;
    }
  }

  /**
   * OnStopPicked / StopMusic — FadeAndStop(500ms), clear track name.
   */
  async onStopPicked(): Promise<void> {
    const emitter = AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter;
    if(!this.musicList.length || !emitter.playing) return;
    await this.stopMusic();
  }

  async stopMusic(): Promise<void> {
    const emitter = AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter;
    if(emitter.playing){
      await emitter.fadeOutAndStop(0.5);
    }else{
      emitter.stop(false);
    }
    this.LBL_TRACKNAME.setText('');
  }

  /**
   * OnNextPicked — advance selection, OnSongPicked, then play.
   */
  async onNextPicked(): Promise<void> {
    if(!this.musicList.length) return;
    if(!this.selected){
      this.selectedIndex = 0;
    }else{
      this.selectedIndex++;
      if(this.selectedIndex >= this.musicList.length){
        this.selectedIndex = 0;
      }
    }
    const next = this.musicList[this.selectedIndex];
    this.LB_MUSIC.selectItem(next);
    this.onSongPicked(next);
    await this.onPlayPicked();
  }

  show(){
    super.show();
    this.loadUnlockedPlanets();
    this.populateSongList();
  }

  close(){
    void this.stopMusic();
    super.close();
  }

}
