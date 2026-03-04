import { AudioLoader } from "@/audio/AudioLoader";
import { GUIMusicItem } from "@/game/tsl/gui/GUIMusicItem";
import { GameState } from "@/GameState";
import type { GUILabel, GUIButton, GUIListBox, GUISlider } from "@/gui";
import { GameMenu } from "@/gui/GameMenu";
import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

/**
 * MainMusic class.
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

  selected: ITwoDARowData | undefined;
  selectedIndex = 0;
  musicVolume = 0.5;

  audioCtx: AudioContext;
  musicGain: GainNode;
  bgmBuffer: AudioBuffer;
  bgm: AudioBufferSourceNode;
  loop: boolean = false;

  musicList: ITwoDARowData[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemusic_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    log.trace('menuControlInitializer entered', { skipInit });
    await super.menuControlInitializer(true);
    if(skipInit) { log.trace('menuControlInitializer skipInit, returning'); return; }
    return new Promise<void>((resolve, _reject) => {
      log.debug('MainMusic initializing LB_MUSIC and audio');
      this.LB_MUSIC.GUIProtoItemClass = GUIMusicItem;

      const AudioContextCtor = (typeof globalThis !== 'undefined' && (globalThis as { AudioContext?: typeof AudioContext }).AudioContext) ||
        (typeof globalThis !== 'undefined' && (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      this.audioCtx = new (AudioContextCtor || AudioContext)();
      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.audioCtx.destination);

      const table = GameState.TwoDAManager.datatables.get('musictable');
      for(let i = 0; i < table.RowCount; i++){
        const row = table.getRowByIndex(i);
        this.LB_MUSIC.addItem(row);
        this.musicList.push(row);
      }

      this.LBL_TRACKNUM.setText(`${0} / ${table.RowCount}`);

      this.LB_MUSIC.onSelected = (node: ITwoDARowData) => {
        log.info('Music track selected', node.__rowlabel);
        this.selected = node;
        const strref = typeof node.strrefname === 'number' ? node.strrefname : parseInt(String(node.strrefname), 10);
        this.LBL_TRACKNAME.setText(GameState.TLKManager.GetStringById(strref).Value);
        this.LBL_TRACKNUM.setText(`${node.__rowlabel} / ${table.RowCount}`);
        this.selectedIndex = this.musicList.indexOf(node);
      }

      this.BTN_PLAY.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = this.selected ? String(this.selected.filename ?? '') : '';
        AudioLoader.LoadMusic(filename).then((data: Uint8Array) => {
          this.setBackgroundMusic(data.buffer as ArrayBuffer);
        }, () => {
          log.error('Background Music not found', filename);
        });
      });

      this.BTN_STOP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopBackgroundMusic();
      });

      this.BTN_NEXT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedIndex++;
        if(this.selectedIndex >= table.RowCount){
          this.selectedIndex = 0;
        }
        log.info('Music track index', String(this.selectedIndex));
        this.LB_MUSIC.selectItem(this.LB_MUSIC.listItems[this.selectedIndex]);
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopBackgroundMusic();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_LOOP.addEventListener('click', (_e) => {
        this.loop = !this.loop;
        this.BTN_LOOP.pulsing = this.loop;
      });

      this.SLI_VOLUME.onValueChanged = (value: number) => {
        value = Math.min(1, Math.max(0, value));
        this.musicVolume = value;
        this.musicGain.gain.value = value;
        log.debug('MainMusic volume changed', value);
      }

      log.trace('MainMusic menuControlInitializer completed');
      resolve();
    });
  }

  setBackgroundMusic ( data: ArrayBuffer ) {
    log.trace('setBackgroundMusic decoding');
    this.audioCtx.decodeAudioData( data, ( buffer ) => {
      this.bgmBuffer = buffer;
      log.debug('setBackgroundMusic decode complete');
      this.startBackgroundMusic();
    });
  }

  startBackgroundMusic(buffer?: AudioBuffer){
    log.trace('startBackgroundMusic', { hasBuffer: !!buffer, hasBgmBuffer: !!this.bgmBuffer });
    if(buffer == undefined)
      buffer = this.bgmBuffer;

    this.stopBackgroundMusic();

    //Create the new audio buffer and callbacks
    this.bgm = this.audioCtx.createBufferSource();

    this.bgm.buffer = buffer;
    this.bgm.loop = false;
    this.bgm.start( 0, 0 );
    this.bgm.connect( this.musicGain );

    this.bgm.onended = () => {
      if(this.loop){
        this.startBackgroundMusic()
      }
    };
  }

  stopBackgroundMusic(){
    log.trace('MainMusic.stopBackgroundMusic');
    try{
      if (this.bgm != null) {
        this.bgm.onended = undefined;
        this.bgm.disconnect();
        this.bgm.stop(0);
        this.bgm = null;
        log.debug('stopBackgroundMusic stopped');
      }
    }catch(e){
      log.warn('stopBackgroundMusic error', e);
    }
  }

}

