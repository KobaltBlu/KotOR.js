/**
 * TLK string data element flags (Table 3.3.2).
 */
export enum TLKStringFlags {
  /** StrRef has text in the string-data section. */
  TEXT_PRESENT = 0x0001,
  /** StrRef has a SoundResRef in the file. */
  SND_PRESENT = 0x0002,
  /** StrRef has a SoundLength value in the file. */
  SNDLENGTH_PRESENT = 0x0004,
}
