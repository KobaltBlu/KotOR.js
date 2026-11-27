import type { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";

/**
 * Largest frame index with time <= elapsed.
 * Empty array → 0. Assumes frames are sorted ascending by time.
 */
export function binarySearchFrameCursor(
  frames: IOdysseyControllerFrameGeneric[],
  elapsed: number
): number {
  const count = frames.length;
  if(count <= 1) return 0;

  let lo = 0;
  let hi = count - 1;
  let result = 0;
  while(lo <= hi){
    const mid = (lo + hi) >> 1;
    if(frames[mid].time <= elapsed){
      result = mid;
      lo = mid + 1;
    }else{
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * Temporally coherent keyframe cursor for continuous playback.
 * Dominant path: current cursor window still valid → return immediately.
 * Otherwise walk forward/back. Caller should binary-search on wrap/seek.
 */
export function resolveFrameCursor(
  frames: IOdysseyControllerFrameGeneric[],
  elapsed: number,
  cursor: number
): number {
  const count = frames.length;
  if(count <= 1) return 0;

  if(cursor < 0 || cursor >= count){
    cursor = 0;
  }

  // Still in [frames[cursor].time, frames[cursor+1].time)
  if(
    frames[cursor].time <= elapsed &&
    (cursor + 1 >= count || elapsed < frames[cursor + 1].time)
  ){
    return cursor;
  }

  if(elapsed >= frames[cursor].time){
    while(cursor + 1 < count && frames[cursor + 1].time <= elapsed){
      cursor++;
    }
    return cursor;
  }

  while(cursor > 0 && frames[cursor].time > elapsed){
    cursor--;
  }
  return cursor;
}

/**
 * True when elapsed jumped discontinuously vs lastTime (loop wrap or seek).
 */
export function isPlaybackDiscontinuity(
  elapsed: number,
  lastTime: number,
  rate: number
): boolean {
  if(rate >= 0){
    return elapsed < lastTime;
  }
  return elapsed > lastTime;
}
