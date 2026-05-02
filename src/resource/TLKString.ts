import { BinaryReader } from '@/utility/binary/BinaryReader';

/**
 * TLKString class.
 * One talk-table row after header parsing; field layout follows the TLK format consumed alongside TLKObject.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TLKString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** Row shape for TLKString.FromDB / FromDBObj (e.g. database or serialized). */
export interface TLKStringDBRow {
  flags: number;
  SoundResRef: string;
  VolumeVariance: number;
  PitchVariance: number;
  Value: string;
}

export class TLKString {
  // public flags: number;
  // public SoundResRef: string;

  constructor(
    public flags: number,
    public SoundResRef: string,
    public VolumeVariance: number,
    public PitchVariance: number,
    public StringOffset: number,
    public StringLength: number,
    public SoundLength: number,
    public Value: string | undefined = undefined
  ) {
    // this.flags = flags;
    // this.SoundResRef = SoundResRef;
    // this.VolumeVariance = VolumeVariance;
    // this.PitchVariance = PitchVariance;
    // this.StringOffset = StringOffset;
    // this.StringLength = StringLength;
    // this.SoundLength = SoundLength;
    // this.Value = Value;
  }

  GetValue(binary: BinaryReader, onReturn?: (value: string) => void) {
    if (this.Value == null) {
      const pos = binary.tell();
      binary.seek(this.StringOffset);
      this.Value = binary.readChars(this.StringLength).replace(/\0[\s\S]*$/g, '');
      if (onReturn != null) onReturn(this.Value);
      binary.seek(pos);
    }
  }

  ToDB(): TLKStringDBRow {
    return {
      flags: this.flags,
      SoundResRef: this.SoundResRef,
      VolumeVariance: this.VolumeVariance,
      PitchVariance: this.PitchVariance,
      Value: (this.Value ?? '').replace(/\0[\s\S]*$/g, ''),
    };
  }

  FromDB(row: TLKStringDBRow): void {
    this.flags = row.flags;
    this.SoundResRef = row.SoundResRef;
    this.VolumeVariance = row.VolumeVariance;
    this.PitchVariance = row.PitchVariance;
    this.Value = row.Value.replace(/\0[\s\S]*$/g, '');
  }

  static FromDBObj(row: TLKStringDBRow): TLKString {
    return new TLKString(
      row.flags,
      row.SoundResRef,
      row.VolumeVariance,
      row.PitchVariance,
      0,
      row.Value.length,
      0,
      row.Value
    );
  }
}
