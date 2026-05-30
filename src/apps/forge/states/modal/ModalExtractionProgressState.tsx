import React from "react";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ModalExtractionProgress } from "@/apps/forge/components/modal/ModalExtractionProgress";

export class ModalExtractionProgressState extends ModalState {
  title: string = 'Extracting Assets';
  message: string = 'Preparing...';
  current: number = 0;
  total: number = 0;

  constructor() {
    super();
    this.setView(<ModalExtractionProgress modal={this} />);
  }

  setProgress(current: number, total: number, message: string): void {
    this.current = current;
    this.total = total;
    this.message = message;
    this.processEventListener('onProgressUpdate', [current, total, message]);
  }
}
