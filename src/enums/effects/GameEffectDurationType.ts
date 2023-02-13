
//--------------------------//
// GameEffect DurationTypes
//--------------------------//

export enum GameEffectDurationType {
  INSTANT   = 0x00,
  TEMPORARY = 0x01,
  PERMANENT = 0x02,
  EQUIPPED  = 0x03,
  INNATE    = 0x04,

  MASK      = 0x07,
};