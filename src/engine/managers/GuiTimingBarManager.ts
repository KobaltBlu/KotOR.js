import type { InGameOverlay } from "@engine/games/kotor/menu/InGameOverlay";
import type { ModuleObject } from "@engine/module/ModuleObject";

/**
 * GuiTimingBarManager — StartGuiTimingBar / StopGuiTimingBar host.
 *
 * : StartGuiTimingBar → SendServerToPlayerGuiTimingEvent
 * (duration ms + type byte); StopGuiTimingBar; client cancel → ClearAllActions
 * (HandlePlayerToServerInputCancelGuiTimingEvent).
 *
 * JS surfaces progress on InGameOverlay LBL_ACTIONDESC / LBL_ACTIONDESCBG fill scale
 * (no dedicated PB_TIMING control in the overlay GUI). Callers should only start for the
 * client-controlled creature (== 1).
 *
 * @file GuiTimingBarManager.ts
 */
export class GuiTimingBarManager {
  static active = false;
  static duration = 0;
  static elapsed = 0;
  static label = '';
  static cancelled = false;
  /** Object id of the creature that started the bar. */
  static ownerId = -1;
  /** Optional event type byte from StartGuiTimingBar (mines=1, lock=8). */
  static eventType = 0;
  static fillBaseScaleX = 1;
  static fillBaseScaleY = 1;
  static fillBasePosX = 0;
  static fillCaptured = false;

  /**
   * Start a timing bar.
   * @param durationSeconds Duration in seconds (sends ms; callers convert).
   * @param label Action description text.
   * @param owner Creature starting the bar (PC-only).
   * @param eventType Optional type byte.
   */
  static start(
    durationSeconds: number,
    label: string = '',
    owner?: ModuleObject,
    eventType: number = 1
  ){
    this.active = true;
    this.cancelled = false;
    this.duration = Math.max(0.05, durationSeconds || 0);
    this.elapsed = 0;
    this.label = label || '';
    this.ownerId = owner?.id ?? -1;
    this.eventType = eventType | 0;
    this.fillCaptured = false;
  }

  /** StartGuiTimingBar duration is milliseconds. */
  static startMs(
    durationMs: number,
    label: string = '',
    owner?: ModuleObject,
    eventType: number = 1
  ){
    this.start((durationMs || 0) / 1000, label, owner, eventType);
  }

  static stop(){
    this.active = false;
    this.elapsed = 0;
    this.duration = 0;
    this.label = '';
    this.ownerId = -1;
    this.eventType = 0;
  }

  /** Stop only if the bar belongs to this owner (or owner omitted). */
  static stopFor(owner?: ModuleObject){
    if(!this.active) return;
    if(owner && this.ownerId >= 0 && owner.id !== this.ownerId) return;
    this.stop();
  }

  static cancel(){
    this.cancelled = true;
    this.stop();
  }

  /** Cancel when the owning creature clears actions (player interrupt). */
  static cancelFor(owner?: ModuleObject){
    if(!this.active) return;
    if(owner && this.ownerId >= 0 && owner.id !== this.ownerId) return;
    this.cancel();
  }

  static isActive(){
    return this.active;
  }

  static isActiveFor(owner?: ModuleObject){
    if(!this.active) return false;
    if(!owner) return true;
    return this.ownerId < 0 || owner.id === this.ownerId;
  }

  static wasCancelled(){
    return this.cancelled;
  }

  static getProgress(): number {
    if(!this.active || this.duration <= 0) return 0;
    return Math.min(1, this.elapsed / this.duration);
  }

  static update(delta: number = 0, overlay?: InGameOverlay){
    if(!this.active) return;
    this.elapsed += delta;
    const progress = this.getProgress();

    // if(overlay?.LBL_ACTIONDESC){
    // const remaining = Math.max(0, this.duration - this.elapsed);
    // const pct = Math.floor(progress * 100);
    // const text = this.label
    // ? `${this.label} (${pct}%)`
    //: `${remaining.toFixed(1)}s`;
    // overlay.LBL_ACTIONDESC.setText(text);
    // overlay.LBL_ACTIONDESC.show;
    // overlay.LBL_ACTIONDESCBG?.show;
    // this.applyFillProgress(overlay, progress);
    // }

    if(this.elapsed >= this.duration){
      this.restoreFill(overlay);
      this.stop();
    }
  }

  /** Reset ACTIONDESCBG fill after the bar ends (called from overlay when inactive). */
  static restoreOverlay(overlay?: InGameOverlay){
    this.restoreFill(overlay);
  }

  private static applyFillProgress(overlay: InGameOverlay, progress: number){
    const bg = overlay.LBL_ACTIONDESCBG;
    if(!bg?.getFill) return;
    const fill = bg.getFill();
    if(!fill) return;

    if(!this.fillCaptured){
      this.fillBaseScaleX = fill.scale.x || 1;
      this.fillBaseScaleY = fill.scale.y || 1;
      this.fillBasePosX = fill.position.x;
      this.fillCaptured = true;
    }

    const extent = bg.getFillExtent?.();
    const fullWidth = extent?.width > 0 ? extent.width : this.fillBaseScaleX;
    const height = extent?.height > 0 ? extent.height : this.fillBaseScaleY;
    const value = Math.max(0.001, progress);
    fill.scale.set(fullWidth * value, height, 1);
    // Grow left → right (STARTFROMLEFT-style).
    fill.position.x = this.fillBasePosX - (fullWidth - fullWidth * value) / 2;
  }

  private static restoreFill(overlay?: InGameOverlay){
    if(!this.fillCaptured || !overlay?.LBL_ACTIONDESCBG?.getFill) return;
    const fill = overlay.LBL_ACTIONDESCBG.getFill();
    if(!fill) return;
    fill.scale.set(this.fillBaseScaleX, this.fillBaseScaleY, 1);
    fill.position.x = this.fillBasePosX;
    this.fillCaptured = false;
  }
}
