import { BinaryWriter } from "../utility/binary/BinaryWriter";
import { ModuleObjectType } from "../enums";
import type { ModuleArea, ModuleRoom } from "../module";
import { BitWise } from "../utility/BitWise";
import { GameFileSystem } from "../utility/GameFileSystem";
import type { IVISRoom } from "../interface/module/IVISRoom";

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
  }

  read(data?: Uint8Array){
    console.log('VISObject.read');
    if(data){
      this.data = data;
    }

    if(!this.data){
      console.warn('VISObject.read: No data to read');
      return;
    }

    const text = (new TextDecoder('utf8')).decode(this.data).toLocaleLowerCase();
    const lines = text.split('\n');
    const lineCount = lines.length;

    console.log(`VISObject.read: ${lineCount} lines found`);

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
        console.log(`VISObject.read: Child Room: ${line}`);
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
        console.log(`VISObject.read: Parent Room: ${line}`);
        //If we are still in CHILD_ROOMS mode and the current line is a room.
        //Push the currentRoom to the rooms array and reset the current room var
        if(this.readContext.mode == VISReadMode.CHILD_ROOMS){
          this.resetReadContext();
        }

        this.readContext.mode = VISReadMode.ROOM;

        const args = line.split(' ');

        this.readContext.currentRoom.name = args[0];
        this.readContext.currentRoom.count = parseInt(args[1]);
        this.readContext.linkedRoomCount = 0;
      }
    }

    this.resetReadContext();
    console.log('VISObject.read: Done!');
  }

  /**
   * Add a room to the rooms map
   */
  addRoom(): void {
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
      this.addRoom();
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
      console.warn('VISObject.attachArea: No area to process');
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
   * Get a room by name
   * @param name - The name of the room to get
   * @returns The room or null if it is not found
   */
  getRoomByName(name: string): ModuleRoom | null {
    if(!this.area){
      console.warn('VISObject.getRoomByName: No area to process');
      return null;
    }
    return this.area.rooms.find(room => room.roomName.toLocaleLowerCase() === name.toLocaleLowerCase()) || null;
  }

  /**
   * Export the VISObject to a file
   * @param fileName - The name of the file to export to
   */
  export (fileName = 'm01aa') {
    console.log(`VISObject.export: ${fileName}.vis`);
    const data = new BinaryWriter();

    const rooms = Array.from(this.rooms.values());
    console.log(`VISObject.export: ${rooms.length} rooms found`);

    /**
     * Write the rooms to the output buffer
     */
    for(let i = 0; i < rooms.length; i++){
      const room = rooms[i];
      const roomCount = room.rooms.length;
      console.log(`VISObject.export: ${room.name} - ${roomCount} child rooms`);

      data.writeChars(room.name+' '+roomCount);

      data.writeByte(13); //CarriageReturn
      data.writeByte(10); //NewLine

      /**
       * Write the child rooms to the output buffer
       */
      for( let j = 0; j < roomCount; j++ ){
        console.log(`VISObject.export: ${room.rooms[j]}`);
        data.writeChars('  '+room.rooms[j]);
        if(i < ( rooms.length - 1 ) || j < (roomCount - 1)){
          data.writeByte(13); //CarriageReturn
          data.writeByte(10); //NewLine
        }
      }

    }

    /**
     * Write the output buffer to a file
     */
    GameFileSystem.writeFile(`${fileName}.vis`, data.buffer).then( () => {
      console.log(`VISObject.export: ${fileName}.vis saved`);
    });

  }

}


