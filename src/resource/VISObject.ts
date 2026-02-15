import { ModuleObjectType } from "@/enums";
import type { IVISRoom } from "@/interface/module/IVISRoom";
import type { ModuleArea, ModuleRoom } from "@/module";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { BitWise } from "@/utility/BitWise";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);

enum VISReadMode {
  ROOM = 0,
  CHILD_ROOMS = 1
}

interface IReadContext {
  mode: VISReadMode;
  currentRoom: IVISRoom;
  linkedRoomCount: number;
}

/**
 * VISObject class.
 *
 * Class representing a Extra Texture Information file in memory.
 *
 * CHILD_ROOMS are rooms that are visible from the parent room. The engine will not
 * render rooms that are not present in this list when you are standing in a parent room
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file VISObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VISObject {
  rooms: Map<string, IVISRoom> = new Map<string, IVISRoom>();
  area: ModuleArea;
  data: Uint8Array;

  readContext: IReadContext = {
    mode: VISReadMode.ROOM,
    currentRoom: {
      name: '',
      count: 0,
      rooms: []
    },
    linkedRoomCount: 0
  };

  constructor ( data?: Uint8Array ) {
    this.data = data;
    if (data?.length) {
      this.read(data);
    }
  }

  read(data?: Uint8Array){
    // log.info('VISObject.read');
    if(data){
      this.data = data;
    }

    if(!this.data){
      log.warn('VISObject.read: No data to read');
      return;
    }

    const text = (new TextDecoder('utf8')).decode(this.data).toLocaleLowerCase();
    const lines = text.split('\n');
    const lineCount = lines.length;

    // log.info(`VISObject.read: ${lineCount} lines found`);

    this.resetReadContext();

    /**
     * VIS Object File Format
     * [Parent Room]
     *  - room_name number_of_child_rooms
     *  - regex: ^([^\s]+)[\s|\t](\d+)\n
     * [Child Room]
     *  - child_room_name
     *  - regex: ^\s{2}([^\s]+)\n
     */

    for( let i = 0; i < lineCount; i++ ) {
      const line = lines[i].trim();

      //Skip empty lines
      if(!line.length){
        continue;
      }

      //Check if the current line is a child room
      const isChildRoom = lines[i].substring(0, 2) == '  ';

      /**
       * Child Room parse logic
       */
      if(isChildRoom){
        // log.info(`VISObject.read: Child Room: ${line}`);
        this.readContext.mode = VISReadMode.CHILD_ROOMS;
        //CHILD_ROOMS
        this.readContext.currentRoom.rooms.push(line);
        this.readContext.linkedRoomCount++;
      }
      /**
       * ParentRoom parse logic
       */
      else
      {
        // Skip version header lines (e.g. "roomname V3.28")
        const args = line.split(/\s+/);
        if (args.length >= 2 && args[1].startsWith('V')) {
          continue;
        }

        //If we are still in CHILD_ROOMS mode and the current line is a room.
        //Push the currentRoom to the rooms array and reset the current room var
        if(this.readContext.mode == VISReadMode.CHILD_ROOMS){
          this.resetReadContext();
        }

        this.readContext.mode = VISReadMode.ROOM;

        this.readContext.currentRoom.name = args[0];
        this.readContext.currentRoom.count = parseInt(args[1], 10) || 0;
        this.readContext.linkedRoomCount = 0;
      }
    }

    this.resetReadContext();
    // log.info('VISObject.read: Done!');
  }

  /**
   * Push current parsed room to the rooms map (used during read).
   * @internal
   */
  private addRoomFromContext(): void {
    if(!this.readContext.currentRoom?.name){
      return;
    }

    const room = this.readContext.currentRoom;
    this.rooms.set(room.name, room);
  }

  /**
   * Get a newly initialized IVISRoom object
   * @returns A newly initialized IVISRoom object
   */
  resetReadContext () {
    if(this.readContext.currentRoom){
      this.addRoomFromContext();
    }

    this.readContext = {
      mode: VISReadMode.ROOM,
      currentRoom: {
        name: '',
        count: 0,
        rooms: []
      },
      linkedRoomCount: 0
    };
  }

  attachArea(area?: ModuleArea){
    if(area){
      this.area = area;
    }

    if(!this.area){
      log.warn('VISObject.attachArea: No area to process');
      return;
    }

    const rooms = Array.from(this.rooms.values());
    for(let i = 0; i < rooms.length; i++){
      const visRoom = rooms[i];
      for(let j = 0; j < this.area.rooms.length; j++){
        const room = this.area.rooms[j];
        if( BitWise.InstanceOfObject(room, ModuleObjectType.ModuleRoom) && (room.roomName == visRoom.name) ){
          room.visObject = this;
        }
      }
    }
  }

  /**
   * Get the array of VISRooms
   * @returns The array of VISRooms
   */
  getRooms(): IVISRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get a VISRoom by name
   * @param room - The name of the room to get
   * @returns The VISRoom or null if it is not found
   */
  getRoom(room = ''): IVISRoom | null {
    return this.rooms.get(room.toLocaleLowerCase()) || null;
  }

  /**
   * Get the visible rooms for a given room
   * @param room - The name of the room to get the visible rooms for
   * @returns The array of visible rooms
   */
  getVisibleRooms(room = ''): string[] {
    const visRoom = this.getRoom(room.toLocaleLowerCase());
    if(visRoom){
      return visRoom.rooms;
    }

    return [];
  }

  /**
   * Returns true if the specified room exists in this VIS.
   */
  roomExists(model: string): boolean {
    return this.rooms.has(model.toLowerCase());
  }

  /**
   * Adds a room. If it already exists, does nothing.
   */
  addRoom(model: string): void {
    const key = model.toLowerCase();
    if (!this.rooms.has(key)) {
      this.rooms.set(key, { name: key, count: 0, rooms: [] });
    }
  }

  /**
   * Removes a room and any visibility references to it.
   */
  removeRoom(model: string): void {
    const lower = model.toLowerCase();
    for (const visRoom of this.rooms.values()) {
      const i = visRoom.rooms.findIndex(r => r.toLowerCase() === lower);
      if (i >= 0) {
        visRoom.rooms.splice(i, 1);
        visRoom.count = visRoom.rooms.length;
      }
    }
    this.rooms.delete(lower);
  }

  /**
   * Renames a room and updates all visibility references.
   */
  renameRoom(oldName: string, newName: string): void {
    const oldKey = oldName.toLowerCase();
    const newKey = newName.toLowerCase();
    if (oldKey === newKey) return;
    const existing = this.rooms.get(oldKey);
    if (!existing) return;
    this.rooms.delete(oldKey);
    existing.name = newKey;
    existing.rooms = existing.rooms.map(r => r.toLowerCase() === oldKey ? newKey : r);
    this.rooms.set(newKey, existing);
    for (const visRoom of this.rooms.values()) {
      if (visRoom.name === newKey) continue;
      for (let i = 0; i < visRoom.rooms.length; i++) {
        if (visRoom.rooms[i].toLowerCase() === oldKey) visRoom.rooms[i] = newKey;
      }
    }
  }

  /**
   * Sets whether 'show' is visible when viewing from 'whenInside'.
   */
  setVisible(whenInside: string, show: string, visible: boolean): void {
    const whenKey = whenInside.toLowerCase();
    const showKey = show.toLowerCase();
    if (!this.rooms.has(whenKey) || !this.rooms.has(showKey)) {
      throw new Error('One of the specified rooms does not exist.');
    }
    const visRoom = this.rooms.get(whenKey);
    if (visRoom === undefined) throw new Error('One of the specified rooms does not exist.');
    const idx = visRoom.rooms.findIndex(r => r.toLowerCase() === showKey);
    if (visible) {
      if (idx < 0) {
        visRoom.rooms.push(showKey);
        visRoom.count = visRoom.rooms.length;
      }
    } else {
      if (idx >= 0) {
        visRoom.rooms.splice(idx, 1);
        visRoom.count = visRoom.rooms.length;
      }
    }
  }

  /**
   * Returns true if 'show' is visible from 'whenInside'.
   */
  getVisible(whenInside: string, show: string): boolean {
    const whenKey = whenInside.toLowerCase();
    const showKey = show.toLowerCase();
    if (!this.rooms.has(whenKey) || !this.rooms.has(showKey)) {
      throw new Error('One of the specified rooms does not exist.');
    }
    const visRoom = this.rooms.get(whenKey);
    if (visRoom === undefined) throw new Error('One of the specified rooms does not exist.');
    return visRoom.rooms.some(r => r.toLowerCase() === showKey);
  }

  /**
   * Sets all rooms visible from each other.
   */
  setAllVisible(): void {
    const allRooms = Array.from(this.rooms.keys());
    for (const whenInside of allRooms) {
      const visRoom = this.rooms.get(whenInside);
      if (visRoom === undefined) continue;
      visRoom.rooms = allRooms.filter(r => r !== whenInside);
      visRoom.count = visRoom.rooms.length;
    }
  }

  /**
   * Get a room by name
   * @param name - The name of the room to get
   * @returns The room or null if it is not found
   */
  getRoomByName(name: string): ModuleRoom | null {
    if(!this.area){
      log.warn('VISObject.getRoomByName: No area to process');
      return null;
    }
    return this.area.rooms.find(room => room.roomName.toLocaleLowerCase() === name.toLocaleLowerCase()) || null;
  }

  /**
   * Serialize VIS to binary (ASCII format). Use for saving without writing to file.
   */
  toBuffer(): Uint8Array {
    const data = new BinaryWriter();
    const rooms = Array.from(this.rooms.values());
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const roomCount = room.rooms.length;
      data.writeChars(room.name + ' ' + roomCount);
      data.writeByte(13);
      data.writeByte(10);
      for (let j = 0; j < roomCount; j++) {
        data.writeChars('  ' + room.rooms[j]);
        data.writeByte(13);
        data.writeByte(10);
      }
    }
    return data.buffer;
  }

  /**
   * Export the VISObject to a file
   * @param fileName - The name of the file to export to
   */
  export (fileName = 'm01aa') {
    const buf = this.toBuffer();
    GameFileSystem.writeFile(`${fileName}.vis`, buf).then(() => {});
  }

}

/**
 * Load VIS from buffer (PyKotor read_vis).
 */
export function readVISFromBuffer(buffer: Uint8Array): VISObject {
  return new VISObject(buffer);
}

/**
 * Serialize VIS to buffer (PyKotor bytes_vis).
 */
export function writeVISToBuffer(vis: VISObject): Uint8Array {
  return vis.toBuffer();
}


