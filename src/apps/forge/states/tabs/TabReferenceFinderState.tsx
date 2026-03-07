import React from "react";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { TabReferenceFinder } from "../../components/tabs/tab-reference-finder/TabReferenceFinder";
import { ReferenceHit, ReferenceScope, searchReferences } from "../../helpers/ReferenceFinder";
import { TabResourceExplorerState } from "./TabResourceExplorerState";

export interface TabReferenceFinderStateOptions extends BaseTabStateOptions {
  query?: string;
  scope?: ReferenceScope;
  caseSensitive?: boolean;
  partialMatch?: boolean;
  filePattern?: string | null;
  fileTypes?: Set<string> | null;
}

export class TabReferenceFinderState extends TabState {
  tabName: string = "Reference Finder";
  singleInstance: boolean = false;

  query: string = "";
  scope: ReferenceScope = "project";
  caseSensitive: boolean = false;
  partialMatch: boolean = false;
  filePattern: string | null = null;
  fileTypes: Set<string> | null = null;

  searching: boolean = false;
  results: ReferenceHit[] = [];
  lastError?: string;

  constructor(options: TabReferenceFinderStateOptions = {}) {
    super(options);

    this.query = options.query ?? "";
    this.scope = options.scope ?? "project";
    this.caseSensitive = options.caseSensitive ?? false;
    this.partialMatch = options.partialMatch ?? false;
    this.filePattern = options.filePattern ?? null;
    this.fileTypes = options.fileTypes ?? null;

    this.setContentView(<TabReferenceFinder tab={this} />);
  }

  async runSearch() {
    const query = (this.query ?? "").trim();
    if (!query.length) {
      this.results = [];
      this.lastError = undefined;
      this.searching = false;
      this.processEventListener("onResults", [this.results]);
      return;
    }

    this.searching = true;
    this.lastError = undefined;
    this.processEventListener("onSearchState", [true]);

    try {
      const results = await searchReferences({
        query,
        scope: this.scope,
        caseSensitive: this.caseSensitive,
        filePattern: this.filePattern,
        fileTypes: this.fileTypes,
        gameRootNodes: TabResourceExplorerState.Resources,
      });
      this.results = results;
      this.processEventListener("onResults", [this.results]);
    } catch (e: unknown) {
      this.lastError = e instanceof Error ? e.message : "Search failed";
      this.processEventListener("onError", [this.lastError]);
    } finally {
      this.searching = false;
      this.processEventListener("onSearchState", [false]);
    }
  }
}
