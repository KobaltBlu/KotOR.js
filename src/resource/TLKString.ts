import { TLKStringFlags } from "@/enums/resource/TLKStringFlags";

/**
 * TLKString class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TLKString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TLKString {

  /** Lazily cached lowercase text for case-insensitive search; invalidated on mutation. */
  private _searchTextLower: string | null = null;
  /** Lazily cached lowercase SoundResRef for case-insensitive search. */
  private _searchResRefLower: string | null = null;

  constructor(
    public flags: number,
    public SoundResRef: any,
    public VolumeVariance: number,
    public PitchVariance: number,
    public StringOffset: number,
    public StringLength: number,
    public SoundLength: number,
    public Value: string = ''
  ) {}

  invalidateSearchCache(): void {
    this._searchTextLower = null;
    this._searchResRefLower = null;
  }

  /**
   * Lowercase text haystack for search. Uses Value when TEXT_PRESENT is set
   * (no per-call regex); empty when text is not present.
   */
  getSearchTextLower(): string {
    if (this._searchTextLower === null) {
      this._searchTextLower = this.hasTextPresent() ? (this.Value ?? '').toLowerCase() : '';
    }
    return this._searchTextLower;
  }

  /** Lowercase SoundResRef haystack for search when SND_PRESENT is set. */
  getSearchResRefLower(): string {
    if (this._searchResRefLower === null) {
      this._searchResRefLower = this.hasSoundPresent()
        ? String(this.SoundResRef ?? '').trim().toLowerCase()
        : '';
    }
    return this._searchResRefLower;
  }

  /** Raw text used for case-sensitive search (no allocation beyond the string itself). */
  getSearchText(): string {
    return this.hasTextPresent() ? (this.Value ?? '') : '';
  }

  getSearchResRef(): string {
    return this.hasSoundPresent() ? String(this.SoundResRef ?? '').trim() : '';
  }

  hasTextPresent(): boolean {
    return (this.flags & TLKStringFlags.TEXT_PRESENT) !== 0;
  }

  hasSoundPresent(): boolean {
    return (this.flags & TLKStringFlags.SND_PRESENT) !== 0;
  }

  hasSoundLengthPresent(): boolean {
    return (this.flags & TLKStringFlags.SNDLENGTH_PRESENT) !== 0;
  }

  /** Text exposed to the engine when TEXT_PRESENT is set; otherwise empty. */
  getDisplayText(): string {
    if (!this.hasTextPresent()) return '';
    return (this.Value ?? '').replace(/\0[\s\S]*$/g, '');
  }

  /** SoundResRef exposed when SND_PRESENT is set; otherwise empty. */
  getDisplaySoundResRef(): string {
    if (!this.hasSoundPresent()) return '';
    return String(this.SoundResRef ?? '').replace(/\0[\s\S]*$/g, '').trim();
  }

  /** SoundLength exposed when SNDLENGTH_PRESENT is set; otherwise 0. */
  getDisplaySoundLength(): number {
    if (!this.hasSoundLengthPresent()) return 0;
    return this.SoundLength >>> 0;
  }

  setFlag(flag: TLKStringFlags, enabled: boolean): void {
    if (enabled) {
      this.flags |= flag;
    } else {
      this.flags &= ~flag;
    }
    this.flags >>>= 0;
    this.applyFlagsToFields();
  }

  /** Clear fields that are not present per the current flag bits. */
  applyFlagsToFields(): void {
    if (!this.hasTextPresent()) {
      this.Value = '';
      this.StringLength = 0;
    }
    if (!this.hasSoundPresent()) {
      this.SoundResRef = '';
    }
    if (!this.hasSoundLengthPresent()) {
      this.SoundLength = 0;
    }
    this.invalidateSearchCache();
  }

  /** Update TEXT_PRESENT / SND_PRESENT / SNDLENGTH_PRESENT from current field values. */
  syncFlagsFromContent(): void {
    const text = (this.Value ?? '').replace(/\0[\s\S]*$/g, '');
    const sound = String(this.SoundResRef ?? '').replace(/\0[\s\S]*$/g, '').trim();

    this.flags &= ~(TLKStringFlags.TEXT_PRESENT | TLKStringFlags.SND_PRESENT | TLKStringFlags.SNDLENGTH_PRESENT);
    if (text.length > 0) {
      this.flags |= TLKStringFlags.TEXT_PRESENT;
    }
    if (sound.length > 0) {
      this.flags |= TLKStringFlags.SND_PRESENT;
    }
    if ((this.SoundLength >>> 0) > 0) {
      this.flags |= TLKStringFlags.SNDLENGTH_PRESENT;
    }
    this.flags >>>= 0;
    this.invalidateSearchCache();
  }

  ToDB() {
    return {
      flags: this.flags,
      SoundResRef: this.SoundResRef,
      VolumeVariance: this.VolumeVariance,
      PitchVariance: this.PitchVariance,
      SoundLength: this.SoundLength,
      Value: this.Value.replace(/\0[\s\S]*$/g,'')
    };
  }

  FromDB(row: any) {
    this.flags = row.flags;
    this.SoundResRef = row.SoundResRef;
    this.VolumeVariance = row.VolumeVariance;
    this.PitchVariance = row.PitchVariance;
    this.SoundLength = row.SoundLength ?? 0;
    this.Value = row.Value.replace(/\0[\s\S]*$/g,'');
    this.applyFlagsToFields();
  }

  static FromDBObj(row: any) {
    const entry = new TLKString(
      row.flags,
      row.SoundResRef,
      row.VolumeVariance,
      row.PitchVariance,
      0,
      row.Value?.length ?? 0,
      row.SoundLength ?? 0,
      row.Value ?? '',
    );
    entry.applyFlagsToFields();
    return entry;
  }

  static createEmpty(): TLKString {
    return new TLKString(0, '', 0, 0, 0, 0, 0, '');
  }

}
