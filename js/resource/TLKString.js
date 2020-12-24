/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TLKString class.
 */

class TLKString {

  constructor(flags, SoundResRef, VolumeVariance, PitchVariance, StringOffset, StringLength, SoundLength, Value = null) {
    this.flags = flags;
    this.SoundResRef = SoundResRef;
    this.VolumeVariance = VolumeVariance;
    this.PitchVariance = PitchVariance;
    this.StringOffset = StringOffset;
    this.StringLength = StringLength;
    this.SoundLength = SoundLength;
    this.Value = Value;
  }

  GetValue(binary, onReturn) {
    if(this.Value == null) {
      let pos = binary.Tell();
      binary.Seek(this.StringOffset);
      this.Value = binary.ReadChars(this.StringLength).replace(/\0[\s\S]*$/g,'');
      if(onReturn != null)
        onReturn(this.Value);
      binary.Seek(pos);
    }
  }

  ToDB() {
    return {
      flags: this.flags,
      SoundResRef: this.SoundResRef,
      VolumeVariance: this.VolumeVariance,
      PitchVariance: this.PitchVariance,
      Value: this.Value.replace(/\0[\s\S]*$/g,'')
    };
  }

  FromDB(row) {
    this.flags = row.flags;
    this.SoundResRef = row.SoundResRef;
    this.VolumeVariance = row.VolumeVariance;
    this.PitchVariance = row.PitchVariance;
    this.Value = row.Value.replace(/\0[\s\S]*$/g,'');
  }

  static FromDBObj (row) {
    return new TLKString(row.flags, row.SoundResRef, row.VolumeVariance, row.PitchVariance, 0, row.Value.length, 0, row.Value);
  }

}

module.exports = TLKString;
