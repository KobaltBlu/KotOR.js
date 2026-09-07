import { GameState } from "@/GameState";
import type { SWPriorityGroup } from "@/engine/rules/SWPriorityGroup";

export interface AudioPriorityAcquireOptions {
  /** Opaque owner (AudioEmitter, AmbientAudioEmitter, etc.). */
  owner: object;
  /** prioritygroups.2da row index. */
  groupId: number;
  /** Squared distance to listener (reserved; same-group preempt is list-order). */
  distanceSq?: number;
  /**
   * GetFree3DVoice vs GetFree2DVoice pool selection.
   * Positional emitters → true; globals / streaming → false.
   */
  is3D?: boolean;
  /** Called when this voice is stolen to make room for a new request. */
  onStolen: () => void;
}

export interface AudioPriorityAcquireResult {
  allowed: boolean;
  voiceId?: number;
}

export interface AudioPriorityVoice {
  id: number;
  owner: object;
  groupId: number;
  startTime: number;
  distanceSq: number;
  is3D: boolean;
  onStolen: () => void;
}

/**
 * Soft DIG mixer channel total (_AIL_set_preference(3, 0x40) → 64).
 * Split evenly across GetFree2DVoice / GetFree3DVoice pools.
 */
export const SOFT_GLOBAL_VOICE_BUDGET = 64;
export const SOFT_2D_VOICE_BUDGET = 32;
export const SOFT_3D_VOICE_BUDGET = 32;

/**
 * prioritygroups.2da voice allocator.
 *
 * Behavior:
 * - LoadPriorityGroups — 2DA → priority group table
 * - Play — if count >= maxplaying: interrupt==0 deny, else InterruptPlayingSound
 * - InterruptPlayingSound — shut down first same-group voice in playing list
 * (AddToPlayingList uses AddHead → first = newest)
 * - AddToPlayingList / RemoveFromPlayingList — group count ±1
 * - GetFree2DVoice / GetFree3DVoice — Miles HW slot steal by
 * priority rank (lower better); soft-budgeted here via separate 2D/3D pools
 * - GetPriorityGroup — invalid id clamps to row 0x17 (DEFAULT)
 *
 * Volume: source copies group volume byte at construct; emitters multiply
 * emitterVolume/127 * groupVolume/127 (and ambient scale for SFX).
 */
export class AudioPriorityManager {
  private nextId = 1;
  private voices = new Map<number, AudioPriorityVoice>();
  /** Insertion-ordered ids per group (newest at end). */
  private byGroup = new Map<number, number[]>();
  /** Soft Miles-like 2D pool size (override in tests). */
  max2DVoices: number = SOFT_2D_VOICE_BUDGET;
  /** Soft Miles-like 3D pool size (override in tests). */
  max3DVoices: number = SOFT_3D_VOICE_BUDGET;

  /**
   * Combined soft budget (tests / legacy). Setting splits evenly across 2D/3D.
   * @deprecated Prefer max2DVoices / max3DVoices.
   */
  get maxGlobalVoices(): number {
    return this.max2DVoices + this.max3DVoices;
  }
  set maxGlobalVoices(n: number){
    const total = Math.max(0, n | 0);
    this.max2DVoices = Math.floor(total / 2);
    this.max3DVoices = Math.ceil(total / 2);
  }

  getVoiceCount(groupId: number): number {
    return this.byGroup.get(groupId)?.length ?? 0;
  }

  getActiveVoiceCount(): number {
    return this.voices.size;
  }

  getPoolVoiceCount(is3D: boolean): number {
    let n = 0;
    for(const voice of this.voices.values()){
      if(voice.is3D === is3D) n++;
    }
    return n;
  }

  getGroup(groupId: number): SWPriorityGroup | undefined {
    return GameState.SWRuleSet?.getPriorityGroupById?.(groupId);
  }

  getGroupFadeTimeSeconds(groupId: number): number {
    return this.getGroup(groupId)?.getFadeTimeSeconds?.() ?? 0;
  }

