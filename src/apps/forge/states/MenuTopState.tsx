import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { Project } from "@/apps/forge/Project";
import { ForgeMenuItem } from "@/apps/forge/components/common/forgeMenuItem";
import { executeCommand, getCommand, isCommandEnabled } from "@/apps/forge/commands/forgeCommands";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { buildOpenRecentMenuItems } from "@/apps/forge/commands/recentMenuItems";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import * as KotOR from "@/apps/forge/KotOR";

export class MenuTopState {

  static title: string = `KotOR Forge`;
  static items: ForgeMenuItem[] = [];
  static activeReverbProfile: number = -1;

  static #eventListeners: Record<string, Function[]> = {};

  static addEventListener(event: string, callback: Function){
    if(typeof callback !== 'function'){ return; }
    if(!Array.isArray(this.#eventListeners[event])){
      this.#eventListeners[event] = [];
    }
    const ev = this.#eventListeners[event];
    if(ev.indexOf(callback) == -1){
      ev.push(callback);
    }
  }

  static removeEventListener(event: string, callback: Function){
    if(typeof callback !== 'function'){ return; }
    if(!Array.isArray(this.#eventListeners[event])){
      return;
    }
    const ev = this.#eventListeners[event];
    const index = ev.indexOf(callback);
    if(index >= 0){
      ev.splice(index, 1);
    }
  }

  static triggerEventListener(event: string, ...args: any[]){
    if(!Array.isArray(this.#eventListeners[event])){
      return;
    }
    const ev = this.#eventListeners[event];
    for(let i = 0; i < ev.length; i++){
      if(typeof ev[i] === 'function'){
        ev[i](...args);
      }
    }
  }

  static commandItem(id: string, extra: Partial<ForgeMenuItem> = {}): ForgeMenuItem {
    const command = getCommand(id);
    return {
      id,
      label: extra.label ?? command?.title ?? id,
      shortcut: extra.shortcut ?? formatKeybinding(command?.keybinding),
      disabled: extra.disabled ?? (command ? !isCommandEnabled(id) : true),
      checked: extra.checked,
      radio: extra.radio,
      onClick: extra.onClick ?? (() => { void executeCommand(id); }),
      children: extra.children,
      detail: extra.detail,
    };
  }

  static rebuild(){
    this.items = this.buildMenuItems();
    this.triggerEventListener('onMenuTopItemsUpdated');
  }

  static setActiveReverbProfile(profileIndex: number){
    this.activeReverbProfile = profileIndex;
    KotOR.AudioEngine.GetAudioEngine().setReverbProfile(profileIndex);
    this.rebuild();
  }

  static buildReverbItems(): ForgeMenuItem[] {
    const reverbItems: ForgeMenuItem[] = [
      {
        label: 'No Reverb',
        radio: true,
        checked: this.activeReverbProfile === -1,
        onClick: () => this.setActiveReverbProfile(-1),
      },
      { separator: true },
    ];
    const eaxPresets = Object.values(KotOR.TwoDAManager.datatables.get('soundeax')?.rows || {});
    for(let i = 0; i < eaxPresets.length; i++){
      const eaxPreset = eaxPresets[i] as any;
      if(eaxPreset.label == 22) break;
      reverbItems.push({
        label: String(eaxPreset.label),
        radio: true,
        checked: this.activeReverbProfile === i,
        onClick: () => this.setActiveReverbProfile(i),
      });
    }
    return reverbItems;
  }

  static buildMenuItems(): ForgeMenuItem[] {
    const recentChildren = buildOpenRecentMenuItems({
      projects: ForgeState.recentProjects || [],
      files: ForgeState.recentFiles || [],
      onOpenProject: (index) => {
        const project = ForgeState.recentProjects[index];
        if(project){
          void Project.OpenRecent(project);
        }
      },
      onOpenFile: (index) => {
        const file = ForgeState.recentFiles[index];
        if(file){
          FileTypeManager.onOpenResource(file);
        }
      },
      onClear: () => { void executeCommand('forge.file.clearRecent'); },
    });

    return [
      {
        label: 'File',
        children: [
          {
            label: 'New',
            children: [
              { header: true, label: 'Engine Resource' },
              this.commandItem('forge.file.new.lip', { label: 'Lip Sync File (.lip)' }),
              this.commandItem('forge.file.new.image', { label: 'Texture (.tga)' }),
              this.commandItem('forge.file.new.nss', { label: 'NWScript Source File' }),
              this.commandItem('forge.file.new.dlg', { label: 'Conversation (.dlg)' }),
              { header: true, label: 'Blueprints' },
              this.commandItem('forge.file.new.utc', { label: '.UTC - Creature' }),
              this.commandItem('forge.file.new.utd', { label: '.UTD - Door' }),
              this.commandItem('forge.file.new.ute', { label: '.UTE - Encounter' }),
              this.commandItem('forge.file.new.uti', { label: '.UTI - Item' }),
              this.commandItem('forge.file.new.utm', { label: '.UTM - Store' }),
              this.commandItem('forge.file.new.utp', { label: '.UTP - Placeable' }),
              this.commandItem('forge.file.new.uts', { label: '.UTS - Sound' }),
              this.commandItem('forge.file.new.utt', { label: '.UTT - Trigger' }),
              this.commandItem('forge.file.new.utw', { label: '.UTW - Waypoint' }),
              { header: true, label: 'Tables' },
              this.commandItem('forge.file.new.2da', { label: '.2DA - Table' }),
              this.commandItem('forge.file.new.ssf', { label: '.SSF - Sound Set' }),
            ],
          },
          this.commandItem('forge.file.newProject'),
          { separator: true },
          this.commandItem('forge.file.openFile'),
          this.commandItem('forge.file.openProject'),
          this.commandItem('forge.file.loadGameData'),
          { label: 'Open Recent', children: recentChildren },
          { separator: true },
          this.commandItem('forge.file.save'),
          this.commandItem('forge.file.saveAs'),
          this.commandItem('forge.file.saveAll'),
          this.commandItem('forge.file.saveProjectToFolder'),
          { separator: true },
          this.commandItem('forge.file.closeEditor'),
          this.commandItem('forge.file.openAsGff'),
          this.commandItem('forge.file.closeProject'),
          { separator: true },
          {
            label: 'Preferences',
            children: [
              this.commandItem('forge.file.settings'),
              this.commandItem('forge.file.changeGame'),
            ],
          },
          this.commandItem('forge.file.exit'),
        ],
      },
      {
        label: 'Edit',
        children: [
          this.commandItem('forge.edit.undo', { shortcut: formatKeybinding('Mod+Z') }),
          this.commandItem('forge.edit.redo', { shortcut: formatKeybinding('Mod+Y') }),
        ],
      },
      {
        label: 'View',
        children: [
          this.commandItem('forge.view.commandPalette'),
          this.commandItem('forge.view.startPage'),
          { separator: true },
          this.commandItem('forge.view.toggleExplorer', {
            checked: ForgeState.explorerPaneOpen,
          }),
          this.commandItem('forge.view.toggleMiniPlayer', {
            checked: AudioPlayerState.isFloatingMiniPlayerVisible(),
          }),
          { label: 'Audio Reverb', children: this.buildReverbItems() },
        ],
      },
      {
        label: 'Project',
        children: [
          this.commandItem('forge.project.openModuleEditor'),
          { separator: true },
          this.commandItem('forge.project.compile'),
          this.commandItem('forge.project.compileAllNss'),
        ],
      },
      {
        label: 'Help',
        children: [
          this.commandItem('forge.help.about'),
        ],
      },
    ];
  }

  /** @deprecated Use rebuild() */
  static buildAudioMenuItems(){
    this.rebuild();
  }

}
