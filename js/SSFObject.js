class SSFObject {

  constructor( data = null ){
    this.data = data;
    this.sound_refs = [];

    this.Open(this.data);

  }

  Open( data = null ){

    this.data = data;
    this.sound_refs = [];

    if(this.data instanceof Buffer){

      let reader = new BinaryReader(this.data);
      this.FileType = reader.ReadChars(4);
      this.FileVersion = reader.ReadChars(4);
      let unknown = reader.ReadUInt32(); //Always 12?

      let soundCount = (this.data.length - 12) / 4;
      for(let i = 0; i < soundCount; i++){
        this.sound_refs.push(reader.ReadUInt32() & 0xFFFFFFFF);
      }

      this.data = undefined;
      reader = undefined;

    }

  }

  GetSoundResRef(type = -1){

    if(type > -1 && type < 28){
      let tlk = Global.kotorTLK.TLKStrings[this.sound_refs[type]];
      if(tlk){
        return tlk.SoundResRef;
      }
    }

    return '';
  }

}

SSFObject.TYPES = {
  BATTLE_CRY_1: 0,
  BATTLE_CRY_2: 1,
  BATTLE_CRY_3: 2,
  BATTLE_CRY_4: 3,
  BATTLE_CRY_5: 4,
  BATTLE_CRY_6: 5,
  SELECT_1: 6,
  SELECT_2: 7,
  SELECT_3: 8,
  ATTACK_1: 9,
  ATTACK_2: 10,
  ATTACK_3: 11,
  PAIN_1: 12,
  PAIN_2: 13,
  LOW_HEALTH: 14,
  DEAD: 15,
  CRITICAL_HIT: 16,
  TARGET_IMMUNE: 17,
  LAY_MINE: 18,
  DISARM_MINE: 19,
  STEALTH: 20,
  SEARCH: 21,
  UNLOCK: 22,
  UNLOCK_FAIL: 23,
  UNLOCK_SUCCESS: 24,
  SOLO_MODE: 25,
  PARTY_MODE: 26,
  POISONED: 27,
}

module.exports = SSFObject;