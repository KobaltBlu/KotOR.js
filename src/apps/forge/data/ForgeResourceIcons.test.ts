import {
  getResourceIconId,
  getResourceIconPath,
  RESOURCE_ICON_BY_EXTENSION,
  RESOURCE_ICON_PATH_PREFIX,
} from '@/apps/forge/data/ForgeResourceIcons';

describe('ForgeResourceIcons', () => {
  describe('getResourceIconId', () => {
    it('returns known icon id for extension', () => {
      expect(getResourceIconId('2da')).toBe('k1_2da');
      expect(getResourceIconId('wav')).toBe('k1_sound');
      expect(getResourceIconId('utc')).toBe('k1_creature');
      expect(getResourceIconId('tpc')).toBe('k2_texture');
      expect(getResourceIconId('bmp')).toBe('k2_texture');
      expect(getResourceIconId('dds')).toBe('k2_texture');
    });

    it('normalizes extension (lowercase, no dot)', () => {
      expect(getResourceIconId('.2DA')).toBe('k1_2da');
      expect(getResourceIconId('GFF')).toBe('k1_blank');
    });

    it('returns k1_blank for unknown extension', () => {
      expect(getResourceIconId('xyz')).toBe('k1_blank');
      expect(getResourceIconId('')).toBe('k1_blank');
    });
  });

  describe('getResourceIconPath', () => {
    it('returns path with prefix and .png', () => {
      expect(getResourceIconPath('2da')).toBe(`${RESOURCE_ICON_PATH_PREFIX}k1_2da.png`);
      expect(getResourceIconPath('wav')).toBe(`${RESOURCE_ICON_PATH_PREFIX}k1_sound.png`);
    });

    it('uses assets/icons/ prefix', () => {
      expect(RESOURCE_ICON_PATH_PREFIX).toBe('assets/icons/');
    });
  });

  it('RESOURCE_ICON_BY_EXTENSION has entries for common types', () => {
    expect(RESOURCE_ICON_BY_EXTENSION['2da']).toBe('k1_2da');
    expect(RESOURCE_ICON_BY_EXTENSION['dlg']).toBe('k1_dialog');
    expect(RESOURCE_ICON_BY_EXTENSION['gff']).toBe('k1_blank');
    expect(RESOURCE_ICON_BY_EXTENSION['vis']).toBe('k1_blank');
  });
});
