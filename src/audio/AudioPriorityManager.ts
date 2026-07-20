import { GameState } from "@/GameState";
import type { SWPriorityGroup } from "@/engine/rules/SWPriorityGroup";

export interface AudioPriorityAcquireOptions {
  /** Opaque owner (AudioEmitter, AmbientAudioEmitter, etc.). */
  owner: object;
  /** prioritygroups.2da row index. */
  groupId: number;
  /** Squared distance to listener (reserved; retail same-group preempt is list-order). */
  distanceSq?: number;
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
  onStolen: () => void;
}

/**
 * Soft global voice budget approximating Miles DIG mixer channels.
 * CExoSoundInternal ctor calls _AIL_set_preference_8(3, 0x40) → 64 voices.
 * GetFree2DVoice @ 00637db0 / GetFree3DVoice @ 00637bd0 steal occupied slots
 * whose group priority rank is worse (higher) than the requester.
 */
export const SOFT_GLOBAL_VOICE_BUDGET = 64;

/**
 * Retail prioritygroups.2da voice allocator.
 *
 * From Linux TSL CExoSoundInternal (KOTOR2 ELF):
 * - LoadPriorityGroups @ 006380c0 — 2DA → CExoSoundPriorityGroup[0x18]
 * - Play @ 0063dcf0 — if count >= maxplaying: interrupt==0 deny, else InterruptPlayingSound
 * - InterruptPlayingSound @ 00638750 — shut down first same-group voice in playing list
 *   (AddToPlayingList uses AddHead → first = newest)
 * - AddToPlayingList @ 00637fc0 / RemoveFromPlayingList @ 00637850 — group count ±1 at +0x5
 * - GetFree2DVoice @ 00637db0 / GetFree3DVoice @ 00637bd0 — Miles HW slot steal by
 *   priority rank (lower better); soft-budgeted here via SOFT_GLOBAL_VOICE_BUDGET
 * - GetPriorityGroup @ 00637f90 — invalid id clamps to row 0x17 (DEFAULT)
 *
 * Volume: source copies group volume byte (+0x7) at construct; emitters multiply
 * emitterVolume/127 * groupVolume/127 (and ambient scale for SFX).
 */
export class AudioPriorityManager {
  private nextId = 1;
  private voices = new Map<number, AudioPriorityVoice>();
  /** Insertion-ordered ids per group (newest at end). */
  private byGroup = new Map<number, number[]>();
  /** Soft Miles-like pool size (override in tests). */
  maxGlobalVoices: number = SOFT_GLOBAL_VOICE_BUDGET;

  getVoiceCount(groupId: number): number {
    return this.byGroup.get(groupId)?.length ?? 0;
  }

  getActiveVoiceCount(): number {
    return this.voices.size;
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
    const ids = this.byGroup.get(groupId);

    if(!unlimited && ids && ids.length >= maxPlaying){
      // Retail Play: interrupt==0 → deny; else InterruptPlayingSound then continue.
      if(!group.canPreemptSameGroup()){
        return { allowed: false };
      }
      const victim = this.pickNewestVictim(ids);
      if(!victim){
        return { allowed: false };
      }
      this.stealVoice(victim);
    }

    // Soft GetFree2D/3DVoice: when the global pool is full, steal the worst
    // occupied voice whose priority rank is strictly worse than the requester.
    if(this.voices.size >= this.maxGlobalVoices){
      const requesterPriority = group?.priority ?? 255;
      const hwVictim = this.pickHwStealVictim(requesterPriority);
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
   * Retail InterruptPlayingSound: first match from playing-list head.
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
   * Retail GetFree*Voice victim pick: among voices with priority > requesterPriority,
   * choose the highest (worst) priority value.
   */
  private pickHwStealVictim(requesterPriority: number): AudioPriorityVoice | undefined {
    let best: AudioPriorityVoice | undefined;
    let bestPriority = 0;
    for(const voice of this.voices.values()){
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
