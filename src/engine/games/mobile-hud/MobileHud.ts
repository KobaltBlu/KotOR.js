import { GameState } from "@engine/runtime/GameState";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { EngineState } from "@engine/enums/engine/EngineState";
import { AutoPauseState } from "@engine/enums/engine/AutoPauseState";
import { Anchor } from "@core/enums/gui/Anchor";
import { GUIControlType } from "@core/enums/gui/GUIControlType";
import { GUIControlAlignment } from "@core/enums/gui/GUIControlAlignment";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { GUIButton, createGuiControlStruct, commitGuiTransform, isTslGuiGame } from "@engine/gui";
import type { GUIControl, GameMenu } from "@engine/gui";
import { TextureLoader } from "@engine/loaders";
import { SaveGame } from "@engine/save/SaveGame";
import { hudArt, type HudArtKind, type HudTint } from "@engine/games/mobile-hud/mobile-hud-art";
import {
  combatCluster,
  hudScale,
  leftBlock,
  partyAnchor,
  placeCluster,
  popupLayout,
  popupRowText,
  selfSlotStrip,
  targetStrip,
  topRightButtons,
  HUD_MAP_GROW,
  HUD_PARTY_GROW,
  HUD_MARGIN,
  type HudRect,
} from "@engine/games/mobile-hud/mobile-hud-layout";
import { touchHudWanted } from "@engine/games/mobile-hud/touch-hud-setting";

/** IDs for controls the HUD adds; they set draw order, so they sit above the layout's own. */
const ID_EXTRAS = 400;
const ID_POPUP = 600;

const FONT_ROW = 'dialogfont16x16';

const MENU_BAR = ['BTN_MSG', 'BTN_JOU', 'BTN_MAP', 'BTN_OPT', 'BTN_CHAR', 'BTN_ABI', 'BTN_INV', 'LBL_MENUBG'];
const ALWAYS_HIDDEN = [
  ...MENU_BAR, 'LBL_MOULDING2', 'LBL_MOULDING3', 'LBL_ARROW_MARGIN',
];
const COMBAT_NAMES = [
  'LBL_COMBATBG1', 'LBL_COMBATBG2', 'LBL_COMBATBG3', 'LBL_QUEUE0', 'LBL_QUEUE1', 'LBL_QUEUE2', 'LBL_QUEUE3',
  'BTN_CLEARALL', 'BTN_CLEARONE', 'BTN_CLEARONE2',
];
/** Desktop scroll slot: a box with arrow bands at the top and bottom. */
const SLOT_ART = 'lbl_miscroll_f';
/** Desktop scroll arrow (points up) and its hover look. */
const ARROW_ART = 'lbl_miarr_1';
const ARROW_ART_LIT = 'lbl_miarr_2';
const PARTY_PREFIXES = [
  'LBL_BACK', 'LBL_CHAR', 'BTN_CHAR', 'PB_VIT', 'PB_FORCE', 'LBL_DISABLE', 'LBL_DEBILATATED',
  'LBL_LVLUPBG', 'LBL_LEVELUP', 'LBL_CMBTEFCTRED', 'LBL_CMBTEFCTINC',
];
const MAP_NAMES = ['LBL_MAPBORDER', 'LBL_MAPVIEW', 'BTN_MINIMAP'];
const NOTICE_NAMES = ['LBL_JOURNAL', 'LBL_CASH', 'LBL_PLOTXP', 'LBL_STEALTHXP', 'LBL_ITEMRCVD', 'LBL_ITEMLOST', 'LBL_LIGHTSHIFT', 'LBL_DARKSHIFT'];

/** Kept short enough for one line of the list on a phone. */
const HELP_LINES = [
  'Tap: select. Tap again: use.',
  'Drag up or down: walk, run.',
  'Drag sideways: turn camera.',
  'Arrow tab: pick from a list.',
  'Pause: stop time, plan moves.',
  'Gear: game menus.',
  'Save: quick save.',
];

