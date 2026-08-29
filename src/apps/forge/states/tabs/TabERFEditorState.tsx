import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabERFEditor } from "@/apps/forge/components/tabs/tab-erf-editor/TabERFEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import {
  compareERFBrowserNodes,
  filterERFBrowserNodes,
  type ErfBrowserSortDir,
  type ErfBrowserSortKey,
  type ErfBrowserViewMode,
} from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserTypes";
import { forgeArchivesSettings } from "@/apps/forge/settings/forgeEditorsSettings";

import * as KotOR from "@/apps/forge/KotOR";

const arfArchiveTypes = [
  KotOR.ResourceTypes["erf"],
  KotOR.ResourceTypes["mod"],
  KotOR.ResourceTypes["sav"],
];

export class TabERFEditorState extends TabState {
  tabName: string = `ERF`;
  erf: KotOR.ERFObject;

  /** Root group node whose children are the archive listing. */
  root: FileBrowserNode | undefined;
  files: FileBrowserNode[] = [];

  /** Breadcrumb path from root (inclusive) to the current folder. */
  cwdPath: FileBrowserNode[] = [];
  viewMode: ErfBrowserViewMode = "details";
  sortKey: ErfBrowserSortKey = "name";
  sortDir: ErfBrowserSortDir = "asc";
  filterQuery: string = "";
  selectedNode: FileBrowserNode | undefined;
  browserGeneration: number = 0;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    const archives = forgeArchivesSettings.get();
    this.viewMode = archives.defaultView;
    this.sortKey = archives.sortKey;
    this.sortDir = archives.sortDir;
    this.setContentView(<TabERFEditor tab={this}></TabERFEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: "Encapsulated Resource File (ERF)",
        accept: {
          "application/octet-stream": [".erf"],
        },
      },
    ];
  }

  public async openFile(file?: EditorFile) {
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }

    if (!(file instanceof EditorFile)) {
      return undefined;
    }
    if (this.file != file) {
      this.file = file;
    }

    this.tabName = this.file.getFilename();

    const emptyNew =
      !(file.buffer instanceof Uint8Array && file.buffer.length) &&
      !file.path &&
      !file.archive_path;

    if (emptyNew) {
      this.erf = new KotOR.ERFObject();
      this.erf.inMemory = true;
      this.erf.buffer = new Uint8Array(0);
      const isMod = file.reskey === KotOR.ResourceTypes.mod;
      this.erf.header.fileType = isMod ? "MOD " : "ERF ";
      this.erf.header.fileVersion = "V1.0";
      this.erf.header.languageCount = 0;
      this.erf.header.localizedStringSize = 0;
      this.erf.header.entryCount = 0;
      this.saveTypes = [
        {
          description: isMod ? "Module Archive (MOD)" : "Encapsulated Resource File (ERF)",
          accept: {
            "application/octet-stream": [isMod ? ".mod" : ".erf"],
          },
        },
      ];
      this.root = new FileBrowserNode({
        name: this.tabName || (isMod ? "MOD" : "ERF"),
        type: "group",
        data: {
          archive: this.erf,
          size: 0,
          offset: 0,
          resId: -1,
          resType: isMod ? KotOR.ResourceTypes.mod : KotOR.ResourceTypes.erf,
          typeLabel: isMod ? "mod" : "erf",
          isFolder: true,
        },
      });
      this.files = [];
      this.cwdPath = [this.root];
      this.selectedNode = undefined;
      this.notifyBrowserChanged();
      this.processEventListener("onEditorFileLoad", [this]);
      return this.erf;
    }

    const response = await file.readFile();
    this.erf = new KotOR.ERFObject(response.buffer);
    await this.erf.load();
    this.root = await this.buildFileBrowser(this.erf);
    this.root.name = this.tabName || this.root.name;
    this.files = this.root.nodes;
    this.cwdPath = [this.root];
    this.selectedNode = undefined;
    this.notifyBrowserChanged();
    this.processEventListener("onEditorFileLoad", [this]);
    return this.erf;
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if (this.erf) {
      return this.erf.getExportBuffer();
    }
    return super.getExportBuffer(_resref, _ext);
  }

  async buildFileBrowser(archive: KotOR.ERFObject, parent?: FileBrowserNode) {
    if (!parent) {
      const fileType = (archive.header?.fileType || "ERF ").trim() || "ERF";
      parent = new FileBrowserNode({
        name: fileType,
        type: "group",
        data: {
          archive: archive,
          size: 0,
          offset: 0,
          resId: -1,
          resType: KotOR.ResourceTypes[fileType.toLowerCase()] ?? KotOR.ResourceTypes.erf,
          typeLabel: fileType.toLowerCase(),
          isFolder: true,
        },
      });
    }

    for (const key of archive.keyList) {
      const isERF = arfArchiveTypes.includes(key.resType);
      const typeLabel = KotOR.ResourceTypes.getKeyByValue(key.resType);
      const info = archive.getResourceInfo?.(key.resRef, key.resType) || archive.getResource?.(key.resRef, key.resType);
      const node = new FileBrowserNode({
        name: `${key.resRef}.${typeLabel}`,
        type: isERF ? "group" : "resource",
        data: {
          archive: archive,
          resource: key,
          size: info?.size ?? 0,
          offset: info?.offset ?? 0,
          resId: key.resId,
          resType: key.resType,
          typeLabel,
          isFolder: isERF,
        },
      });
      if (isERF) {
        const nested = new KotOR.ERFObject(await archive.getResourceBufferByResRef(key.resRef, key.resType));
        await nested.load();
        node.data.nestedArchive = nested;
        await this.buildFileBrowser(nested, node);
      }
      parent.addChildNode(node);
    }
    return parent;
  }

  getCwd(): FileBrowserNode | undefined {
    return this.cwdPath[this.cwdPath.length - 1];
  }

  getCwdChildren(): FileBrowserNode[] {
    return this.getCwd()?.nodes || [];
  }

  getVisibleNodes(): FileBrowserNode[] {
    const filtered = filterERFBrowserNodes(this.getCwdChildren(), this.filterQuery);
    return [...filtered].sort((a, b) => compareERFBrowserNodes(a, b, this.sortKey, this.sortDir));
  }

  getCurrentArchive(): KotOR.ERFObject | undefined {
    const cwd = this.getCwd();
    if (cwd?.data?.nestedArchive) {
      return cwd.data.nestedArchive;
    }
    return cwd?.data?.archive || this.erf;
  }

  setViewMode(mode: ErfBrowserViewMode) {
    if (this.viewMode === mode) {
      return;
    }
    this.viewMode = mode;
    forgeArchivesSettings.set({ defaultView: mode });
    this.notifyBrowserChanged();
  }

  setSort(key: ErfBrowserSortKey, dir?: ErfBrowserSortDir) {
    const nextDir =
      dir ??
      (this.sortKey === key ? (this.sortDir === "asc" ? "desc" : "asc") : "asc");
    this.sortKey = key;
    this.sortDir = nextDir;
    forgeArchivesSettings.set({ sortKey: key, sortDir: nextDir });
    this.notifyBrowserChanged();
  }

  setFilterQuery(query: string) {
    this.filterQuery = query;
    this.notifyBrowserChanged();
  }

  selectNode(node: FileBrowserNode | undefined) {
    this.selectedNode = node;
    this.notifyBrowserChanged();
  }

  enterFolder(node: FileBrowserNode) {
    if (node.type !== "group" && !node.data?.isFolder) {
      return;
    }
    this.cwdPath = [...this.cwdPath, node];
    this.selectedNode = undefined;
    this.filterQuery = "";
    this.notifyBrowserChanged();
  }

  navigateToBreadcrumb(index: number) {
    if (index < 0 || index >= this.cwdPath.length) {
      return;
    }
    this.cwdPath = this.cwdPath.slice(0, index + 1);
    this.selectedNode = undefined;
    this.filterQuery = "";
    this.notifyBrowserChanged();
  }

  notifyBrowserChanged() {
    this.browserGeneration += 1;
    this.processEventListener("onBrowserChanged", [this]);
  }
}
