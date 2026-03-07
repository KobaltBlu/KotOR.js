import React from "react";
import { ModalPatcherProject } from "../../components/modal/ModalPatcherProject";
import { ModalState } from "./ModalState";

export interface PatcherFile {
  path: string;
  filename: string;
  type: string;
  size: number;
}

export class ModalPatcherProjectState extends ModalState {
  title: string = "Patcher Project";

  projectPath: string = '';
  projectName: string = 'NewPatcher';
  files: PatcherFile[] = [];
  configText: string = '';
  status: string = '';
  error: string = '';

  constructor(){
    super();
    this.setView(<ModalPatcherProject modal={this} />);
  }

  setProjectPath(path: string) {
    this.projectPath = path;
    this.processEventListener('onProjectPathChange', [path]);
  }

  setProjectName(name: string) {
    this.projectName = name;
    this.processEventListener('onProjectNameChange', [name]);
  }

  addFile(file: PatcherFile) {
    this.files.push(file);
    this.processEventListener('onFilesChange', [this.files]);
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.processEventListener('onFilesChange', [this.files]);
  }

  setConfigText(text: string) {
    this.configText = text;
    this.processEventListener('onConfigChange', [text]);
  }

  setStatus(status: string) {
    this.status = status;
    this.processEventListener('onStatusChange', [status]);
  }

  setError(error: string) {
    this.error = error;
    this.processEventListener('onErrorChange', [error]);
  }

  generateConfig(): string {
    // Generate a simple INI-style config for the patcher
    let config = `[PatcherInfo]\n`;
    config += `Name=${this.projectName}\n`;
    config += `Version=1.0\n`;
    config += `Date=${new Date().toISOString().split('T')[0]}\n`;
    config += `\n[Files]\n`;
    config += `FileCount=${this.files.length}\n`;
    this.files.forEach((file, index) => {
      config += `File${index}=${file.filename}\n`;
    });
    return config;
  }
}