type Saved = {
  left: number; top: number; width: number; height: number;
  anchor: Anchor; scale: boolean;
  fill?: string; hiFill?: string;
};

type PopupKind = 'self' | 'target' | 'help';

type PopupEntry = { text: string; icon?: string; enabled: boolean; id?: number; index: number };

type Host = GameMenu & { [name: string]: any };

/**
 * GUI control for the HUD's own pieces. Its text draws just above its own
 * fill instead of the layout-wide text layer, so list rows read over the
 * panel behind them.
 */
class HudControl extends GUIButton {
  /** Drawn-only control that shows and hides with this one. */
  companion?: GUIControl;

  textOrder(){ return (this.id | 0) + 1; }

  show(){
    super.show();
    this.companion?.show();
  }

  hide(){
    super.hide();
    this.companion?.hide();
  }

  onHoverIn(){
    super.onHoverIn();
    if(this.companion) void this.companion.setFillTextureName(ARROW_ART_LIT, false);
  }

  onHoverOut(){
    super.onHoverOut();
    if(this.companion) void this.companion.setFillTextureName(ARROW_ART, false);
  }

  refreshRenderOrder(){
    super.refreshRenderOrder();
    if(this.text?.mesh) this.text.mesh.renderOrder = this.getRenderOrder(this.textOrder());
  }

  onFontTextureLoaded(){
    super.onFontTextureLoaded();
    if(this.text?.mesh) this.text.mesh.renderOrder = this.getRenderOrder(this.textOrder());
  }

  setText(str: any = '', _renderOrder = 5){
    super.setText(str, this.textOrder());
  }
}

