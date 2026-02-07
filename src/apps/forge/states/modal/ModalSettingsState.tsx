import React from "react";
import { ModalSettings } from "../../components/modal/ModalSettings";
import { ModalState } from "./ModalState";
import * as KotOR from "../../KotOR";

export interface SettingsData {
  // Game installations
  kotorPath: string;
  kotor2Path: string;

  // Editor preferences
  gffSpecializedEditors: boolean;
  scriptEditorFontSize: number;
  autoSave: boolean;

  // Updates
  checkForUpdatesOnStartup: boolean;
  useBetaChannel: boolean;

  // Appearance
  theme: string;
}

export class ModalSettingsState extends ModalState {
  title: string = "Settings";

  activeTab: string = 'installations';
  settings: SettingsData;

  constructor(){
    super();

    // Load settings from ConfigClient
    this.settings = this.loadSettings();

    this.setView(<ModalSettings modal={this} />);
  }

  loadSettings(): SettingsData {
    const config = KotOR.ConfigClient;
    return {
      kotorPath: config.get('Games.KOTOR.Location', '') as string,
      kotor2Path: config.get('Games.TSL.Location', '') as string,
      gffSpecializedEditors: config.get('Editor.GFF.UseSpecialized', true) as boolean,
      scriptEditorFontSize: config.get('Editor.Script.FontSize', 14) as number,
      autoSave: config.get('Editor.AutoSave', false) as boolean,
      checkForUpdatesOnStartup: config.get('Updates.CheckOnStartup', false) as boolean,
      useBetaChannel: config.get('Updates.UseBetaChannel', false) as boolean,
      theme: config.get('Appearance.Theme', 'dark') as string,
    };
  }

  saveSettings() {
    const config = KotOR.ConfigClient;
    config.set('Games.KOTOR.Location', this.settings.kotorPath);
    config.set('Games.TSL.Location', this.settings.kotor2Path);
    config.set('Editor.GFF.UseSpecialized', this.settings.gffSpecializedEditors);
    config.set('Editor.Script.FontSize', this.settings.scriptEditorFontSize);
    config.set('Editor.AutoSave', this.settings.autoSave);
    config.set('Updates.CheckOnStartup', this.settings.checkForUpdatesOnStartup);
    config.set('Updates.UseBetaChannel', this.settings.useBetaChannel);
    config.set('Appearance.Theme', this.settings.theme);

    this.processEventListener('onSettingsSaved', [this.settings]);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.processEventListener('onActiveTabChange', [tab]);
  }

  updateSetting<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    this.settings[key] = value;
    this.processEventListener('onSettingsChange', [key, value]);
  }
}
