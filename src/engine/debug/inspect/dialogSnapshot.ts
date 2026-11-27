import { ConversationState } from "@core/enums/dialog/ConversationState";
import { CutsceneMode } from "@core/enums/dialog/CutsceneMode";
import { IPCMessageType } from "@engine/enums/server/ipc/IPCMessageType";
import { GameState } from "@engine/runtime/GameState";
import { getObjectKind, type OverviewObjectKind } from "@engine/debug/inspect/runtimeSnapshots";
import type { GameObject } from "@engine/module/GameObject";
import type { DLGNode } from "@engine/dialog/DLGNode";
import { GameDebuggerBridge } from '@engine/debug/GameDebuggerBridge';

export interface DialogParticipantRef {
  objectId: number;
  tag: string;
  label: string;
  kind: OverviewObjectKind | string;
}

export interface DialogScriptRef {
  slot: string;
  resref: string;
  not?: boolean;
}

export interface DialogEntrySnapshot {
  index: number;
  text: string;
  speaker?: DialogParticipantRef;
  listener?: DialogParticipantRef;
  scripts: DialogScriptRef[];
}

export interface DialogReplySnapshot {
  index: number;
  text: string;
  available: boolean;
  actionScripts: DialogScriptRef[];
  conditionScripts: DialogScriptRef[];
}

export interface DialogSnapshot {
  active: boolean;
  resref: string;
  state: number;
  stateLabel: string;
  cutsceneMode: boolean;
  cutsceneModeLabel: string;
  privateConversation: boolean;
  paused: boolean;
  epoch: number;
  owner?: DialogParticipantRef;
  listener?: DialogParticipantRef;
  entry?: DialogEntrySnapshot;
  lastSpokenText?: string;
  replies: DialogReplySnapshot[];
  dialogScripts: DialogScriptRef[];
}

const STATE_LABELS: Record<number, string> = {
  [ConversationState.INVALID]: 'Invalid',
  [ConversationState.LISTENING_TO_SPEAKER]: 'Listening to speaker',
  [ConversationState.WAITING_FOR_PC_CHOICE]: 'Waiting for PC choice',
  [ConversationState.CONTINUE_DIALOG]: 'Continue dialog',
  [ConversationState.END_DIALOG]: 'End dialog',
};

const MODE_LABELS: Record<number, string> = {
  [CutsceneMode.DIALOG]: 'Dialog',
  [CutsceneMode.ANIMATED]: 'Animated',
  [CutsceneMode.BARK]: 'Bark',
};

const DUMMY_SCRIPT = 'SWG_DUMMY_SCRIPT';

function participantRef(obj: GameObject | undefined | null): DialogParticipantRef | undefined {
  if(!obj){ return undefined; }
  const objectId = Number((obj as any).id ?? -1);
  const kind = getObjectKind(obj);
  const label = (typeof obj.getName === 'function' ? obj.getName() : '') || obj.tag || (objectId >= 0 ? `id ${objectId}` : 'object');
  return {
    objectId: Number.isFinite(objectId) ? objectId : -1,
    tag: obj.tag || '',
    label,
    kind,
  };
}

function scriptName(inst: { name?: string } | undefined | null): string {
  const name = (inst?.name || '').trim();
  if(!name || name === DUMMY_SCRIPT){ return ''; }
  return name;
}

function pushScript(out: DialogScriptRef[], slot: string, inst: { name?: string } | undefined | null, not?: boolean){
  const resref = scriptName(inst);
  if(!resref){ return; }
  const row: DialogScriptRef = { slot, resref };
  if(not){ row.not = true; }
  out.push(row);
}

function entryScripts(node: DLGNode): DialogScriptRef[] {
  const scripts: DialogScriptRef[] = [];
  pushScript(scripts, 'Script', node.script);
  pushScript(scripts, 'Script2', node.script2);
  return scripts;
}

function conditionScripts(link: DLGNode): DialogScriptRef[] {
  const scripts: DialogScriptRef[] = [];
  pushScript(scripts, 'IsActive', link.isActive, !!link.isActiveParams?.Not);
  pushScript(scripts, 'IsActive2', link.isActive2, !!link.isActive2Params?.Not);
  return scripts;
}