/**
 * Touch layout for the in-game HUD, modelled on the phone and tablet
 * releases: big pause, party and slot buttons at the screen corners, the
 * target panel fixed at the top centre, and a tap-to-open list for each
 * action slot instead of the small up/down arrows.
 *
 * It rearranges the overlay's own controls and adds a few of its own, all
 * drawn by the GUI in the game canvas. Turning it off puts every moved
 * control back where the layout file had it.
 *
 * @file MobileHud.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MobileHud {
  host: Host;
  active = false;

  #saved = new Map<GUIControl, Saved>();
  #built = false;
  #layoutKey = '';
  #nextId = ID_EXTRAS;
  #nextPopupId = ID_POPUP;

  // Added controls.
  leftBacking: HudControl;
  rings: HudControl[] = [];
  saveButton: HudControl;
  helpButton: HudControl;
  selfTabs: HudControl[] = [];
  targetTabs: HudControl[] = [];

  popupBlocker: HudControl;
  popupPanel: HudControl;
  popupClose: HudControl;
  popupCloseIcon: HudControl;
  popupRows: HudControl[] = [];
  popupIcons: HudControl[] = [];
  popupLabels: HudControl[] = [];

  popupOpen = false;
  popupKind: PopupKind = 'self';
  popupSlot = -1;
  popupEntries: PopupEntry[] = [];
  /** Whether opening the list paused the game (so closing it should resume). */
  pausedForPopup = false;

  constructor(host: Host){
    this.host = host;
  }

  get tint(): HudTint {
    return GameState.GameKey === GameEngineType.TSL
      ? { r: 0.102, g: 0.698, b: 0.549 }
      : { r: 0.0, g: 0.659, b: 0.98 };
  }

  ctl(name: string): GUIControl | undefined {
    return this.host.getControlByName?.(name) as GUIControl | undefined;
  }

  get selfCount(): number { return GameState.ActionMenuManager?.SELF_MENU_COUNT ?? 4; }
  get targetCount(): number { return GameState.ActionMenuManager?.TARGET_MENU_COUNT ?? 3; }

  /** Turn the layout on or off to match the setting. Call once per frame before the overlay update. */
  sync(){
    if(!this.host.tGuiPanel) return;
    const want = touchHudWanted();
    if(want && !this.active) this.activate();
    else if(!want && this.active) this.deactivate();
    if(this.active) this.relayout();
  }

  activate(){
    this.ensureBuilt();
    this.active = true;
    this.#layoutKey = '';
    this.relayout();
  }

  deactivate(){
    this.closePopup();
    this.active = false;
    this.#layoutKey = '';
    for(const [control, s] of this.#saved){
      control.anchor = s.anchor;
      control.scale = s.scale;
      control.extent.left = s.left;
      control.extent.top = s.top;
      const resized = control.extent.width !== s.width || control.extent.height !== s.height;
      control.extent.width = s.width;
      control.extent.height = s.height;
      if(resized) this.resize(control);
      if(s.fill !== undefined) this.restoreFill(control, s);
    }
    this.#saved.clear();
    this.host.recalculatePosition?.();
    const map = this.host.miniMap;
    const view = this.ctl('LBL_MAPVIEW');
    if(map && view) map.setSize(view.extent.width, view.extent.height);
    for(const c of this.extras()) c.hide();
    for(const name of [...MENU_BAR, 'LBL_MOULDING1', 'LBL_MOULDING2', 'LBL_MOULDING3']) this.ctl(name)?.show();
  }

  extras(): HudControl[] {
    return [this.leftBacking, ...this.rings, this.saveButton, this.helpButton, ...this.selfTabs, ...this.targetTabs].filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Building controls
  // ---------------------------------------------------------------------------

  makeControl(tag: string, id: number, opts: { font?: string; text?: string; alignment?: number } = {}): HudControl {
    const panel = this.host.tGuiPanel;
    const tsl = isTslGuiGame(GameState.GameKey);
    const struct = createGuiControlStruct({
      type: GUIControlType.Button,
      tag,
      id,
      parentTag: panel.name,
      parentId: panel.id,
      left: 0, top: 0, width: 8, height: 8,
      includeInnerOffsetY: tsl,
      includeTypeNests: false,
    });
    const text = struct.getFieldByLabel('TEXT')?.getChildStructs()?.[0];
    text?.getFieldByLabel('FONT')?.setValue(opts.font ?? '');
    text?.getFieldByLabel('TEXT')?.setValue(opts.text ?? '');
    if(typeof opts.alignment === 'number') text?.getFieldByLabel('ALIGNMENT')?.setValue(opts.alignment);

    const control = new HudControl(this.host, struct, panel, panel.scale);
    control.zIndex = panel.zIndex + 1;
    panel.children.push(control);
    const widget = control.createControl();
    widget.position.z = control.zIndex;
    commitGuiTransform(widget);
    panel.widget.add(widget);
    control.setTextColor(control.defaultColor.r, control.defaultColor.g, control.defaultColor.b);
    control.setFillColor(1, 1, 1);
    control.refreshRenderOrder();
    control.anchor = Anchor.User;
    control.hide();
    return control;
  }

  setArt(control: GUIControl | undefined, kind: HudArtKind){
    if(!control) return;
    const base = hudArt(kind, this.tint, false);
    const lit = hudArt(kind, this.tint, true);
    if(!base) return;
    control.border.fill.texture = `mobilehud_${kind}`;
    control.setFillTexture(base);
    if(lit){
      control.highlight.fill.texture = `mobilehud_${kind}_lit`;
      control.setHighlightFillTexture(lit);
    }
    control.setFillColor(1, 1, 1);
    control.setFillOpaque(false);
  }

  ensureBuilt(){
    if(this.#built) return;
    this.#built = true;
    this.#nextId = ID_EXTRAS;

    this.leftBacking = this.makeControl('MHUD_LEFTBACK', this.#nextId++);
    this.setArt(this.leftBacking, 'backing');
    this.leftBacking.disableHover = true;
    for(let i = 0; i < 3; i++){
      const ring = this.makeControl('MHUD_RING' + i, this.#nextId++);
      this.setArt(ring, 'ring');
      ring.disableHover = true;
      this.rings.push(ring);
    }

    this.saveButton = this.makeControl('MHUD_SAVE', this.#nextId++);
    this.setArt(this.saveButton, 'save');
    this.saveButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if(GameState.Mode !== EngineMode.INGAME) return;
      void SaveGame.QuickSave();
    });

    this.helpButton = this.makeControl('MHUD_HELP', this.#nextId++);
    this.setArt(this.helpButton, 'help');
    this.helpButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openHelp();
    });

    for(let i = 0; i < this.selfCount; i++){
      const tab = this.makeTab('MHUD_SELFTAB' + i, true);
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSlot('self', i);
      });
      this.selfTabs.push(tab);
    }
    for(let i = 0; i < this.targetCount; i++){
      const tab = this.makeTab('MHUD_TARGETTAB' + i, false);
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSlot('target', i);
      });
      this.targetTabs.push(tab);
    }

    // The list goes last so it is the topmost thing under a tap.
    this.#nextPopupId = ID_POPUP;
    this.popupBlocker = this.makeControl('MHUD_POPUP_BLOCK', this.#nextPopupId++);
    // Must stay hoverable: a control that cannot take hover cannot take a tap either.
    this.popupBlocker.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopup();
    });
    this.popupPanel = this.makeControl('MHUD_POPUP_PANEL', this.#nextPopupId++);
    this.setArt(this.popupPanel, 'panel');
    // Taps on the panel's empty space do nothing.
    this.popupPanel.addEventListener('click', (e) => { e.stopPropagation(); });
    this.popupClose = this.makeControl('MHUD_POPUP_CLOSE', this.#nextPopupId++);
    this.setArt(this.popupClose, 'button');
    this.popupClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopup();
    });
    this.popupCloseIcon = this.makeControl('MHUD_POPUP_CLOSEX', this.#nextPopupId++);
    this.setArt(this.popupCloseIcon, 'close');
    this.popupCloseIcon.disableHover = true;
  }

  /**
   * Expand tab: an invisible touch area over the slot's arrow band, reaching
   * a little past the slot's edge, with the desktop scroll arrow drawn on
   * the band. The arrow has no tap of its own; the tab above it takes it.
   */
  makeTab(tag: string, pointsUp: boolean): HudControl {
    const arrow = this.makeControl(tag + '_ARROW', this.#nextId++);
    arrow.disableHover = true;
    void arrow.setFillTextureName(ARROW_ART, false);
    if(!pointsUp) arrow.flipY(true);
    const tab = this.makeControl(tag, this.#nextId++);
    tab.companion = arrow;
    return tab;
  }

  /** Swap a moved control's fill to desktop art by name. */
  setGameArt(control: GUIControl | undefined, fill: string, lit: string){
    if(!control) return;
    this.rememberFill(control);
    if(control.getFillTextureName() !== fill) void control.setFillTextureName(fill, false);
    if(control.highlight.fill.texture !== lit){
      control.highlight.fill.texture = lit;
      void TextureLoader.Load(lit).then((tex) => { if(tex) control.setHighlightFillTexture(tex); });
    }
  }

  /** One more list row (row button + icon), made the first time a list needs it. */
  ensurePopupRows(count: number){
    while(this.popupRows.length < count){
      const index = this.popupRows.length;
      const row = this.makeControl('MHUD_POPUP_ROW' + index, this.#nextPopupId++);
      this.setArt(row, 'row');
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        this.chooseRow(index);
      });
      const icon = this.makeControl('MHUD_POPUP_ICON' + index, this.#nextPopupId++);
      icon.disableHover = true;
      const label = this.makeControl('MHUD_POPUP_TEXT' + index, this.#nextPopupId++, {
        font: FONT_ROW,
        alignment: GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalCenter,
      });
      label.disableHover = true;
      this.popupRows.push(row);
      this.popupIcons.push(icon);
      this.popupLabels.push(label);
    }
  }

  // ---------------------------------------------------------------------------
  // Placement
  // ---------------------------------------------------------------------------

  remember(control: GUIControl){
    if(this.#saved.has(control)) return;
    const e = control.extent;
    const s: Saved = { left: e.left, top: e.top, width: e.width, height: e.height, anchor: control.anchor, scale: control.scale };
    this.#saved.set(control, s);
  }

  rememberFill(control: GUIControl){
    this.remember(control);
    const s = this.#saved.get(control)!;
    if(s.fill === undefined){
      s.fill = control.getFillTextureName() || '';
      s.hiFill = control.highlight?.fill?.texture || '';
    }
  }

  restoreFill(control: GUIControl, s: Saved){
    if(s.fill){
      void control.setFillTextureName(s.fill, !s.hiFill);
    }else{
      control.clearFillTexture();
    }
    if(s.hiFill && s.hiFill !== s.fill){
      control.highlight.fill.texture = s.hiFill;
      void TextureLoader.Load(s.hiFill).then((tex) => { if(tex) control.setHighlightFillTexture(tex); });
    }
  }

  resize(control: GUIControl){
    control.resizeControl();
    if(control.text?.geometry){
      control.updateTextGeometry(control.text.text);
    }
  }

  /** Put a control at a viewport-pixel rect. */
  place(control: GUIControl | undefined, r: HudRect | undefined){
    if(!control || !r) return;
    if(!(control instanceof HudControl)) this.remember(control);
    control.anchor = Anchor.User;
    const e = control.extent;
    const resized = e.width !== r.width || e.height !== r.height;
    e.left = r.left;
    e.top = r.top;
    e.width = r.width;
    e.height = r.height;
    if(resized) this.resize(control);
    control.recalculate();
  }

  originalRect(name: string): HudRect | undefined {
    const c = this.ctl(name);
    if(!c) return undefined;
    const s = this.#saved.get(c);
    const e = s ?? c.extent;
    return { left: e.left, top: e.top, width: e.width, height: e.height };
  }

  /** Lay everything out again when the viewport size changed. */
  relayout(force = false){
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const vpH = GameState.ResolutionManager.getViewportHeight();
    const key = `${vpW}x${vpH}`;
    if(!force && key === this.#layoutKey) return;
    // Capture every original before anything moves.
    this.captureOriginals();
    this.#layoutKey = key;
    const S = hudScale(vpW, vpH);

    // Bottom-left: pause over party mode and stealth.
    const left = leftBlock(vpH, S);
    this.place(this.leftBacking, left.backing);
    this.leftBacking.show();
    this.ctl('LBL_MOULDING1')?.hide();
    this.place(this.ctl('TB_PAUSE'), left.pauseIcon);
    this.place(this.ctl('TB_SOLO'), left.soloIcon);
    this.place(this.ctl('TB_STEALTH'), left.stealthIcon);
    [left.pause, left.solo, left.stealth].forEach((r, i) => {
      this.place(this.rings[i], r);
      this.rings[i].show();
    });

    // Party portraits, grown, to the right of that block.
    const party: Record<string, HudRect | undefined> = {};
    for(let n = 1; n <= 3; n++){
      for(const p of PARTY_PREFIXES) party[p + n] = this.originalRect(p + n);
    }
    const anchor = partyAnchor(vpH, S);
    const partyRects = placeCluster(party, HUD_PARTY_GROW, S, { left: anchor.left, bottom: anchor.bottom });
    for(const [name, r] of Object.entries(partyRects)) this.place(this.ctl(name), r);

    // Top-left: minimap, with the notification icons beside it.
    const map: Record<string, HudRect | undefined> = {};
    for(const n of MAP_NAMES) map[n] = this.originalRect(n);
    const mapRects = placeCluster(map, HUD_MAP_GROW, S, { left: HUD_MARGIN * S * 0.5, top: HUD_MARGIN * S * 0.5 });
    for(const [name, r] of Object.entries(mapRects)) this.place(this.ctl(name), r);
    const view = mapRects['LBL_MAPVIEW'];
    if(view) this.host.miniMap?.setSize(view.width, view.height);
    const mapRight = Math.max(...Object.values(mapRects).map((r) => r.left + r.width), 0);
    const notices: Record<string, HudRect | undefined> = {};
    for(const n of NOTICE_NAMES) notices[n] = this.originalRect(n);
    const noticeRects = placeCluster(notices, 1.2, S, { left: mapRight + HUD_MARGIN * S, top: HUD_MARGIN * S });
    for(const [name, r] of Object.entries(noticeRects)) this.place(this.ctl(name), r);

    // Top-right: save, help, and the gear that opens the game menus.
    const tr = topRightButtons(vpW, S);
    const gear = this.ctl('BTN_EQU');
    if(gear){
      this.rememberFill(gear);
      this.setArt(gear, 'gear');
      this.place(gear, tr.gear);
    }
    this.place(this.helpButton, tr.help);
    this.place(this.saveButton, tr.save);
    this.helpButton.show();
    this.saveButton.show();

    // Bottom-right: personal slots with expand tabs.
    const self = selfSlotStrip(vpW, vpH, S, this.selfCount);
    for(let i = 0; i < this.selfCount; i++){
      const frame = this.ctl('BTN_ACTION' + i);
      this.setGameArt(frame, SLOT_ART, SLOT_ART);
      this.place(frame, self.slots[i]);
      this.place(this.ctl('LBL_ACTION' + i), self.icons[i]);
      this.place(this.selfTabs[i], self.tabs[i]);
      this.place(this.selfTabs[i]?.companion, self.arrows[i]);
    }
    const tabTop = self.tabs[0]?.top ?? self.span.top;
    const desc = { left: self.span.left, top: tabTop - 30 * S, width: self.span.width, height: 26 * S };
    this.place(this.ctl('LBL_ACTIONDESCBG'), desc);
    this.place(this.ctl('LBL_ACTIONDESC'), desc);

    // Top centre: target name, health and slots.
    const target = targetStrip(vpW, S, this.targetCount);
    this.place(this.ctl('LBL_NAME'), target.name);
    this.place(this.ctl('LBL_NAMEBG'), target.name);
    this.place(this.ctl('PB_HEALTH'), target.health);
    this.place(this.ctl('LBL_HEALTHBG'), target.health);
    for(let i = 0; i < this.targetCount; i++){
      const frame = this.ctl('BTN_TARGET' + i);
      this.setGameArt(frame, SLOT_ART, SLOT_ART);
      this.place(frame, target.slots[i]);
      this.place(this.ctl('LBL_TARGET' + i), target.icons[i]);
      this.place(this.targetTabs[i], target.tabs[i]);
      this.place(this.targetTabs[i]?.companion, target.arrows[i]);
    }

    // Bottom centre: the desktop action queue and Disengage, grown.
    const combat: Record<string, HudRect | undefined> = {};
    for(const n of COMBAT_NAMES) combat[n] = this.originalRect(n);
    for(const [name, r] of Object.entries(combatCluster(combat, vpW, vpH, S))) this.place(this.ctl(name), r);

    if(this.popupOpen) this.layoutPopup();
  }

  /** Remember the layout-file rect of every control the HUD may move. */
  captureOriginals(){
    const names = [
      'TB_PAUSE', 'TB_SOLO', 'TB_STEALTH', 'LBL_MOULDING1', 'BTN_EQU',
      ...MAP_NAMES, ...NOTICE_NAMES,
      'LBL_ACTIONDESC', 'LBL_ACTIONDESCBG', 'LBL_NAME', 'LBL_NAMEBG', 'PB_HEALTH', 'LBL_HEALTHBG',
      ...COMBAT_NAMES,
    ];
    for(let n = 1; n <= 3; n++) for(const p of PARTY_PREFIXES) names.push(p + n);
    for(let i = 0; i < this.selfCount; i++) names.push('BTN_ACTION' + i, 'LBL_ACTION' + i);
    for(let i = 0; i < this.targetCount; i++) names.push('BTN_TARGET' + i, 'LBL_TARGET' + i);
    for(const name of names){
      const c = this.ctl(name);
      if(c) this.remember(c);
    }
  }

  // ---------------------------------------------------------------------------
  // Per frame
  // ---------------------------------------------------------------------------

  /**
   * Target panel for the touch layout: everything stays at its fixed spot;
   * only visibility and icons change. Returns after the overlay has set the
   * name and health.
   */
  updateTargetPanel(hasActions: boolean){
    const host = this.host;
    host.LBL_NAME?.show();
    host.LBL_NAMEBG?.show();
    host.PB_HEALTH?.show();
    host.LBL_HEALTHBG?.show();
    const panels = GameState.ActionMenuManager.ActionPanels.targetPanels;
    for(let i = 0; i < this.targetCount; i++){
      const btn = this.ctl('BTN_TARGET' + i);
      const lbl = this.ctl('LBL_TARGET' + i);
      this.ctl('BTN_TARGETUP' + i)?.hide();
      this.ctl('BTN_TARGETDOWN' + i)?.hide();
      if(hasActions){
        host.UpdateTargetUIIcon(i);
        btn?.show();
        lbl?.show();
        if((panels[i]?.actions.length ?? 0) > 1) this.targetTabs[i]?.show();
        else this.targetTabs[i]?.hide();
      }else{
        btn?.hide();
        lbl?.hide();
        this.targetTabs[i]?.hide();
      }
    }
  }

  hideTargetPanel(){
    for(const tab of this.targetTabs) tab.hide();
  }

  /** After the overlay's own update: hide what the touch layout drops and track the tabs. */
  afterUpdate(){
    for(const name of ALWAYS_HIDDEN) this.ctl(name)?.hide();
    this.ctl('LBL_MOULDING1')?.hide();
    const panels = GameState.ActionMenuManager?.ActionPanels?.selfPanels ?? [];
    for(let i = 0; i < this.selfCount; i++){
      this.ctl('BTN_ACTIONUP' + i)?.hide();
      this.ctl('BTN_ACTIONDOWN' + i)?.hide();
      const tab = this.selfTabs[i];
      if(!tab) continue;
      if((panels[i]?.actions.length ?? 0) > 1) tab.show();
      else tab.hide();
    }
    if(!this.host._canShowTargetUI?.()) this.hideTargetPanel();
    const inGame = GameState.Mode === EngineMode.INGAME;
    if(this.popupOpen && !inGame) this.closePopup();
    if(this.popupOpen) this.refreshPopupState();
  }

  // ---------------------------------------------------------------------------
  // Action list
  // ---------------------------------------------------------------------------

  entriesFor(kind: PopupKind, slot: number): PopupEntry[] {
    const panels = GameState.ActionMenuManager?.ActionPanels;
    const panel = kind === 'self' ? panels?.selfPanels?.[slot] : panels?.targetPanels?.[slot];
    if(!panel) return [];
    return panel.actions.map((a: any, index: number) => ({
      text: popupRowText(a?.name || '', a?.stackSize),
      icon: a?.icon || undefined,
      enabled: a?.enabled !== false,
      id: typeof a?.id === 'number' ? a.id : undefined,
      index,
    }));
  }

  openSlot(kind: 'self' | 'target', slot: number){
    const entries = this.entriesFor(kind, slot);
    if(!entries.length) return;
    this.popupKind = kind;
    this.popupSlot = slot;
    this.popupEntries = entries.slice(0, 32);
    this.showPopup();
  }

  openHelp(){
    this.popupKind = 'help';
    this.popupSlot = -1;
    this.popupEntries = HELP_LINES.map((text, index) => ({ text, enabled: true, index }));
    this.showPopup();
  }

  showPopup(){
    this.ensurePopupRows(this.popupEntries.length);
    if(!this.popupOpen && GameState.State !== EngineState.PAUSED){
      // Paused without the pause banner; the list covers that part of the screen.
      GameState.AutoPauseManager.SetPausedByCombat(true, AutoPauseState.Generic);
      this.pausedForPopup = true;
    }
    this.popupOpen = true;
    this.layoutPopup();
    GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
  }

  layoutPopup(){
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const vpH = GameState.ResolutionManager.getViewportHeight();
    const S = hudScale(vpW, vpH);
    const L = popupLayout(vpW, vpH, S, this.popupEntries.length);
    this.place(this.popupBlocker, L.blocker);
    this.place(this.popupPanel, L.panel);
    this.place(this.popupClose, L.close);
    const x = Math.min(L.close.width, L.close.height);
    this.place(this.popupCloseIcon, { left: L.close.left + (L.close.width - x) / 2, top: L.close.top, width: x, height: x });
    this.popupBlocker.show();
    this.popupPanel.show();
    this.popupClose.show();
    this.popupCloseIcon.show();

    for(let i = 0; i < this.popupRows.length; i++){
      const row = this.popupRows[i];
      const icon = this.popupIcons[i];
      const label = this.popupLabels[i];
      const entry = this.popupEntries[i];
      if(!entry || !L.rows[i]){
        row.hide();
        icon.hide();
        label.hide();
        continue;
      }
      const help = this.popupKind === 'help';
      this.place(row, L.rows[i]);
      row.disableHover = help;
      row.show();
      this.place(label, help ? { ...L.labels[i], width: L.rows[i].width - (L.labels[i].left - L.rows[i].left) * 2 } : L.labels[i]);
      label.setText(entry.text);
      label.show();
      if(entry.icon && !help){
        this.place(icon, L.icons[i]);
        if(icon.getFillTextureName() !== entry.icon){
          void icon.setFillTextureName(entry.icon, false, { transparent: true });
        }
        icon.show();
      }else{
        icon.hide();
      }
    }
    this.refreshPopupState();
  }

  /** Dim entries that cannot be used right now. */
  refreshPopupState(){
    for(let i = 0; i < this.popupEntries.length && i < this.popupIcons.length; i++){
      const icon = this.popupIcons[i];
      const lit = this.popupEntries[i].enabled;
      icon.setFillColor(lit ? 1 : 0.45, lit ? 1 : 0.45, lit ? 1 : 0.45);
      const label = this.popupLabels[i];
      const c = label?.defaultColor;
      if(c) label.setTextColor(lit ? c.r : c.r * 0.55, lit ? c.g : c.g * 0.55, lit ? c.b : c.b * 0.55);
    }
  }

  closePopup(){
    if(!this.popupOpen) return;
    this.popupOpen = false;
    this.popupBlocker?.hide();
    this.popupPanel?.hide();
    this.popupClose?.hide();
    this.popupCloseIcon?.hide();
    for(const c of this.popupRows) c.hide();
    for(const c of this.popupIcons) c.hide();
    for(const c of this.popupLabels) c.hide();
    if(this.pausedForPopup){
      this.pausedForPopup = false;
      if(GameState.State === EngineState.PAUSED){
        GameState.AutoPauseManager.SetPausedByCombat(false);
      }
    }
  }

  /** Tapping an entry picks it for the slot and uses it straight away. */
  chooseRow(row: number){
    const entry = this.popupEntries[row];
    const kind = this.popupKind;
    const slot = this.popupSlot;
    if(kind === 'help' || !entry) return;
    this.closePopup();
    const manager = GameState.ActionMenuManager;
    if(kind === 'self'){
      const panel = manager.ActionPanels.selfPanels[slot];
      if(!panel) return;
      if(typeof entry.id === 'number') panel.selectId(entry.id);
      else panel.selectedIndex = entry.index;
      this.host.UpdateSelfUIIcon?.(slot);
      manager.onSelfMenuAction(slot);
    }else{
      const panel = manager.ActionPanels.targetPanels[slot];
      if(!panel) return;
      panel.selectedIndex = Math.min(entry.index, Math.max(0, panel.actions.length - 1));
      this.host.UpdateTargetUIIcon?.(slot);
      manager.onTargetMenuAction(slot);
    }
  }
}
