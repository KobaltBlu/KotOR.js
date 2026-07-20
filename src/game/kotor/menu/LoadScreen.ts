import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { GameMenu } from "@/gui";
import type { GUILabel, GUIProgressBar } from "@/gui";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { AudioEngine } from "@/audio/AudioEngine";
import { SoundMode } from "@/enums/audio/SoundMode";

/** Retail loading label TLK (LoadScreen show). */
const TLK_LOADING = 42493;
/** Retail saving title TLK. */
const TLK_SAVING = 42528;
/** Retail saving hint TLK. */
const TLK_SAVING_HINT = 41926;

/**
 * LoadScreen class.
 *
 * Retail CSWGuiLoadScreen — progress, loadscreenhints.2da tips, background image.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file LoadScreen.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LoadScreen extends GameMenu {

  engineMode: EngineMode = EngineMode.LOADING;
  PB_PROGRESS: GUIProgressBar;
  LBL_HINT: GUILabel;
  LBL_LOGO: GUILabel;
  /** True after show() pushed SetSoundMode(4); hide() pops once. */
  private soundModeHeld: boolean = false;
  LBL_LOADING: GUILabel;
  defaultTex: any;

  /** Retail rotating GamePlayHint row index. */
  protected gameplayHintIndex: number = 0;
  /** Retail rotating StoryHint row index. */
  protected storyHintIndex: number = 0;

  constructor(){
    super();
    this.gui_resref = 'loadscreen';
    this.background = '1600x1200load';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LBL_HINT.hide();
      this.defaultTex = (this.tGuiPanel.getFill().material as THREE.ShaderMaterial)?.uniforms?.map?.value;
      resolve();
    });
  }

  setProgress(val = 0) {
    this.PB_PROGRESS?.setProgress(val);
  }

  setLoadBackground(resref: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      if (resref) {
        const texture = await this.loadTexture(resref);
        if (texture) {
          (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = texture;
          resolve(true);
          return;
        } else {
          const default_texture = await this.loadTexture('load_default');
          if(default_texture){
            (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this.defaultTex = default_texture;
            resolve(true);
            return;
          }else if(this.defaultTex){
            (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this.defaultTex;
            resolve(true);
            return;
          }else{
            resolve(false);
            return;
          }
        }
      } else {
        if(this.defaultTex){
          (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this.defaultTex;
        }
        resolve(false);
        return;
      }
    });
  }

  /**
   * Retail CClientExoAppInternal::GetNextLoadScreenHintSTRREF GamePlayHint path.
   */
  protected getNextGameplayHintStrRef(): number {
    const table = GameState.TwoDAManager.datatables.get('loadscreenhints');
    if(!table || table.RowCount <= 0) return 0;

    const rowCount = table.RowCount;
    let index = this.gameplayHintIndex % rowCount;
    let row = table.getRowByIndex(index);
    let strRef = TwoDAObject.normalizeValue(
      row?.GamePlayHint ?? row?.gameplayhint ?? row?.GameplayHint,
      'number',
      0
    ) | 0;

    if(!strRef){
      index = 0;
      row = table.getRowByIndex(0);
      strRef = TwoDAObject.normalizeValue(
        row?.GamePlayHint ?? row?.gameplayhint ?? row?.GameplayHint,
        'number',
        0
      ) | 0;
      this.gameplayHintIndex = 1;
    }else{
      this.gameplayHintIndex = index + 1;
      if(this.gameplayHintIndex >= rowCount){
        this.gameplayHintIndex = 0;
      }
    }
    return strRef;
  }

  showRandomHint() {
    this.LBL_LOADING?.setText(
      GameState.TLKManager.GetStringById(TLK_LOADING)?.Value
      || GameState.TLKManager.TLKStrings?.[TLK_LOADING]?.Value
      || ''
    );

    const strRef = this.getNextGameplayHintStrRef();
    const text = strRef
      ? (GameState.TLKManager.GetStringById(strRef)?.Value
        || GameState.TLKManager.TLKStrings?.[strRef]?.Value
        || '')
      : '';

    if(text){
      this.LBL_HINT.setText(text);
      this.LBL_HINT.show();
    }else{
      this.LBL_HINT.setText('');
      this.LBL_HINT.hide();
    }
  }

  showSavingMessage() {
    this.LBL_LOADING?.setText(
      GameState.TLKManager.GetStringById(TLK_SAVING)?.Value
      || GameState.TLKManager.TLKStrings?.[TLK_SAVING]?.Value
      || ''
    );
    this.LBL_HINT.setText(
      GameState.TLKManager.GetStringById(TLK_SAVING_HINT)?.Value
      || GameState.TLKManager.TLKStrings?.[TLK_SAVING_HINT]?.Value
      || ''
    );
    this.LBL_HINT.show();
    this.setProgress(0);
  }

  setHintMessage(message: string = ''){
    this.LBL_HINT.setText(message);
    if(message){
      this.LBL_HINT.show();
    }else{
      this.LBL_HINT.hide();
    }
  }

  show() {
    super.show();
    this.setProgress(0);
    GameState.FadeOverlayManager.plane.visible = false;
    // Retail ShowLoadScreen: SetSoundMode(4) (or 3) → PauseAllSounds
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    this.soundModeHeld = true;
  }

  hide() {
    super.hide();
    GameState.FadeOverlayManager.plane.visible = true;
    this.setProgress(0);
    // Retail StartSounds / load complete: SetSoundMode(0)
    if(this.soundModeHeld){
      AudioEngine.SetSoundMode(SoundMode.POP, 0);
      this.soundModeHeld = false;
    }
  }

}
