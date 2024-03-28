import { GameState } from "../../../GameState";
import { AudioLoader } from "../../../audio/AudioLoader";
import { GameMenu } from "../../../gui/GameMenu";
import type { GUILabel, GUIButton, GUIListBox, GUISlider } from "../../../gui";
import { GUIMusicItem } from "../gui/GUIMusicItem";

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

  selected: any;
  selectedIndex = 0;
  musicVolume = 0.5;

  audioCtx: AudioContext;
  musicGain: GainNode;
  bgmBuffer: AudioBuffer;
  bgm: AudioBufferSourceNode;
  loop: boolean = false;

  musicList: any[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemusic_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MUSIC.GUIProtoItemClass = GUIMusicItem;
      
      this.audioCtx = new (global.AudioContext || (global as any).webkitAudioContext)();
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

      this.LB_MUSIC.onSelected = (node: any) => {
        console.log(node);
        this.selected = node;
        this.LBL_TRACKNAME.setText(GameState.TLKManager.GetStringById(node.strrefname).Value);
        this.LBL_TRACKNUM.setText(`${node.__rowlabel} / ${table.RowCount}`);
        this.selectedIndex = this.musicList.indexOf(node);
      }

      this.BTN_PLAY.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioLoader.LoadMusic(this.selected.filename).then((data: ArrayBuffer) => {
          this.setBackgroundMusic(data);
        }, () => {
          console.error('Background Music not found', this.selected.filename);
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
        console.log(this.selectedIndex);
        this.LB_MUSIC.selectItem(this.LB_MUSIC.listItems[this.selectedIndex]);
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopBackgroundMusic();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_LOOP.addEventListener('click', (e) => {
        this.loop = !this.loop;
        this.BTN_LOOP.pulsing = this.loop;
      });
      
      this.SLI_VOLUME.onValueChanged = (value: number) => {
        value = Math.min(1, Math.max(0, value));
        this.musicVolume = value;
        this.musicGain.gain.value = value;
      }

      resolve();
    });
  }

  setBackgroundMusic ( data: ArrayBuffer ) {
    this.audioCtx.decodeAudioData( data, ( buffer ) => {
      this.bgmBuffer = buffer;
      this.startBackgroundMusic();
    });
  }

  startBackgroundMusic(buffer?: AudioBuffer){

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
    try{
      if (this.bgm != null) {
        this.bgm.onended = undefined;
        this.bgm.disconnect();
        this.bgm.stop(0);
        this.bgm = null;
      }
    }catch(e){}
  }
  
}
