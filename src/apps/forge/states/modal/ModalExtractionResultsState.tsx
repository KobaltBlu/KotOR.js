import React from 'react';
import { ModalState } from '@/apps/forge/states/modal/ModalState';
import { ModalExtractionResults } from '@/apps/forge/components/modal/ModalExtractionResults';

export interface ExtractionResults {
  modelName: string;
  modelCount: number;
  textureCount: number;
  exportedFiles: string[];
  skippedFiles: string[];
  failedFiles: string[];
}

export class ModalExtractionResultsState extends ModalState {
  title: string = 'Extraction Results';
  results: ExtractionResults;

  constructor(results: ExtractionResults) {
    super();
    this.results = results;
    this.setView(<ModalExtractionResults modal={this} />);
  }
}
