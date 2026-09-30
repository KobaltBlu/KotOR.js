import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@/gui";
import { TextureLoader } from "@/loaders/TextureLoader";
import { TextureLoaderState } from "@/loaders/TextureLoaderState";
import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';

/** graphics advanced options description TLKs (K1). */
const TLK_SOFT_SHADOWS = 0xbb51;
const TLK_FRAME_BUFFER = 0xbb55;
const TLK_ANISOTROPY = 0xbb59;
const TLK_VSYNC = 0xbb61;
const TLK_ANTI_ALIAS = 0xbb63;
const TLK_TEX_QUAL = 0xbb5d;

/** SetAntiAliasText display TLKs keyed by sample count (K1). */
const TLK_AA_OFF = 0xbb7c;
const TLK_AA_2X = 0xbb7d;
const TLK_AA_4X = 0xbb7f;
const TLK_AA_6X = 0xbfe4;
const TLK_AA_8X = 0xbfe5;

/** SetAnisotropyText display TLKs keyed by anisotropy level (K1). */
const TLK_ANISO_1X = 0xbfb7;
const TLK_ANISO_2X = 0xbfb8;
const TLK_ANISO_4X = 0xbfb9;
const TLK_ANISO_8X = 0xbfba;
const TLK_ANISO_16X = 0xbfbb;

/** anti-aliasing mode ladder (AurQueryAntiAliasingMode samples). */
const AA_MODES: ReadonlyArray<number> = [0, 2, 4, 6, 8];

const INI_TEXTURE_QUALITY = 'Graphics Options.Texture Quality';
const INI_ANISOTROPY = 'Graphics Options.Anisotropy';
const INI_ANTI_ALIASING = 'Graphics Options.Anti Aliasing';
const INI_FRAME_BUFFER = 'Graphics Options.Frame Buffer';
const INI_VSYNC = 'Graphics Options.V-Sync';
const INI_SOFT_SHADOWS = 'Graphics Options.Soft Shadows';
const INI_SHADOWS = 'Graphics Options.Shadows';

/** SetDefaultAdvancedGraphicsOptions. */
const DEFAULT_FRAME_BUFFER = 1;
const DEFAULT_ANISOTROPY = 1;
const DEFAULT_TEXTURE_QUALITY = 0;
const DEFAULT_VSYNC = 1;
const DEFAULT_ANTI_ALIAS = 0;
const DEFAULT_SOFT_SHADOWS = 1;

