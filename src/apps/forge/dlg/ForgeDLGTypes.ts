import { CExoLocString } from "@/resource/CExoLocString";

/**
 * Editable DLG document types for the Forge conversation editor.
 *
 * @file ForgeDLGTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type DLGNodeKind = "entry" | "reply";

/** Retail Delay DWORD 0xFFFFFFFF means unset (fall back to DelayEntry / spoken estimate). */
export const DLG_DELAY_UNSET = 0xffffffff;

export const DLG_NEIGHBOR_CAP = 50;

export interface ForgeDLGScriptParams {
  not: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  string: string;
}

export interface ForgeDLGLink {
  id: string;
  targetId: string;
  unresolvedIndex: number;
  active: string;
  active2: string;
  logic: number;
  params: ForgeDLGScriptParams;
  params2: ForgeDLGScriptParams;
  isChild: number;
  comment: string;
}

export interface ForgeDLGAnim {
  animation: number;
  participant: string;
}

export interface ForgeDLGStunt {
  participant: string;
  stuntModel: string;
}

export interface ForgeDLGNode {
  id: string;
  kind: DLGNodeKind;
  text: CExoLocString;
  speaker: string;
  listener: string;
  comment: string;
  voResRef: string;
  sound: string;
  soundExists: number;
  script: string;
  script2: string;
  scriptParams: ForgeDLGScriptParams;
  script2Params: ForgeDLGScriptParams;
  cameraAngle: number;
  cameraID: number;
  cameraAnimation: number;
  camFieldOfView: number;
  camVidEffect: number;
  delay: number;
  waitFlags: number;
  fadeType: number;
  fadeLength: number;
  fadeDelay: number;
  fadeColor: { r: number; g: number; b: number };
  quest: string;
  questEntry: number;
  plotIndex: number;
  plotXPPercentage: number;
  nodeUnskippable: number;
  isChild: number;
  alienRaceNode: number;
  emotion: number;
  facialAnimation: number;
  postProcessNode: number;
  recordNoVOOverride: number;
  recordVO: number;
  voTextChanged: number;
  animations: ForgeDLGAnim[];
  links: ForgeDLGLink[];
  k2Present: boolean;
}

export interface ForgeDLGDocument {
  conversationType: number;
  computerType: number;
  voId: string;
  cameraModel: string;
  endConversation: string;
  endConverAbort: string;
  ambientTrack: string;
  animatedCut: number;
  skippable: number;
  delayEntry: number;
  delayReply: number;
  unequipItems: number;
  unequipHeadItem: number;
  alienRaceOwner: number;
  recordNoVO: number;
  oldHitCheck: number;
  postProcOwner: number;
  stuntList: ForgeDLGStunt[];
  entries: ForgeDLGNode[];
  replies: ForgeDLGNode[];
  startingLinks: ForgeDLGLink[];
  k2Present: boolean;
  idSeq: number;
}

export function createScriptParams(): ForgeDLGScriptParams {
  return {
    not: 0,
    param1: 0,
    param2: 0,
    param3: 0,
    param4: 0,
    param5: 0,
    string: "",
  };
}

export function createLink(id: string, targetId: string): ForgeDLGLink {
  return {
    id,
    targetId,
    unresolvedIndex: -1,
    active: "",
    active2: "",
    logic: 0,
    params: createScriptParams(),
    params2: createScriptParams(),
    isChild: 0,
    comment: "",
  };
}

export function createNode(id: string, kind: DLGNodeKind): ForgeDLGNode {
  return {
    id,
    kind,
    text: new CExoLocString(-1),
    speaker: "",
    listener: "",
    comment: "",
    voResRef: "",
    sound: "",
    soundExists: 0x80,
    script: "",
    script2: "",
    scriptParams: createScriptParams(),
    script2Params: createScriptParams(),
    cameraAngle: 0,
    cameraID: 0,
    cameraAnimation: -1,
    camFieldOfView: -1,
    camVidEffect: -1,
    delay: DLG_DELAY_UNSET,
    waitFlags: 0,
    fadeType: 0,
    fadeLength: 0,
    fadeDelay: 0,
    fadeColor: { r: 0, g: 0, b: 0 },
    quest: "",
    questEntry: 0,
    plotIndex: -1,
    plotXPPercentage: 1,
    nodeUnskippable: 0,
    isChild: 0,
    alienRaceNode: 0,
    emotion: 4,
    facialAnimation: 0,
    postProcessNode: 0,
    recordNoVOOverride: 0,
    recordVO: 0,
    voTextChanged: 1,
    animations: [],
    links: [],
    k2Present: false,
  };
}

export function createEmptyDocument(): ForgeDLGDocument {
  return {
    conversationType: 0,
    computerType: 0,
    voId: "",
    cameraModel: "",
    endConversation: "",
    endConverAbort: "",
    ambientTrack: "",
    animatedCut: 0,
    skippable: 1,
    delayEntry: DLG_DELAY_UNSET,
    delayReply: DLG_DELAY_UNSET,
    unequipItems: 0,
    unequipHeadItem: 0,
    alienRaceOwner: 0,
    recordNoVO: 0,
    oldHitCheck: 0,
    postProcOwner: 0,
    stuntList: [],
    entries: [],
    replies: [],
    startingLinks: [],
    k2Present: false,
    idSeq: 0,
  };
}
