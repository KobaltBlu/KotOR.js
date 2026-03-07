import React from "react";
import { ModalUpdateCheck } from "../../components/modal/ModalUpdateCheck";
import { ModalState } from "./ModalState";

export class ModalUpdateCheckState extends ModalState {
  title: string = "Check for Updates";

  checking: boolean = false;
  error: string = '';
  remoteVersion: string = '';
  hasUpdate: boolean = false;
  downloadLink: string = '';
  releaseNotes: string = '';

  constructor(){
    super();
    this.setView(<ModalUpdateCheck modal={this} />);
  }

  setChecking(checking: boolean) {
    this.checking = checking;
    this.processEventListener('onCheckingChange', [checking]);
  }

  setResult(result: { error?: string; remoteVersion?: string; hasUpdate?: boolean; downloadLink?: string; releaseNotes?: string }) {
    this.error = result.error || '';
    this.remoteVersion = result.remoteVersion || '';
    this.hasUpdate = result.hasUpdate || false;
    this.downloadLink = result.downloadLink || '';
    this.releaseNotes = result.releaseNotes || '';
    this.processEventListener('onResultChange', [result]);
  }
}