  tryAcquire(options: AudioPriorityAcquireOptions): AudioPriorityAcquireResult {
    const groupId = options.groupId | 0;
    const group = this.getGroup(groupId);
    const maxPlaying = group?.maxplaying ?? 255;
    const unlimited = !group || group.isUnlimited() || maxPlaying >= 255;
    const distanceSq = Number.isFinite(options.distanceSq) ? options.distanceSq as number : 0;
    const is3D = !!options.is3D;
    const ids = this.byGroup.get(groupId);

    if(!unlimited && ids && ids.length >= maxPlaying){
      // Play: interrupt==0 → deny; else InterruptPlayingSound then continue.
      if(!group.canPreemptSameGroup()){
        return { allowed: false };
      }
      const victim = this.pickNewestVictim(ids);
      if(!victim){
        return { allowed: false };
      }
      this.stealVoice(victim);
    }

    // Soft GetFree2D/3DVoice: steal only within the matching DIG pool.
    const poolMax = is3D ? this.max3DVoices : this.max2DVoices;
    if(this.getPoolVoiceCount(is3D) >= poolMax){
      const requesterPriority = group?.priority ?? 255;
      const hwVictim = this.pickHwStealVictim(requesterPriority, is3D);
      if(!hwVictim){
        return { allowed: false };
      }
      this.stealVoice(hwVictim);
    }

    const voiceId = this.nextId++;
    const voice: AudioPriorityVoice = {
      id: voiceId,
      owner: options.owner,
      groupId,
      startTime: performance.now(),
      distanceSq,
      is3D,
      onStolen: options.onStolen,
    };
    this.voices.set(voiceId, voice);
    let list = this.byGroup.get(groupId);
    if(!list){
      list = [];
      this.byGroup.set(groupId, list);
    }
    list.push(voiceId);
    return { allowed: true, voiceId };
  }

  updateDistance(voiceId: number, distanceSq: number): void {
    const voice = this.voices.get(voiceId);
    if(!voice){ return; }
    voice.distanceSq = distanceSq;
  }

  release(voiceId: number | undefined | null): void {
    if(voiceId == null){ return; }
    const voice = this.voices.get(voiceId);
    if(!voice){ return; }
    this.voices.delete(voiceId);
    const list = this.byGroup.get(voice.groupId);
    if(list){
      const idx = list.indexOf(voiceId);
      if(idx >= 0){
        list.splice(idx, 1);
      }
      if(!list.length){
        this.byGroup.delete(voice.groupId);
      }
    }
  }

  releaseAllForOwner(owner: object): void {
    const toRelease: number[] = [];
    for(const voice of this.voices.values()){
      if(voice.owner === owner){
        toRelease.push(voice.id);
      }
    }
    for(let i = 0; i < toRelease.length; i++){
      this.release(toRelease[i]);
    }
  }

  clear(): void {
    this.voices.clear();
    this.byGroup.clear();
  }

  /**
   * InterruptPlayingSound: first match from playing-list head.
   * We append on acquire (AddHead analogue) so newest is at the end — steal from end.
   */
  private pickNewestVictim(ids: number[]): AudioPriorityVoice | undefined {
    for(let i = ids.length - 1; i >= 0; i--){
      const voice = this.voices.get(ids[i]);
      if(voice){
        return voice;
      }
    }
    return undefined;
  }

  /**
   * GetFree*Voice victim pick: among voices in the same 2D/3D pool with
   * priority > requesterPriority, choose the highest (worst) priority value.
   */
  private pickHwStealVictim(requesterPriority: number, is3D: boolean): AudioPriorityVoice | undefined {
    let best: AudioPriorityVoice | undefined;
    let bestPriority = 0;
    for(const voice of this.voices.values()){
      if(voice.is3D !== is3D) continue;
      const g = this.getGroup(voice.groupId);
      const p = g?.priority ?? 255;
      if(requesterPriority < p && bestPriority < p){
        best = voice;
        bestPriority = p;
      }
    }
    return best;
  }

  private stealVoice(voice: AudioPriorityVoice): void {
    try{
      voice.onStolen();
    }catch(e){
      console.error('AudioPriorityManager', 'onStolen failed', e);
    }
    this.release(voice.id);
  }
}
