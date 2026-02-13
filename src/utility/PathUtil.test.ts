import { getExtension, getSidecarPath, normalizePath, withSuffix } from './PathUtil';

describe('PathUtil', () => {
  describe('getExtension', () => {
    it('returns extension in lowercase without dot', () => {
      expect(getExtension('foo.tpc')).toBe('tpc');
      expect(getExtension('bar.TGA')).toBe('tga');
      expect(getExtension('a/b/c.2da')).toBe('2da');
    });

    it('handles backslashes', () => {
      expect(getExtension('a\\b\\c.txi')).toBe('txi');
    });

    it('returns empty string when no extension', () => {
      expect(getExtension('noext')).toBe('');
      expect(getExtension('path/to/file')).toBe('');
    });
  });

  describe('withSuffix', () => {
    it('replaces existing extension', () => {
      expect(withSuffix('tex.dds', 'txi')).toBe('tex.txi');
      expect(withSuffix('a/b/foo.tpc', 'tga')).toBe('a/b/foo.tga');
    });

    it('appends when no extension', () => {
      expect(withSuffix('file', 'tpc')).toBe('file.tpc');
    });

    it('accepts suffix with leading dot', () => {
      expect(withSuffix('a.tpc', '.txi')).toBe('a.txi');
    });
  });

  describe('normalizePath', () => {
    it('replaces backslashes with forward slashes', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    });
  });

  describe('getSidecarPath', () => {
    it('returns path with sidecar extension', () => {
      expect(getSidecarPath('textures/foo.tpc', 'txi')).toBe('textures/foo.txi');
      expect(getSidecarPath('foo.tga', 'txi')).toBe('foo.txi');
    });
  });
});
