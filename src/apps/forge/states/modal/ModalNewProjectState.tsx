import path from "path";

import React from "react";

import { ModalNewProject } from "@/apps/forge/components/modal/ModalNewProject";
import * as KotOR from "@/apps/forge/KotOR";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

type GameModule = {
  moduleName: string;
  entryArea: string;
  areaName: string;
  path: string;
  type: 'rim' | 'mod';
  ifo: KotOR.GFFObject;
  git: KotOR.GFFObject;
  are: KotOR.GFFObject;
  rooms: { roomName: string, envAudio: number, ambientScale: number }[];
}

const GameModules: Map<string, GameModule> = new Map();

const loadGameModules = async () => {
  const results: GameModule[] = [];
  const module_paths = await KotOR.GameFileSystem.readdir('modules');
  const rim_module_paths = module_paths.filter(module_path => module_path.endsWith('.rim'));
  const lookupMap = new Map<string, string>();

  const moduleNames: string[] = [];
  for(const module of rim_module_paths) {
    const parsed = path.parse(module);
    if(!parsed.name.endsWith('_s')) {
      moduleNames.push(parsed.name);
    }
    lookupMap.set(parsed.base, parsed.base);
  }

  for(const moduleName of moduleNames) {
    try{
      const module_path = path.join('modules', moduleName + '.rim');
      const module = await KotOR.GameFileSystem.readFile(module_path);
      const rim = new KotOR.RIMObject(module);
      await rim.load();

      const ifo = await rim.getResourceBufferByResRef('module', KotOR.ResourceTypes['ifo']);
      const ifo_gff = new KotOR.GFFObject(ifo);
      const entryArea = ifo_gff.getFieldByLabel('Mod_Entry_Area').getValue();

      const are_data = await rim.getResourceBufferByResRef(entryArea, KotOR.ResourceTypes['are']);
      const git_data = await rim.getResourceBufferByResRef(entryArea, KotOR.ResourceTypes['git']);
      const are_gff = new KotOR.GFFObject(are_data);
      const git_gff = new KotOR.GFFObject(git_data);

      const areaName = are_gff.getFieldByLabel('Name').getValue() || '';

      const rooms = are_gff.getFieldByLabel('Rooms').getChildStructs();
      const roomData: { roomName: string, envAudio: number, ambientScale: number }[] = [];
      for(const room of rooms){
        roomData.push({
          roomName: room.getFieldByLabel('RoomName').getValue(),
          envAudio: room.getFieldByLabel('EnvAudio').getValue(),
          ambientScale: room.getFieldByLabel('AmbientScale').getValue()
        });
      }


      const gameModule: GameModule = {
        moduleName: moduleName,
        entryArea: entryArea,
        areaName: areaName,
        path: path.join('modules', moduleName + '.rim'),
        type: 'rim',
        ifo: ifo_gff,
        git: git_gff,
        are: are_gff,
        rooms: roomData
      };
      GameModules.set(moduleName, gameModule);
      results.push(gameModule);
    }catch(e){
      console.error(e);
    }
  }
  return results;
}

export class ModalNewProjectState extends ModalState {

  title: string = 'New Project';

  constructor(){
    super();
    this.setView(<ModalNewProject modal={this} />);
    loadGameModules().then(modules => {
      this.processEventListener('onGameModulesLoaded', [modules]);
    });
  }
}
