export enum AreaTerrainFlag {
  INTERIOR = 0x0001,    // interior (exterior if unset)
  UNDERGROUND = 0x0002, // underground (aboveground if unset)
  NATURAL = 0x0004,     // (urban if unset)
}