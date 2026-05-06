import React from "react";
import type { BulkProjectNssCompileOutcome } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ModalBulkNssCompileResults } from "@/apps/forge/components/modal/ModalBulkNssCompileResults";

export class ModalBulkNssCompileResultsState extends ModalState {
  outcome: BulkProjectNssCompileOutcome;

  constructor(outcome: BulkProjectNssCompileOutcome) {
    super();
    this.outcome = outcome;
    this.title = "Bulk NSS compile";
    this.setView(<ModalBulkNssCompileResults modal={this} />);
  }
}