/**
 * MenuGraphicsAdvanced class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * (optgraphicsadv).
 *
 * @file MenuGraphicsAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphicsAdvanced extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_CANCEL: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ANTIALIAS: GUIButton;
  BTN_ANTIALIASLEFT: GUIButton;
  BTN_ANTIALIASRIGHT: GUIButton;
  BTN_ANISOTROPY: GUIButton;
  BTN_ANISOTROPYLEFT: GUIButton;
  BTN_ANISOTROPYRIGHT: GUIButton;
  BTN_TEXQUAL: GUIButton;
  BTN_TEXQUALLEFT: GUIButton;
  BTN_TEXQUALRIGHT: GUIButton;
  CB_FRAMEBUFF: GUICheckBox;
  CB_VSYNC: GUICheckBox;
  CB_SOFTSHADOWS: GUICheckBox;

  /** Draft values edited in-panel; applied on Back (SetNewOptions). */
  private draftTextureQuality = DEFAULT_TEXTURE_QUALITY;
  private draftAnisotropy = DEFAULT_ANISOTROPY;
  private draftAntiAlias = DEFAULT_ANTI_ALIAS;
  private draftFrameBuffer = DEFAULT_FRAME_BUFFER;
  private draftVSync = DEFAULT_VSYNC;
  private draftSoftShadows = DEFAULT_SOFT_SHADOWS;
  /** When true, Back/close skips SetNewOptions (OnDiscardChanges). */
  private discardChanges = false;

  constructor(){
    super();
    this.gui_resref = 'optgraphicsadv';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_ANTIALIASLEFT.border.dimension = 0;
      this.BTN_ANISOTROPYLEFT.border.dimension = 0;
      this.BTN_TEXQUALLEFT.border.dimension = 0;

      this.tGuiPanel.widget.add(this.BTN_TEXQUALLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANISOTROPYLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANTIALIASLEFT.createControl());

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.commitAndClose();
      });
      this._button_b = this.BTN_BACK;

      if(this.BTN_CANCEL){
        this.BTN_CANCEL.addEventListener('click', (e) => {
          e.stopPropagation();
          this.discardChanges = true;
          this.close();
        });
        this._button_a = this.BTN_CANCEL;
      }

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      this.BTN_TEXQUALLEFT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.draftTextureQuality > 0){
          this.draftTextureQuality--;
          this.updateTextureQualityLabel();
        }
      });

      this.BTN_TEXQUALRIGHT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.draftTextureQuality < this.getMaxTextureQuality()){
          this.draftTextureQuality++;
          this.updateTextureQualityLabel();
        }
      });

      this.BTN_ANTIALIASLEFT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stepAntiAlias(-1);
      });

      this.BTN_ANTIALIASRIGHT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stepAntiAlias(1);
      });

      this.BTN_ANISOTROPYLEFT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.draftAnisotropy > 1){
          this.draftAnisotropy = Math.max(1, Math.floor(this.draftAnisotropy / 2));
          this.updateAnisotropyLabel();
        }
      });

      this.BTN_ANISOTROPYRIGHT.addEventListener('click', (e) => {
        e.stopPropagation();
        const maxAniso = this.getMaxAnisotropy();
        if(this.draftAnisotropy < maxAniso && this.draftAnisotropy < 16){
          this.draftAnisotropy = this.draftAnisotropy * 2;
          this.updateAnisotropyLabel();
        }
      });

      this.CB_FRAMEBUFF.onValueChanged = (value: any) => {
        this.draftFrameBuffer = Number(value) ? 1 : 0;
      };
      this.CB_SOFTSHADOWS.onValueChanged = (value: any) => {
        this.draftSoftShadows = Number(value) ? 1 : 0;
      };
      this.CB_VSYNC.onValueChanged = (value: any) => {
        this.draftVSync = Number(value) ? 1 : 0;
      };

      this.BTN_ANTIALIAS.addEventListener('hover', () => this.setDescription(this.getDescAntiAlias()));
      this.BTN_ANTIALIASLEFT.addEventListener('hover', () => this.setDescription(this.getDescAntiAlias()));
      this.BTN_ANTIALIASRIGHT.addEventListener('hover', () => this.setDescription(this.getDescAntiAlias()));
      this.BTN_TEXQUAL.addEventListener('hover', () => this.setDescription(this.getDescTexQual()));
      this.BTN_TEXQUALLEFT.addEventListener('hover', () => this.setDescription(this.getDescTexQual()));
      this.BTN_TEXQUALRIGHT.addEventListener('hover', () => this.setDescription(this.getDescTexQual()));
      this.BTN_ANISOTROPY.addEventListener('hover', () => this.setDescription(this.getDescAnisotropy()));
      this.BTN_ANISOTROPYLEFT.addEventListener('hover', () => this.setDescription(this.getDescAnisotropy()));
      this.BTN_ANISOTROPYRIGHT.addEventListener('hover', () => this.setDescription(this.getDescAnisotropy()));
      this.CB_FRAMEBUFF.addEventListener('hover', () => this.setDescription(this.getDescFrameBuffer()));
      this.CB_SOFTSHADOWS.addEventListener('hover', () => this.setDescription(this.getDescSoftShadows()));
      this.CB_VSYNC.addEventListener('hover', () => this.setDescription(this.getDescVSync()));

      resolve();
    });
  }

  show() {
    super.show();
    this.discardChanges = false;
    this.setupOptions();
    this.setDescription(this.getDescAntiAlias());
  }

  close() {
    if(!this.discardChanges){
      this.applyNewOptions();
    }
    this.discardChanges = false;
    super.close();
  }

  /** SetUpOptions — load current client options into draft controls. */
  setupOptions(){
    this.draftTextureQuality = this.readIniNumber(INI_TEXTURE_QUALITY, DEFAULT_TEXTURE_QUALITY);
    this.draftAnisotropy = this.normalizeAnisotropy(
      this.readIniNumber(INI_ANISOTROPY, DEFAULT_ANISOTROPY)
    );
    this.draftAntiAlias = this.normalizeAntiAlias(
      this.readIniNumber(INI_ANTI_ALIASING, DEFAULT_ANTI_ALIAS)
    );
    this.draftFrameBuffer = this.readIniNumber(INI_FRAME_BUFFER, DEFAULT_FRAME_BUFFER) ? 1 : 0;
    this.draftVSync = this.readIniNumber(INI_VSYNC, DEFAULT_VSYNC) ? 1 : 0;
    this.draftSoftShadows = this.readIniNumber(INI_SOFT_SHADOWS, DEFAULT_SOFT_SHADOWS) ? 1 : 0;

    this.CB_FRAMEBUFF.setValue(!!this.draftFrameBuffer);
    this.CB_VSYNC.setValue(!!this.draftVSync);
    this.CB_SOFTSHADOWS.setValue(!!this.draftSoftShadows);

    this.updateTextureQualityLabel();
    this.updateAntiAliasLabel();
    this.updateAnisotropyLabel();
  }

  /** OnDefault / SetDefaultAdvancedGraphicsOptions. */
  resetToDefaults(){
    this.draftFrameBuffer = DEFAULT_FRAME_BUFFER;
    this.draftAnisotropy = DEFAULT_ANISOTROPY;
    this.draftTextureQuality = DEFAULT_TEXTURE_QUALITY;
    this.draftVSync = DEFAULT_VSYNC;
    this.draftAntiAlias = DEFAULT_ANTI_ALIAS;
    this.draftSoftShadows = DEFAULT_SOFT_SHADOWS;

    this.CB_FRAMEBUFF.setValue(!!this.draftFrameBuffer);
    this.CB_VSYNC.setValue(!!this.draftVSync);
    this.CB_SOFTSHADOWS.setValue(!!this.draftSoftShadows);

    this.updateTextureQualityLabel();
    this.updateAntiAliasLabel();
    this.updateAnisotropyLabel();
  }

  /** SetNewOptions + INI persistence on accept. */
  applyNewOptions(){
    const prevQuality = this.readIniNumber(INI_TEXTURE_QUALITY, DEFAULT_TEXTURE_QUALITY);
    const prevAnisotropy = this.normalizeAnisotropy(
      this.readIniNumber(INI_ANISOTROPY, DEFAULT_ANISOTROPY)
    );

    GameState.iniConfig.setProperty(INI_ANTI_ALIASING, this.draftAntiAlias);
    GameState.iniConfig.setProperty(INI_TEXTURE_QUALITY, this.draftTextureQuality);
    GameState.iniConfig.setProperty(INI_FRAME_BUFFER, this.draftFrameBuffer);
    GameState.iniConfig.setProperty(INI_ANISOTROPY, this.draftAnisotropy);
    GameState.iniConfig.setProperty(INI_VSYNC, this.draftVSync);
    GameState.iniConfig.setProperty(INI_SOFT_SHADOWS, this.draftSoftShadows);
    // SetNewOptions forces Shadows on when Soft Shadows is enabled.
    if(this.draftSoftShadows){
      GameState.iniConfig.setProperty(INI_SHADOWS, 1);
    }

    GameState.applyVSyncOption();

    if(this.draftAnisotropy != prevAnisotropy){
      TextureLoader.Anisotropy = this.draftAnisotropy;
      TextureLoader.onAnisotropyChanged();
    }

    if(this.draftTextureQuality != prevQuality){
      TextureLoaderState.TextureQuality = this.draftTextureQuality;
      ModuleLoadCoordinator.ReloadTextureCache();
    }

    GameState.lightManager?.applyVideoQualityLimits?.();
    GameState.odysseyShadowManager?.syncQualityFromLightManager?.();
    void GameState.iniConfig.save();

    // HandleInputEvent → SetUpOptions after pop.
    const parent = this.manager?.MenuGraphics;
    if(parent?.CB_SHADOWS){
      parent.CB_SHADOWS.setValue(GameState.iniConfig.getProperty(INI_SHADOWS) == 1);
    }
    if(parent?.CB_GRASS){
      parent.CB_GRASS.setValue(GameState.iniConfig.getProperty('Graphics Options.Grass') == 1);
    }
  }

  private commitAndClose(){
    this.discardChanges = false;
    this.close();
  }

  updateTextureQualityLabel() {
    const texPacks = GameState.TwoDAManager.datatables.get('texpacks');
    const quality = this.draftTextureQuality;
    const row = texPacks?.rows?.[quality];
    if(row){
      this.BTN_TEXQUAL.setText(GameState.TLKManager.GetStringById(row.strrefname)?.Value || '');
    }

    if(quality <= 0){
      this.BTN_TEXQUALLEFT.hide();
    }else{
      this.BTN_TEXQUALLEFT.show();
    }

    if(quality >= this.getMaxTextureQuality()){
      this.BTN_TEXQUALRIGHT.hide();
    }else{
      this.BTN_TEXQUALRIGHT.show();
    }
  }

  updateAntiAliasLabel(){
    const strRef = this.getAntiAliasLabelStrRef(this.draftAntiAlias);
    this.BTN_ANTIALIAS.setText(GameState.TLKManager.GetStringById(strRef)?.Value || '');

    if(this.draftAntiAlias <= 0){
      this.BTN_ANTIALIASLEFT.hide();
    }else{
      this.BTN_ANTIALIASLEFT.show();
    }

    const maxMode = this.getMaxAntiAliasMode();
    if(this.draftAntiAlias >= maxMode){
      this.BTN_ANTIALIASRIGHT.hide();
    }else{
      this.BTN_ANTIALIASRIGHT.show();
    }
  }

  updateAnisotropyLabel(){
    const strRef = this.getAnisotropyLabelStrRef(this.draftAnisotropy);
    this.BTN_ANISOTROPY.setText(GameState.TLKManager.GetStringById(strRef)?.Value || '');

    if(this.draftAnisotropy < 2){
      this.BTN_ANISOTROPYLEFT.hide();
    }else{
      this.BTN_ANISOTROPYLEFT.show();
    }

    const maxAniso = this.getMaxAnisotropy();
    if(this.draftAnisotropy >= maxAniso || this.draftAnisotropy >= 16){
      this.BTN_ANISOTROPYRIGHT.hide();
    }else{
      this.BTN_ANISOTROPYRIGHT.show();
    }
  }

  setDescription(strRef: number){
    this.LB_DESC.setItem(GameState.TLKManager.GetStringById(strRef)?.Value || '');
  }

  /** K1 description TLKs — TSL overrides these. */
  protected getDescAntiAlias(): number { return TLK_ANTI_ALIAS; }
  protected getDescTexQual(): number { return TLK_TEX_QUAL; }
  protected getDescAnisotropy(): number { return TLK_ANISOTROPY; }
  protected getDescFrameBuffer(): number { return TLK_FRAME_BUFFER; }
  protected getDescSoftShadows(): number { return TLK_SOFT_SHADOWS; }
  protected getDescVSync(): number { return TLK_VSYNC; }

  protected getAntiAliasLabelStrRef(mode: number): number {
    switch(mode){
      case 2: return TLK_AA_2X;
      case 4: return TLK_AA_4X;
      case 6: return TLK_AA_6X;
      case 8: return TLK_AA_8X;
      default: return TLK_AA_OFF;
    }
  }

  protected getAnisotropyLabelStrRef(level: number): number {
    switch(level){
      case 2: return TLK_ANISO_2X;
      case 4: return TLK_ANISO_4X;
      case 8: return TLK_ANISO_8X;
      case 16: return TLK_ANISO_16X;
      default: return TLK_ANISO_1X;
    }
  }

  /** OnAntiAliasLeft / OnAntiAliasRight — step through supported modes. */
  private stepAntiAlias(direction: -1 | 1){
    const available = this.getAvailableAntiAliasModes();
    if(!available.length){
      return;
    }
    let idx = available.indexOf(this.draftAntiAlias);
    if(idx < 0){
      idx = direction > 0 ? -1 : available.length;
    }
    const next = available[idx + direction];
    if(next == null){
      return;
    }
    this.draftAntiAlias = next;
    this.updateAntiAliasLabel();
  }

  private getAvailableAntiAliasModes(): number[] {
    // WebGL contexts are created once; expose the full ladder for INI
    // fidelity (gates each mode via AurQueryAntiAliasingMode).
    return AA_MODES.slice();
  }

  private getMaxAntiAliasMode(): number {
    const modes = this.getAvailableAntiAliasModes();
    return modes.length ? modes[modes.length - 1] : 0;
  }

  private getMaxTextureQuality(): number {
    const texPacks = GameState.TwoDAManager.datatables.get('texpacks');
    const count = texPacks?.RowCount | 0;
    return count > 0 ? count - 1 : 0;
  }

  private getMaxAnisotropy(): number {
    const caps = GameState.renderer?.capabilities?.getMaxAnisotropy?.();
    const max = Number(caps);
    if(Number.isFinite(max) && max >= 1){
      return Math.min(16, Math.floor(max));
    }
    return 16;
  }

  private normalizeAnisotropy(value: number): number {
    let level = Math.max(1, Math.floor(Number(value) || DEFAULT_ANISOTROPY));
    // Snap down to the nearest power of two (anisotropy ladder).
    let pow = 1;
    while(pow * 2 <= level && pow < 16){
      pow *= 2;
    }
    return Math.min(pow, this.getMaxAnisotropy());
  }

  private normalizeAntiAlias(value: number): number {
    const mode = Math.floor(Number(value) || 0);
    if(AA_MODES.indexOf(mode) >= 0){
      return mode;
    }
    return DEFAULT_ANTI_ALIAS;
  }

  private readIniNumber(key: string, fallback: number): number {
    const raw = Number(GameState.iniConfig.getProperty(key));
    return Number.isFinite(raw) ? raw : fallback;
  }

}
