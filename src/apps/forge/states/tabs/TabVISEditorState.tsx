import React from "react";
import { TabVISEditor } from "../../components/tabs/tab-vis-editor/TabVISEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabVISEditorState extends TabState {
  tabName: string = 'VIS Editor';
  vis?: KotOR.VISObject;
  selectedRoomName?: string;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Visibility File',
        accept: {
          'text/plain': ['.vis']
        }
      }
    ];

    this.setContentView(<TabVISEditor tab={this}></TabVISEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.vis = new KotOR.VISObject(response.buffer);
      this.vis.read();
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectRoom(roomName: string | undefined) {
    this.selectedRoomName = roomName;
    this.processEventListener('onRoomSelected', [roomName]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.vis){
      // Use VISObject export logic
      const writer = new KotOR.BinaryWriter();
      const rooms = Array.from(this.vis.rooms.values());
      
      for(let i = 0; i < rooms.length; i++){
        const room = rooms[i];
        const roomCount = room.rooms.length;
        
        writer.writeChars(room.name + ' ' + roomCount);
        writer.writeByte(13); // CR
        writer.writeByte(10); // LF
        
        for(let j = 0; j < roomCount; j++){
          writer.writeChars('  ' + room.rooms[j]);
          if(i < (rooms.length - 1) || j < (roomCount - 1)){
            writer.writeByte(13); // CR
            writer.writeByte(10); // LF
          }
        }
      }
      
      return new Uint8Array(writer.buffer);
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // VIS changes are in vis.rooms map
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
