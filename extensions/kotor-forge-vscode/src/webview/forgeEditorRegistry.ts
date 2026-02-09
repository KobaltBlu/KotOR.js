/**
 * Maps extension editor types (from getEditorType()) to Forge TabState classes.
 * All editors are the real Forge implementations from src/apps/forge.
 */
import type BaseTabStateOptions from '@forge/interfaces/BaseTabStateOptions';
import {
  type TabState,
  TabUTCEditorState,
  TabUTDEditorState,
  TabUTPEditorState,
  TabUTIEditorState,
  TabUTEEditorState,
  TabUTSEditorState,
  TabUTTEditorState,
  TabUTWEditorState,
  TabUTMEditorState,
  TabGFFEditorState,
  TabDLGEditorState,
  TabTwoDAEditorState,
  TabERFEditorState,
  TabModelViewerState,
  TabImageViewerState,
  TabWOKEditorState,
  TabTLKEditorState,
  TabLIPEditorState,
  TabSSFEditorState,
  TabBinaryViewerState,
  TabAREEditorState,
  TabIFOEditorState,
  TabGITEditorState,
  TabJRLEditorState,
  TabFACEditorState,
  TabVISEditorState,
  TabLTREditorState,
  TabPTHEditorState,
  TabGUIEditorState,
  TabSAVEditorState,
  TabAudioPlayerState
} from '@forge/states/tabs';

const LOG_PREFIX = '[Webview]';
function logTrace(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [trace] ${msg}`);
}
function logDebug(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [debug] ${msg}`);
}

type TabStateClass = new (options?: BaseTabStateOptions) => TabState;

const EDITOR_MAP: Record<string, TabStateClass> = {
  utc: TabUTCEditorState,
  utd: TabUTDEditorState,
  utp: TabUTPEditorState,
  uti: TabUTIEditorState,
  ute: TabUTEEditorState,
  uts: TabUTSEditorState,
  utt: TabUTTEditorState,
  utw: TabUTWEditorState,
  utm: TabUTMEditorState,
  gff: TabGFFEditorState,
  dlg: TabDLGEditorState,
  '2da': TabTwoDAEditorState,
  erf: TabERFEditorState,
  model: TabModelViewerState,
  image: TabImageViewerState,
  walkmesh: TabWOKEditorState,
  tlk: TabTLKEditorState,
  lip: TabLIPEditorState,
  ssf: TabSSFEditorState,
  binary: TabBinaryViewerState,
  are: TabAREEditorState,
  ifo: TabIFOEditorState,
  git: TabGITEditorState,
  jrl: TabJRLEditorState,
  fac: TabFACEditorState,
  vis: TabVISEditorState,
  ltr: TabLTREditorState,
  pth: TabPTHEditorState,
  gui: TabGUIEditorState,
  sav: TabSAVEditorState,
  audio: TabAudioPlayerState
};

export function createTabStateForEditorType(
  editorType: string,
  options: BaseTabStateOptions
): TabState {
  logTrace(`createTabStateForEditorType() editorType=${editorType}`);
  const Ctor = EDITOR_MAP[editorType] ?? TabBinaryViewerState;
  const tabState = new Ctor(options);
  if (!EDITOR_MAP[editorType]) {
    logDebug(`createTabStateForEditorType() fallback to TabBinaryViewerState for ${editorType}`);
  }
  return tabState;
}

export function getSupportedEditorTypes(): string[] {
  const types = Object.keys(EDITOR_MAP);
  logTrace(`getSupportedEditorTypes() count=${types.length}`);
  return types;
}
