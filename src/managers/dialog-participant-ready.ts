/**
 * Retail SendDialogEntryNode @ 005a13d0 — required AnimList participants must
 * resolve on client before HandleDialogEntry (retry window 0x5dc = 1500ms).
 */

/** Retail CSWSDialog::field63_0x120 armed value. */
export const DIALOG_PARTICIPANT_RETRY_MS = 0x5dc;

export interface DialogParticipantReadyActor {
  participant: string;
  moduleObject?: { model?: unknown } | undefined;
  animations?: unknown[] | undefined;
}

export interface DialogParticipantReadyAnim {
  participant: string;
  animation: number;
}

/**
 * True when a required AnimList participant is bound for cutscene playback.
 * NonDependant names are ignored (may be absent).
 */
export function isRequiredDialogParticipantReady(
  anim: DialogParticipantReadyAnim,
  options: {
    isNonDependant: (name: string) => boolean;
    stuntActor?: DialogParticipantReadyActor;
    /** Live object from GetObjectByTag / PLAYER / OWNER when not a stunt actor. */
    liveObject?: { model?: unknown } | undefined;
  }
): boolean {
  const name = (anim.participant || '').trim();
  if(!name){ return true; }
  if(options.isNonDependant(name)){ return true; }

  if(options.stuntActor){
    const obj = options.stuntActor.moduleObject;
    if(!obj){ return false; }
    // CUT stunt anims need both the creature mesh and stunt animation list.
    if(!obj.model){ return false; }
    if(!options.stuntActor.animations?.length){ return false; }
    return true;
  }

  if(!options.liveObject){ return false; }
  // Non-stunt AnimList still needs a model for dialogPlayAnimation.
  if(options.liveObject.model === undefined || options.liveObject.model === null){
    return false;
  }
  return true;
}

export function areRequiredDialogParticipantsReady(
  animations: DialogParticipantReadyAnim[],
  options: {
    isNonDependant: (name: string) => boolean;
    getStuntActor: (name: string) => DialogParticipantReadyActor | undefined;
    getLiveObject: (name: string) => { model?: unknown } | undefined;
  }
): boolean {
  for(let i = 0; i < animations.length; i++){
    const anim = animations[i];
    const key = (anim.participant || '').toLocaleLowerCase();
    const ready = isRequiredDialogParticipantReady(anim, {
      isNonDependant: options.isNonDependant,
      stuntActor: options.getStuntActor(key),
      liveObject: options.getLiveObject(anim.participant),
    });
    if(!ready){ return false; }
  }
  return true;
}
