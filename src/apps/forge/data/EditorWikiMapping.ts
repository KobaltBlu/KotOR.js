import { TabState } from "../states/tabs";

export const WIKI_BASE_URL = 'https://github.com/KobaltBlu/KotOR.js/wiki/';

export const EDITOR_WIKI_MAP_BY_TAB: Record<string, string | null> = {
  TabGFFEditorState: 'GFF-File-Format.md',
  TabTwoDAEditorState: '2DA-File-Format.md',
  TabERFEditorState: 'ERF-File-Format.md',
  TabPTHEditorState: 'GFF-PTH.md',
  TabAREEditorState: 'GFF-ARE.md',
  TabIFOEditorState: 'GFF-IFO.md',
  TabJRLEditorState: 'GFF-JRL.md',
  TabSSFEditorState: 'SSF-File-Format.md',
  TabTLKEditorState: 'TLK-File-Format.md',
  TabFACEditorState: 'GFF-FAC.md',
  TabLTREditorState: 'LTR-File-Format.md',
  TabDLGEditorState: 'GFF-DLG.md',
  TabGITEditorState: 'GFF-GIT.md',
  TabSAVEditorState: 'ERF-File-Format.md',
  TabVISEditorState: 'VIS-File-Format.md',
  TabUTCEditorState: 'GFF-UTC.md',
  TabUTDEditorState: 'GFF-UTD.md',
  TabUTEEditorState: 'GFF-UTE.md',
  TabUTIEditorState: 'GFF-UTI.md',
  TabUTMEditorState: 'GFF-UTM.md',
  TabUTPEditorState: 'GFF-UTP.md',
  TabUTSEditorState: 'GFF-UTS.md',
  TabUTTEditorState: 'GFF-UTT.md',
  TabUTWEditorState: 'GFF-UTW.md',
  TabWOKEditorState: 'BWM-File-Format.md',
  TabLIPEditorState: 'LIP-File-Format.md',
  TabTextEditorState: null,
  TabImageViewerState: 'TPC-File-Format.md',
  TabModelViewerState: 'MDL-MDX-File-Format.md',
  TabBinaryViewerState: null,
  TabReferenceFinderState: null,
  TabScriptFindReferencesState: "Script-Find-References.md",
  TabHelpState: null,
  TabQuickStartState: null,
  TabGUIEditorState: "LYT-File-Format.md",
};

export const EDITOR_WIKI_MAP_BY_EXTENSION: Record<string, string | null> = {
  are: 'GFF-ARE.md',
  bwm: 'BWM-File-Format.md',
  dlg: 'GFF-DLG.md',
  erf: 'ERF-File-Format.md',
  fac: 'GFF-FAC.md',
  gff: 'GFF-File-Format.md',
  git: 'GFF-GIT.md',
  ifo: 'GFF-IFO.md',
  jrl: 'GFF-JRL.md',
  ltr: 'LTR-File-Format.md',
  lyt: 'LYT-File-Format.md',
  lip: 'LIP-File-Format.md',
  mdl: 'MDL-MDX-File-Format.md',
  mdx: 'MDL-MDX-File-Format.md',
  nss: 'NSS-File-Format.md',
  ncs: 'NCS-File-Format.md',
  pth: 'GFF-PTH.md',
  sav: 'GFF-File-Format.md',
  ssf: 'SSF-File-Format.md',
  tlk: 'TLK-File-Format.md',
  tpc: 'TPC-File-Format.md',
  tga: 'TPC-File-Format.md',
  txt: null,
  '2da': '2DA-File-Format.md',
  utc: 'GFF-UTC.md',
  utd: 'GFF-UTD.md',
  ute: 'GFF-UTE.md',
  uti: 'GFF-UTI.md',
  utm: 'GFF-UTM.md',
  utp: 'GFF-UTP.md',
  uts: 'GFF-UTS.md',
  utt: 'GFF-UTT.md',
  utw: 'GFF-UTW.md',
  vis: 'VIS-File-Format.md',
  wav: 'WAV-File-Format.md',
};

export function getWikiDocForTab(tab?: TabState): string | null {
  if(!tab) return null;
  const tabType = tab.constructor.name;
  const mappedByTab = EDITOR_WIKI_MAP_BY_TAB[tabType];
  if(mappedByTab){
    return mappedByTab;
  }

  const ext = tab.file?.ext?.toLowerCase?.();
  if(ext && Object.prototype.hasOwnProperty.call(EDITOR_WIKI_MAP_BY_EXTENSION, ext)){
    return EDITOR_WIKI_MAP_BY_EXTENSION[ext];
  }

  return null;
}

export function getWikiDocUrlForTab(tab?: TabState): string | null {
  const doc = getWikiDocForTab(tab);
  if(!doc) return null;
  return `${WIKI_BASE_URL}${doc.replace(/\s/g, '-')}`;
}
