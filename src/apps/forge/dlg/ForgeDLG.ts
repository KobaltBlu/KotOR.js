import { GFFObject } from "@/resource/GFFObject";
import {
  createEmptyDocument,
  createLink,
  createNode,
  createScriptParams,
  type DLGNodeKind,
  type ForgeDLGAnim,
  type ForgeDLGDocument,
  type ForgeDLGLink,
  type ForgeDLGNode,
  type ForgeDLGScriptParams,
  type ForgeDLGStunt,
} from "@/apps/forge/dlg/ForgeDLGTypes";
import { cloneLocString } from "@/apps/forge/dlg/dlgLocString";
import { exportDlgGff, parseDlgGff } from "@/apps/forge/dlg/dlgGffIO";
import { isTslForgeGame } from "@/apps/forge/dlg/dlgGame";

/**
 * Editable conversation document. Stable node ids; GFF indexes remapped on export.
 *
 * @file ForgeDLG.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

function cloneParams(src: ForgeDLGScriptParams): ForgeDLGScriptParams {
  return {
    not: src.not,
    param1: src.param1,
    param2: src.param2,
    param3: src.param3,
    param4: src.param4,
    param5: src.param5,
    string: src.string,
  };
}

function cloneLink(src: ForgeDLGLink): ForgeDLGLink {
  return {
    id: src.id,
    targetId: src.targetId,
    unresolvedIndex: src.unresolvedIndex,
    active: src.active,
    active2: src.active2,
    logic: src.logic,
    params: cloneParams(src.params),
    params2: cloneParams(src.params2),
    isChild: src.isChild,
    comment: src.comment,
  };
}

function cloneAnim(src: ForgeDLGAnim): ForgeDLGAnim {
  return { animation: src.animation, participant: src.participant };
}

function cloneNode(src: ForgeDLGNode): ForgeDLGNode {
  return {
    ...src,
    text: cloneLocString(src.text),
    scriptParams: cloneParams(src.scriptParams),
    script2Params: cloneParams(src.script2Params),
    fadeColor: { r: src.fadeColor.r, g: src.fadeColor.g, b: src.fadeColor.b },
    animations: src.animations.map(cloneAnim),
    links: src.links.map(cloneLink),
  };
}

function applyDocument(target: ForgeDLG, src: ForgeDLGDocument): void {
  target.conversationType = src.conversationType;
  target.computerType = src.computerType;
  target.voId = src.voId;
  target.cameraModel = src.cameraModel;
  target.endConversation = src.endConversation;
  target.endConverAbort = src.endConverAbort;
  target.ambientTrack = src.ambientTrack;
  target.animatedCut = src.animatedCut;
  target.skippable = src.skippable;
  target.delayEntry = src.delayEntry;
  target.delayReply = src.delayReply;
  target.unequipItems = src.unequipItems;
  target.unequipHeadItem = src.unequipHeadItem;
  target.alienRaceOwner = src.alienRaceOwner;
  target.recordNoVO = src.recordNoVO;
  target.oldHitCheck = src.oldHitCheck;
  target.postProcOwner = src.postProcOwner;
  target.stuntList = src.stuntList.map((s) => ({ ...s }));
  target.entries = src.entries.map(cloneNode);
  target.replies = src.replies.map(cloneNode);
  target.startingLinks = src.startingLinks.map(cloneLink);
  target.k2Present = src.k2Present;
  target.idSeq = src.idSeq;
  target.rebuildIndex();
}

export class ForgeDLG implements ForgeDLGDocument {
  conversationType = 0;
  computerType = 0;
  voId = "";
  cameraModel = "";
  endConversation = "";
  endConverAbort = "";
  ambientTrack = "";
  animatedCut = 0;
  skippable = 1;
  delayEntry = 0xffffffff;
  delayReply = 0xffffffff;
  unequipItems = 0;
  unequipHeadItem = 0;
  alienRaceOwner = 0;
  recordNoVO = 0;
  oldHitCheck = 0;
  postProcOwner = 0;
  stuntList: ForgeDLGStunt[] = [];
  entries: ForgeDLGNode[] = [];
  replies: ForgeDLGNode[] = [];
  startingLinks: ForgeDLGLink[] = [];
  k2Present = false;
  idSeq = 0;

  private nodeIndex = new Map<string, ForgeDLGNode>();

  static fromGFF(gff: GFFObject): ForgeDLG {
    const dlg = new ForgeDLG();
    applyDocument(dlg, parseDlgGff(gff));
    dlg.rebuildIndex();
    return dlg;
  }

  static fromBuffer(buffer?: Uint8Array): ForgeDLG {
    if (buffer instanceof Uint8Array && buffer.length >= GFFObject.HEADER_SIZE) {
      return ForgeDLG.fromGFF(new GFFObject(buffer));
    }
    return ForgeDLG.createUntitled();
  }

  static createUntitled(k2?: boolean): ForgeDLG {
    const dlg = new ForgeDLG();
    applyDocument(dlg, createEmptyDocument());
    dlg.k2Present = k2 ?? isTslForgeGame();
    const entry = dlg.addEntry();
    const reply = dlg.addReply();
    dlg.addLink(entry.id, reply.id);
    dlg.addStartingLink(entry.id);
    dlg.rebuildIndex();
    return dlg;
  }

  allocId(prefix: "e" | "r" | "l"): string {
    this.idSeq += 1;
    return `${prefix}${this.idSeq}`;
  }

  rebuildIndex(): void {
    this.nodeIndex.clear();
    for (let i = 0; i < this.entries.length; i++) {
      this.nodeIndex.set(this.entries[i].id, this.entries[i]);
    }
    for (let i = 0; i < this.replies.length; i++) {
      this.nodeIndex.set(this.replies[i].id, this.replies[i]);
    }
  }

  allNodes(): ForgeDLGNode[] {
    return this.entries.concat(this.replies);
  }

  getNode(id: string): ForgeDLGNode | undefined {
    return this.nodeIndex.get(id);
  }

  clone(): ForgeDLG {
    const copy = new ForgeDLG();
    applyDocument(copy, this);
    return copy;
  }

  toGFF(): GFFObject {
    return exportDlgGff(this);
  }

  getExportBuffer(): Uint8Array {
    return this.toGFF().getExportBuffer();
  }

  restampIsChild(): void {
    const inbound = new Map<string, number>();
    const bump = (id: string) => {
      if (!id) {
        return;
      }
      inbound.set(id, (inbound.get(id) || 0) + 1);
    };
    for (let i = 0; i < this.startingLinks.length; i++) {
      bump(this.startingLinks[i].targetId);
    }
    const nodes = this.allNodes();
    for (let n = 0; n < nodes.length; n++) {
      const links = nodes[n].links;
      for (let l = 0; l < links.length; l++) {
        bump(links[l].targetId);
      }
    }
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      node.isChild = (inbound.get(node.id) || 0) > 1 ? 1 : 0;
    }
  }

  addEntry(): ForgeDLGNode {
    const node = createNode(this.allocId("e"), "entry");
    node.k2Present = this.k2Present;
    this.entries.push(node);
    this.nodeIndex.set(node.id, node);
    return node;
  }

  addReply(): ForgeDLGNode {
    const node = createNode(this.allocId("r"), "reply");
    node.k2Present = this.k2Present;
    this.replies.push(node);
    this.nodeIndex.set(node.id, node);
    return node;
  }

  addStartingLink(targetId: string): ForgeDLGLink {
    const link = createLink(this.allocId("l"), targetId);
    this.startingLinks.push(link);
    this.restampIsChild();
    return link;
  }

  addLink(fromId: string, targetId: string): ForgeDLGLink | undefined {
    if (fromId === "start") {
      return this.addStartingLink(targetId);
    }
    const from = this.getNode(fromId);
    if (!from) {
      return undefined;
    }
    const target = this.getNode(targetId);
    if (!target) {
      return undefined;
    }
    if (from.kind === target.kind) {
      return undefined;
    }
    const link = createLink(this.allocId("l"), targetId);
    from.links.push(link);
    this.restampIsChild();
    return link;
  }

  removeLink(linkId: string): boolean {
    for (let i = 0; i < this.startingLinks.length; i++) {
      if (this.startingLinks[i].id === linkId) {
        this.startingLinks.splice(i, 1);
        this.restampIsChild();
        return true;
      }
    }
    const nodes = this.allNodes();
    for (let n = 0; n < nodes.length; n++) {
      const links = nodes[n].links;
      for (let i = 0; i < links.length; i++) {
        if (links[i].id === linkId) {
          links.splice(i, 1);
          this.restampIsChild();
          return true;
        }
      }
    }
    return false;
  }

  reorderLink(ownerId: string, linkId: string, direction: -1 | 1): boolean {
    const list = ownerId === "start" ? this.startingLinks : this.getNode(ownerId)?.links;
    if (!list) {
      return false;
    }
    const index = list.findIndex((l) => l.id === linkId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= list.length) {
      return false;
    }
    const swap = list[index];
    list[index] = list[next];
    list[next] = swap;
    return true;
  }

  deleteNode(id: string): boolean {
    const node = this.getNode(id);
    if (!node) {
      return false;
    }
    this.startingLinks = this.startingLinks.filter((l) => l.targetId !== id);
    const others = this.allNodes();
    for (let i = 0; i < others.length; i++) {
      others[i].links = others[i].links.filter((l) => l.targetId !== id);
    }
    if (node.kind === "entry") {
      this.entries = this.entries.filter((n) => n.id !== id);
    } else {
      this.replies = this.replies.filter((n) => n.id !== id);
    }
    this.nodeIndex.delete(id);
    this.restampIsChild();
    return true;
  }

  inboundCount(id: string): number {
    let count = 0;
    for (let i = 0; i < this.startingLinks.length; i++) {
      if (this.startingLinks[i].targetId === id) {
        count += 1;
      }
    }
    const nodes = this.allNodes();
    for (let n = 0; n < nodes.length; n++) {
      const links = nodes[n].links;
      for (let l = 0; l < links.length; l++) {
        if (links[l].targetId === id) {
          count += 1;
        }
      }
    }
    return count;
  }
}
