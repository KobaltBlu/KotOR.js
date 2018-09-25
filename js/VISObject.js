/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The VisObject class.
 * 
 * CHILD_ROOMS are rooms that are visible from the parent room. The engine will not
 * render rooms that are not present in this list when you are standing in a parent room
 */

class VISObject {

  constructor ( data ) {

    this.rooms = [];

    let decoder = new StringDecoder('utf8');
    let text = decoder.write(data);
    let lines = text.split('\n');
    let lineCount = lines.length;

    let MODES = {
      ROOM: 0,
      CHILD_ROOMS: 1
    };

    let mode = MODES.ROOM;
    let curRoomCount = 0;
    let currentRoom = this.resetRoom();

    for( let i = 0; i < lineCount; i++ ) {
      let line = lines[i].trim();

      if(line.length){

        if(lines[i].substring(0, 2) == '  '){
          mode = MODES.CHILD_ROOMS;
          //CHILD_ROOMS
          currentRoom.rooms.push(line.toLowerCase());
          curRoomCount++;

        }else{
          //ROOM

          //If we are still in CHILD_ROOMS mode and the current line is a room.
          //Push the currentRoom to the rooms array and reset the current room var
          if(mode == MODES.CHILD_ROOMS){
            this.rooms.push(currentRoom);
            currentRoom = this.resetRoom();
          }

          mode = MODES.ROOM;

          console.log(line);
          let args = line.split(' ');

          //room_01 7 /-/ room_name number_of_child_rooms
          currentRoom.name = args[0];
          currentRoom.count = args[1];
          curRoomCount = 0;

        }

      }

    }

    this.rooms.push(currentRoom);
    currentRoom = this.resetRoom();

  }

  GetRooms(){
    return this.rooms;
  }

  GetRoom(room = ''){
    for(let i = 0; i < this.rooms.length; i++){
      if(this.rooms[i].name.toLowerCase() == room.toLowerCase()){
        return this.rooms[i];
      }
    }
    return null;
  }

  GetVisibleRooms(room = ''){

    for(let i = 0; i < this.rooms.length; i++){

      if(this.rooms[i].name == room){
        
        return this.rooms[i].rooms;
      }

    }

    return [];

  }

  //RESET rooms utility
  resetRoom () {

    return {
      name: '',
      count: 0,
      rooms: []
    };

  }

  Export () {

    let data = new BinaryWriter();

    for(let i = 0; i < this.rooms.length; i++){
      let room = this.rooms[i];
      let roomCount = room.rooms.length;

      data.WriteChars(room.name+' '+roomCount);

      data.WriteByte(13); //CarriageReturn
      data.WriteByte(10); //NewLine

      for( let j = 0; j < roomCount; j++ ){
        data.WriteChars('  '+room.rooms[j]);
        if(i < ( this.rooms.length - 1 ) || j < (roomCount - 1)){
          data.WriteByte(13); //CarriageReturn
          data.WriteByte(10); //NewLine
        }
      }

    }

    fs.writeFile('m01aa.vis', data.buffer, (err) => {
      if (err) {
       return console.error(err);
      }
      console.log('VISObject Saved');
    });

  }

}

module.exports = VISObject;
