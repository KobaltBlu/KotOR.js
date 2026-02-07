import React from "react";
import { ModalState } from "./ModalState";
import { ModalAbout } from "../../components/modal/ModalAbout";
import { CURRENT_VERSION, LOCAL_PROGRAM_INFO, getRemoteToolsetUpdateInfo, isRemoteVersionNewer } from "../../config";

export interface ModalAboutStateOptions {
  title?: string;
}

export interface UpdateCheckResult {
  newer: boolean;
  remoteVersion?: string;
  error?: string;
  checking?: boolean;
}

export class ModalAboutState extends ModalState {
  title: string = "About KotOR Forge";
  version: string = CURRENT_VERSION;
  repoUrl: string = LOCAL_PROGRAM_INFO.repoUrl ?? LOCAL_PROGRAM_INFO.toolsetDownloadLink;
  downloadLink: string | undefined = LOCAL_PROGRAM_INFO.toolsetDownloadLink;
  updateCheckResult: UpdateCheckResult | null = null;

  constructor(options: ModalAboutStateOptions = {}) {
    super();
    if (options.title) {
      this.title = options.title;
    }
    this.setView(<ModalAbout modal={this} />);
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    this.updateCheckResult = { newer: false, checking: true };
    this.processEventListener("onUpdateCheckResult", [this.updateCheckResult]);

    const result = await getRemoteToolsetUpdateInfo({ useBetaChannel: false, silent: false });
    if (result instanceof Error) {
      this.updateCheckResult = { newer: false, error: result.message };
      this.processEventListener("onUpdateCheckResult", [this.updateCheckResult]);
      return this.updateCheckResult;
    }

    const remoteVersion =
      (result.toolsetLatestVersion as string) ?? (result.currentVersion as string) ?? "";
    const newer = isRemoteVersionNewer(CURRENT_VERSION, remoteVersion) ?? false;
    this.updateCheckResult = { newer, remoteVersion: remoteVersion || undefined };
    this.processEventListener("onUpdateCheckResult", [this.updateCheckResult]);
    return this.updateCheckResult;
  }
}