function actionScripts(node: DLGNode): DialogScriptRef[] {
  return entryScripts(node);
}

/**
 * Live conversation snapshot for the debugger Dialog tab.
 * Does not re-evaluate Active scripts (side-effecting).
 */
export function snapshotDialog(): DialogSnapshot {
  const cm = GameState.CutsceneManager;
  if(!cm?.active || !cm.dialog){
    return {
      active: false,
      resref: '',
      state: ConversationState.INVALID,
      stateLabel: STATE_LABELS[ConversationState.INVALID],
      cutsceneMode: false,
      cutsceneModeLabel: MODE_LABELS[CutsceneMode.DIALOG],
      privateConversation: false,
      paused: false,
      epoch: cm?.conversationEpoch ?? 0,
      replies: [],
      dialogScripts: [],
    };
  }

  const state = cm.state ?? ConversationState.INVALID;
  const mode = cm.cutsceneMode ?? CutsceneMode.DIALOG;
  const entryNode = cm.currentEntry || (cm as { lastDialogEntry?: DLGNode }).lastDialogEntry;
  const available = cm.currentReplies || [];
  const availableIds = new Set(available.map((r) => r.index));

  const replies: DialogReplySnapshot[] = [];
  const linkSource = entryNode?.replies?.length ? entryNode.replies : available;
  const seen = new Set<number>();

  for(const link of linkSource){
    if(!link || seen.has(link.index)){ continue; }
    seen.add(link.index);
    const replyNode = cm.dialog.getReplyByIndex(link.index) || link;
    const availableFlag = availableIds.has(link.index)
      || available.some((r) => r === link || r === replyNode);
    replies.push({
      index: link.index,
      text: (typeof replyNode.getCompiledString === 'function'
        ? replyNode.getCompiledString()
        : (replyNode.text || '')) || '',
      available: availableFlag,
      actionScripts: actionScripts(replyNode),
      conditionScripts: conditionScripts(link),
    });
  }

  for(const reply of available){
    if(!reply || seen.has(reply.index)){ continue; }
    seen.add(reply.index);
    replies.push({
      index: reply.index,
      text: reply.getCompiledString?.() || reply.text || '',
      available: true,
      actionScripts: actionScripts(reply),
      conditionScripts: [],
    });
  }

  replies.sort((a, b) => a.index - b.index);

  const dialogScripts: DialogScriptRef[] = [];
  pushScript(dialogScripts, 'EndConversation', cm.dialog.scripts?.onEndConversation);
  pushScript(dialogScripts, 'EndConversationAbort', cm.dialog.scripts?.onEndConversationAbort);

  let entry: DialogEntrySnapshot | undefined;
  if(entryNode){
    entry = {
      index: entryNode.index,
      text: entryNode.getCompiledString?.() || entryNode.text || cm.lastSpokenString || '',
      speaker: participantRef(entryNode.speaker || cm.getCurrentOwner?.() || cm.owner),
      listener: participantRef(entryNode.listener || cm.getCurrentListener?.() || cm.listener),
      scripts: entryScripts(entryNode),
    };
  }

  return {
    active: true,
    resref: cm.dialog.resref || cm.conversation_name || '',
    state,
    stateLabel: STATE_LABELS[state] || `State ${state}`,
    cutsceneMode: mode === CutsceneMode.ANIMATED,
    cutsceneModeLabel: MODE_LABELS[mode] || String(mode),
    privateConversation: !!cm.privateConversation,
    paused: !!cm.paused,
    epoch: cm.conversationEpoch | 0,
    owner: participantRef(cm.owner),
    listener: participantRef(cm.listener),
    entry,
    lastSpokenText: cm.lastSpokenString || undefined,
    replies,
    dialogScripts,
  };
}

/** Push DialogSnapshot to the debugger when debugMode is on. */
export function pushDialogSnapshotToDebugger(){
  if(!GameState.debugMode){ return; }
  try{
    GameDebuggerBridge.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
  }catch(e){
    console.error('pushDialogSnapshotToDebugger failed', e);
  }
}
