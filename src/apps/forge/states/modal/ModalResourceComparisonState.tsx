import React from "react";

import { ModalResourceComparison } from "@/apps/forge/components/modal/ModalResourceComparison";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export interface ResourceComparisonResource {
  resref: string;
  ext: string;
  data: Uint8Array;
  filepath?: string;
}

export interface ModalResourceComparisonStateOptions {
  resource1: ResourceComparisonResource;
  resource2?: ResourceComparisonResource | null;
  title?: string;
}

export class ModalResourceComparisonState extends ModalState {
  title: string = "Compare Resources";
  resource1: ResourceComparisonResource;
  resource2: ResourceComparisonResource | null;

  constructor(options: ModalResourceComparisonStateOptions) {
    super();
    this.resource1 = options.resource1;
    this.resource2 = options.resource2 ?? null;
    if (options.title) {
      this.title = options.title;
    }
    this.setView(<ModalResourceComparison modal={this} />);
  }
}
