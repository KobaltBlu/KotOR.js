import React from "react";
import { TabState } from ".";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabScriptFindReferences } from "../../components/tabs/tab-script-find-references/TabScriptFindReferences";

export interface TextReferenceMatch {
  line: number;
  column: number;
  lineText: string;
  preview?: string;
}

export class TabScriptFindReferencesState extends TabState {
  tabName: string = " REFERENCES ";
  results: TextReferenceMatch[] = [];
  searchTerm: string = "";

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(
      <TabScriptFindReferences tab={this} parentTab={options.parentTab}></TabScriptFindReferences>
    );
  }

  setResults(searchTerm: string, results: TextReferenceMatch[] = []) {
    this.searchTerm = searchTerm;
    this.results = results;
    if (!this.results.length) {
      this.setTabName(" REFERENCES ");
    } else {
      this.setTabName(` REFERENCES (${this.results.length}) `);
    }
    this.processEventListener("onSetResults", [this.results]);
  }
}
