import { AudioLoader } from "@/audio/AudioLoader";
import { AudioEngine } from "@/audio/AudioEngine";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox } from "@/gui";
import { TwoDAObject } from "@/resource/TwoDAObject";

/** Retail fade-in duration (UpdateFading). */
const FADE_IN_SEC = 1.0;
/** Visible hold ends at 3s from fade-cycle start when fading up. */
const FADE_HOLD_END_SEC = 3.0;
/** Next-text trigger while faded out (fadingUp == 0) at 2s. */
const FADE_NEXT_SEC = 2.0;
/** Retail scroll interval numerator: 305 / listbox height. */
const SCROLL_INTERVAL_NUMERATOR = 305.0;

enum CreditsMode {
  Fade = 1,
  Scroll = 0,
}

/**
 * MenuCredits class.
 *
 * retail — loads credits.2da Name strrefs, fades then scrolls.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuCredits.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCredits extends GameMenu {

  LB_CREDITS: GUIListBox;

  /** Strrefs from credits.2da Name column. */
  sectionStrRefs: number[] = [];
  /** Current section index (retail m_nCurrentText). */
  currentIndex: number = 0;
  /** Fade vs scroll mode (retail m_nMode). */
  mode: CreditsMode = CreditsMode.Fade;
  /** Retail m_bFadingUp. */
  fadingUp: boolean = true;
  /** Fade / scroll accumulators. */
  fadeTimer: number = 0;
  scrollTimer: number = 0;
  scrollInterval: number = 0.5;
  /** Music resref passed to StartCreditSequence (usually "credits"). */
  musicResRef: string = 'credits';
  private musicBuffer: ArrayBuffer | undefined;
  private musicPlaying: boolean = false;
  private closing: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'credits';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.loadCreditSections();

      const dismiss = (e?: any) => {
        e?.stopPropagation?.();
        this.closeCredits();
      };

      this.LB_CREDITS?.addEventListener?.('click', dismiss);
      this.tGuiPanel?.addEventListener?.('click', dismiss);

      resolve();
    });
  }

  /**
   * Retail C2DA("credits") GetINTEntry(..., "Name").
   */
  protected loadCreditSections() {
    this.sectionStrRefs = [];
    const table = GameState.TwoDAManager.datatables.get('credits');
    if(!table) return;

    for(let i = 0; i < table.RowCount; i++){
      const row = table.getRowByIndex(i);
      if(!row) continue;
      const strRef = TwoDAObject.normalizeValue(row.Name ?? row.name, 'number', 0) | 0;
      if(strRef > 0){
        this.sectionStrRefs.push(strRef);
      }
    }
  }

  protected getString(strRef: number): string {
    return GameState.TLKManager.GetStringById(strRef)?.Value
      || GameState.TLKManager.TLKStrings?.[strRef]?.Value
      || '';
  }

  protected setListOpacity(alpha: number) {
    const a = Math.max(0, Math.min(1, alpha));
    try{
      const items = this.LB_CREDITS?.children || [];
      for(const item of items){
        if(item?.text?.material?.uniforms?.opacity){
          item.text.material.uniforms.opacity.value = a;
        }
        if(typeof (item as any).opacity === 'number'){
          (item as any).opacity = a;
        }
      }
    }catch(_e){ /* ignore */ }
  }

  protected showFadeText(strRef: number) {
    const text = this.getString(strRef);
    this.LB_CREDITS.setItem(text || '');
    this.LB_CREDITS.show();
  }

  protected showScrollText() {
    const lines: string[] = [];
    // Leading padding roughly matching retail height / font padding.
    for(let i = 0; i < 8; i++) lines.push(' ');
    for(const strRef of this.sectionStrRefs){
      const text = this.getString(strRef);
      if(text){
        for(const line of text.split(/\r?\n/)){
          lines.push(line.length ? line : ' ');
        }
        lines.push(' ');
      }
    }
    for(let i = 0; i < 8; i++) lines.push(' ');
    this.LB_CREDITS.setItems(lines, { requestNoSelect: true } as any);
    this.LB_CREDITS.scroll = 0;
    this.LB_CREDITS.show();
    this.setListOpacity(1);
  }

  /**
   * Retail SetNextText — advance section; last entry switches to scroll mode.
   */
  protected setNextText() {
    const count = this.sectionStrRefs.length;
    if(count <= 0){
      this.closeCredits();
      return;
    }

    const atLast = this.currentIndex >= count - 1;
    if(atLast){
      this.mode = CreditsMode.Scroll;
      const height = Math.max(1, this.LB_CREDITS?.extent?.height || 480);
      this.scrollInterval = SCROLL_INTERVAL_NUMERATOR / height;
      this.scrollTimer = 0;
      this.showScrollText();
      this.currentIndex = count;
      return;
    }

    this.mode = CreditsMode.Fade;
    this.showFadeText(this.sectionStrRefs[this.currentIndex]);
    this.currentIndex++;
  }

  protected async startCreditsMusic() {
    this.musicPlaying = false;
    try{
      const data = await AudioLoader.LoadMusic(this.musicResRef);
      this.musicBuffer = data.buffer as ArrayBuffer;
      AudioEngine.GetAudioEngine().setAudioBuffer('BACKGROUND_MUSIC_DAY', this.musicBuffer, this.musicResRef);
      AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter.play();
      this.musicPlaying = true;
    }catch(_e){
      this.musicPlaying = false;
    }
  }

  show() {
    super.show();
    this.closing = false;
    this.loadCreditSections();
    this.currentIndex = 0;
    this.fadeTimer = 0;
    this.scrollTimer = 0;
    this.fadingUp = true;

    if(this.sectionStrRefs.length < 2){
      this.mode = CreditsMode.Scroll;
      const height = Math.max(1, this.LB_CREDITS?.extent?.height || 480);
      this.scrollInterval = SCROLL_INTERVAL_NUMERATOR / height;
      this.showScrollText();
    }else{
      this.mode = CreditsMode.Fade;
      this.setNextText();
      this.setListOpacity(0);
    }

    this.startCreditsMusic();
  }

  update(delta = 0) {
    super.update(delta);
    if(this.closing) return;

    if(this.mode === CreditsMode.Fade){
      this.updateFading(delta);
    }else{
      this.updateScrolling(delta);
    }
  }

  /** Retail UpdateFading. */
  protected updateFading(delta: number) {
    this.fadeTimer += delta;
    if(this.fadeTimer >= FADE_IN_SEC){
      if(!this.fadingUp){
        this.setListOpacity(0);
        if(this.fadeTimer >= FADE_NEXT_SEC){
          this.fadeTimer = this.fadeTimer - FADE_NEXT_SEC;
          while(this.fadeTimer >= FADE_NEXT_SEC) this.fadeTimer -= FADE_NEXT_SEC;
          this.fadingUp = true;
          this.setNextText();
          if(this.mode === CreditsMode.Scroll) return;
          this.setListOpacity(0);
        }
      }else{
        this.setListOpacity(1);
        if(this.fadeTimer >= FADE_HOLD_END_SEC){
          this.fadeTimer = this.fadeTimer % FADE_HOLD_END_SEC;
          this.fadingUp = false;
        }
      }
    }else{
      const alpha = this.fadingUp ? this.fadeTimer : (1.0 - this.fadeTimer);
      this.setListOpacity(alpha);
    }
  }

  /** Retail UpdateScrolling. */
  protected updateScrolling(delta: number) {
    const lb = this.LB_CREDITS;
    if(!lb) return;

    if(lb.scroll >= lb.maxScroll){
      // Retail waits for music end, then closes the panel chain.
      const emitter = AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter;
      if(!this.musicPlaying || !emitter?.playing){
        this.closeCredits();
      }
      return;
    }

    this.scrollTimer += delta;
    while(this.scrollTimer >= this.scrollInterval){
      this.scrollTimer -= this.scrollInterval;
      lb.scrollDown();
      if(lb.scroll >= lb.maxScroll) break;
    }
  }

  protected closeCredits() {
    if(this.closing) return;
    this.closing = true;
    this.close();
  }

  triggerControllerAPress() {
    this.closeCredits();
  }

  triggerControllerBPress() {
    this.closeCredits();
  }

}
