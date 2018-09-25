/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The SoundsetObject class.
 */

class SoundsetObject {

  constructor(binary){

    this.sounds = [];

    let reader = new BinaryReader(binary);

    this.FileType = reader.ReadChars(4);
    this.FileVersion = reader.ReadChars(4);
    this.SoundCount = reader.ReadUInt32();

    for(let i = 0; i < 40; i++){
      this.sounds.push(reader.ReadUInt32());
    }

    reader = null;

  }

}
module.exports = SoundsetObject;