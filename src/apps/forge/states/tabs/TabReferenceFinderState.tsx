import React from 'react';

import { TabReferenceFinder } from '@/apps/forge/components/tabs/tab-reference-finder/TabReferenceFinder';
import { ReferenceHit, ReferenceScope, searchReferences } from '@/apps/forge/helpers/ReferenceFinder';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { TabResourceExplorerState } from '@/apps/forge/states/tabs/TabResourceExplorerState';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface TabReferenceFinderStateOptions extends BaseTabStateOptions {
  query?: string;
  scope?: ReferenceScope;
  caseSensitive?: boolean;
  partialMatch?: boolean;
  filePattern?: string | null;
  fileTypes?: Set<string> | null;
}

export class TabReferenceFinderState extends TabState {
  tabName: string = 'Reference Finder';
  singleInstance: boolean = false;

  query: string = '';
  scope: ReferenceScope = 'project';
  caseSensitive: boolean = false;
  partialMatch: boolean = false;
  filePattern: string | null = null;
  fileTypes: Set<string> | null = null;

  searching: boolean = false;
  results: ReferenceHit[] = [];
  lastError?: string;

  constructor(options: TabReferenceFinderStateOptions = {}) {
    log.trace('TabReferenceFinderState constructor entry');
    super(options);

    this.query = options.query ?? '';
    this.scope = options.scope ?? 'project';
    this.caseSensitive = options.caseSensitive ?? false;
    this.partialMatch = options.partialMatch ?? false;
    this.filePattern = options.filePattern ?? null;
    this.fileTypes = options.fileTypes ?? null;

    this.setContentView(<TabReferenceFinder tab={this} />);
    log.trace('TabReferenceFinderState constructor exit');
  }

  async runSearch() {
    log.trace('TabReferenceFinderState runSearch entry');
    const query = (this.query ?? '').trim();
    if (!query.length) {
      log.trace('TabReferenceFinderState runSearch empty query');
      this.results = [];
      this.lastError = undefined;
      this.searching = false;
      this.processEventListener('onResults', [this.results]);
      return;
    }

    this.searching = true;
    this.lastError = undefined;
    this.processEventListener('onSearchState', [true]);

    try {
      log.debug('TabReferenceFinderState runSearch query', query, 'scope', this.scope);
      const results = await searchReferences({
        query,
        scope: this.scope,
        caseSensitive: this.caseSensitive,
        filePattern: this.filePattern,
        fileTypes: this.fileTypes,
        gameRootNodes: TabResourceExplorerState.Resources,
      });
      this.results = results;
      this.processEventListener('onResults', [this.results]);
      log.trace('TabReferenceFinderState runSearch results', this.results.length);
    } catch (e: unknown) {
      this.lastError = e instanceof Error ? e.message : 'Search failed';
      log.warn('TabReferenceFinderState runSearch error', this.lastError);
      this.processEventListener('onError', [this.lastError]);
    } finally {
      this.searching = false;
      this.processEventListener('onSearchState', [false]);
      log.trace('TabReferenceFinderState runSearch exit');
    }
  }
}
