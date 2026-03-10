import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders/ResourceLoader";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { TwoDARegistry } from "@/apps/forge/data/TwoDARegistry";

/**
 * InstallationRegistry – typed, lazy-loading 2DA cache for Forge editors.
 *
 * Instead of re-implementing resource lookup from scratch, this class wraps
 * the existing TwoDAManager.datatables (populated at game init) and falls back
 * to ResourceLoader for on-demand loads when a table is not yet cached (e.g.
 * in the forge editor before a full game init has run).
 *
 * Usage:
 *   const tbl = await InstallationRegistry.get2DA(TwoDARegistry.BASEITEMS);
 *   const row = tbl?.getRowByColumnValue('label', 'ITEM_VIBROBLADE');
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file InstallationRegistry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InstallationRegistry {
  /** In-editor 2DA cache: resname (lowercase) → TwoDAObject */
  private static _cache2da: Map<string, TwoDAObject> = new Map();

  /** Track in-flight loads to avoid duplicate ResourceLoader calls */
  private static _pending: Map<string, Promise<TwoDAObject | null>> = new Map();

  // ── Registry keys (mirrors TwoDARegistry constants) ─────────────────────
  // All resnames are lowercase, matching the game's file naming convention.
  static readonly APPEARANCES   = TwoDARegistry.APPEARANCES;
  static readonly BASEITEMS     = TwoDARegistry.BASEITEMS;
  static readonly CAMERAS       = TwoDARegistry.CAMERAS;
  static readonly CLASSES       = TwoDARegistry.CLASSES;
  static readonly CLASSPOWERGAIN = TwoDARegistry.CLASSPOWERGAIN;
  static readonly COMBATANIMATIONS = TwoDARegistry.COMBATANIMATIONS;
  static readonly CREATURESPEED = TwoDARegistry.CREATURESPEED;
  static readonly CURSORS       = TwoDARegistry.CURSORS;
  static readonly DIALOG_ANIMS  = TwoDARegistry.DIALOG_ANIMS;
  static readonly DOORS         = TwoDARegistry.DOORS;
  static readonly EMOTIONS      = TwoDARegistry.EMOTIONS;
  static readonly ENC_DIFFICULTIES = TwoDARegistry.ENC_DIFFICULTIES;
  static readonly EXPRESSIONS   = TwoDARegistry.EXPRESSIONS;
  static readonly FACTIONS      = TwoDARegistry.FACTIONS;
  static readonly FEATS         = TwoDARegistry.FEATS;
  static readonly GENDERS       = TwoDARegistry.GENDERS;
  static readonly IPRP_ABILITIES   = TwoDARegistry.IPRP_ABILITIES;
  static readonly IPRP_ACMODTYPE   = TwoDARegistry.IPRP_ACMODTYPE;
  static readonly IPRP_ALIGNGRP    = TwoDARegistry.IPRP_ALIGNGRP;
  static readonly IPRP_AMMOTYPE    = TwoDARegistry.IPRP_AMMOTYPE;
  static readonly IPRP_COMBATDAM   = TwoDARegistry.IPRP_COMBATDAM;
  static readonly IPRP_COSTTABLE   = TwoDARegistry.IPRP_COSTTABLE;
  static readonly IPRP_DAMAGETYPE  = TwoDARegistry.IPRP_DAMAGETYPE;
  static readonly IPRP_IMMUNITY    = TwoDARegistry.IPRP_IMMUNITY;
  static readonly IPRP_MONSTERHIT  = TwoDARegistry.IPRP_MONSTERHIT;
  static readonly IPRP_ONHIT       = TwoDARegistry.IPRP_ONHIT;
  static readonly IPRP_PARAMTABLE  = TwoDARegistry.IPRP_PARAMTABLE;
  static readonly IPRP_PROTECTION  = TwoDARegistry.IPRP_PROTECTION;
  static readonly IPRP_SAVEELEMENT = TwoDARegistry.IPRP_SAVEELEMENT;
  static readonly IPRP_SAVINGTHROW = TwoDARegistry.IPRP_SAVINGTHROW;
  static readonly IPRP_WALK        = TwoDARegistry.IPRP_WALK;
  static readonly ITEM_PROPERTIES  = TwoDARegistry.ITEM_PROPERTIES;
  static readonly PERCEPTIONS  = TwoDARegistry.PERCEPTIONS;
  static readonly PLACEABLES   = TwoDARegistry.PLACEABLES;
  static readonly PLANETS      = TwoDARegistry.PLANETS;
  static readonly PLOT         = TwoDARegistry.PLOT;
  static readonly PORTRAITS    = TwoDARegistry.PORTRAITS;
  static readonly POWERS       = TwoDARegistry.POWERS;
  static readonly RACES        = TwoDARegistry.RACES;
  static readonly SKILLS       = TwoDARegistry.SKILLS;
  static readonly SOUNDSETS    = TwoDARegistry.SOUNDSETS;
  static readonly SPEEDS       = TwoDARegistry.SPEEDS;
  static readonly SUBRACES     = TwoDARegistry.SUBRACES;
  static readonly TRAPS        = TwoDARegistry.TRAPS;
  static readonly UPGRADES     = TwoDARegistry.UPGRADES;
  static readonly VIDEO_EFFECTS = TwoDARegistry.VIDEO_EFFECTS;

  // ── Game-type detection ──────────────────────────────────────────────────

  /** Returns true when the active game is TSL (KotOR II). */
  static isTSL(): boolean {
    return GameState.GameKey === GameEngineType.TSL;
  }

  // ── Core cache access ────────────────────────────────────────────────────

  /**
   * Get a 2DA table by canonical resname (e.g. InstallationRegistry.BASEITEMS).
   *
   * Resolution order:
   *   1. Local editor cache (_cache2da)
   *   2. TwoDAManager.datatables (populated by full game init)
   *   3. ResourceLoader async fetch (override→global)
   *
   * Returns null if the table cannot be found in any source.
   */
  static async get2DA(resname: string): Promise<TwoDAObject | null> {
    const key = resname.toLowerCase();

    // 1. Editor cache hit
    if (InstallationRegistry._cache2da.has(key)) {
      return InstallationRegistry._cache2da.get(key)!;
    }

    // 2. TwoDAManager already has it (game is fully initialised)
    const managerTbl = GameState?.TwoDAManager?.datatables?.get(key);
    if (managerTbl) {
      InstallationRegistry._cache2da.set(key, managerTbl);
      return managerTbl;
    }

    // 3. Deduplicate concurrent loads
    if (InstallationRegistry._pending.has(key)) {
      return InstallationRegistry._pending.get(key)!;
    }

    const load = InstallationRegistry._fetchFromResourceLoader(key);
    InstallationRegistry._pending.set(key, load);
    const result = await load;
    InstallationRegistry._pending.delete(key);
    return result;
  }

  /**
   * Synchronous fast-path: returns from cache only (no async load).
   * Useful within React renders; callers must ensure the table was
   * pre-warmed with get2DA() or prefetch() beforehand.
   */
  static get2DASync(resname: string): TwoDAObject | null {
    const key = resname.toLowerCase();
    if (InstallationRegistry._cache2da.has(key)) {
      return InstallationRegistry._cache2da.get(key)!;
    }
    return GameState?.TwoDAManager?.datatables?.get(key) ?? null;
  }

  /**
   * Pre-warm multiple 2DA tables in parallel.
   * Call this during editor tab initialisation (e.g. in useEffect / openFile).
   *
   *   await InstallationRegistry.prefetch([
   *     InstallationRegistry.BASEITEMS,
   *     InstallationRegistry.APPEARANCES,
   *   ]);
   */
  static async prefetch(resnames: string[]): Promise<void> {
    await Promise.all(resnames.map((n) => InstallationRegistry.get2DA(n)));
  }

  /** Invalidate a specific 2DA from the editor cache (e.g. after override reload). */
  static invalidate(resname: string): void {
    InstallationRegistry._cache2da.delete(resname.toLowerCase());
  }

  /** Clear the entire editor-level 2DA cache. */
  static clearCache(): void {
    InstallationRegistry._cache2da.clear();
  }

  // ── Typed convenience getters (named after registry keys) ────────────────
  // These remove the need for string literals in editors.

  static appearances()     { return InstallationRegistry.get2DASync(TwoDARegistry.APPEARANCES); }
  static baseItems()       { return InstallationRegistry.get2DASync(TwoDARegistry.BASEITEMS); }
  static cameras()         { return InstallationRegistry.get2DASync(TwoDARegistry.CAMERAS); }
  static classes()         { return InstallationRegistry.get2DASync(TwoDARegistry.CLASSES); }
  static feats()           { return InstallationRegistry.get2DASync(TwoDARegistry.FEATS); }
  static genders()         { return InstallationRegistry.get2DASync(TwoDARegistry.GENDERS); }
  static itemProperties()  { return InstallationRegistry.get2DASync(TwoDARegistry.ITEM_PROPERTIES); }
  static placeables()      { return InstallationRegistry.get2DASync(TwoDARegistry.PLACEABLES); }
  static planets()         { return InstallationRegistry.get2DASync(TwoDARegistry.PLANETS); }
  static portraits()       { return InstallationRegistry.get2DASync(TwoDARegistry.PORTRAITS); }
  static powers()          { return InstallationRegistry.get2DASync(TwoDARegistry.POWERS); }
  static races()           { return InstallationRegistry.get2DASync(TwoDARegistry.RACES); }
  static skills()          { return InstallationRegistry.get2DASync(TwoDARegistry.SKILLS); }
  static soundsets()       { return InstallationRegistry.get2DASync(TwoDARegistry.SOUNDSETS); }

  // ── Row helper methods ───────────────────────────────────────────────────

  /**
   * Get a cell value from a 2DA by row index + column name.
   * Returns null if table not loaded or row/column missing.
   */
  static getCell(resname: string, rowIndex: number, column: string): string | null {
    const tbl = InstallationRegistry.get2DASync(resname);
    if (!tbl) return null;
    const row = tbl.rows[rowIndex];
    if (!row) return null;
    const val = row[column];
    return (val === undefined || val === '****') ? null : String(val);
  }

  /**
   * Get all rows from a 2DA table as an array.
   * Each item is the raw row object from TwoDAObject.rows.
   */
  static getRows(resname: string): any[] {
    const tbl = InstallationRegistry.get2DASync(resname);
    if (!tbl) return [];
    return Object.values(tbl.rows);
  }

  /**
   * Find the first row where a column equals a given value.
   * Returns null if not found.
   */
  static findRowByColumn(resname: string, column: string, value: string): any | null {
    const tbl = InstallationRegistry.get2DASync(resname);
    if (!tbl) return null;
    for (const row of Object.values(tbl.rows) as any[]) {
      if (String(row[column]) === value) return row;
    }
    return null;
  }

  /**
   * Get the row index where a column equals a given value.
   * Returns -1 if not found.
   */
  static findRowIndexByColumn(resname: string, column: string, value: string): number {
    const tbl = InstallationRegistry.get2DASync(resname);
    if (!tbl) return -1;
    for (const [, row] of Object.entries(tbl.rows) as [string, any][]) {
      if (String(row[column]) === value) return row['__index'] ?? -1;
    }
    return -1;
  }

  /**
   * Build an array of label strings for a dropdown from a 2DA column.
   * Rows where the column value is '****' or empty are represented as `fallback`.
   *
   *   const options = InstallationRegistry.getColumnOptions(
   *     InstallationRegistry.APPEARANCES, 'label', '(none)'
   *   );
   */
  static getColumnOptions(
    resname: string,
    column: string,
    fallback = '(none)',
  ): Array<{ index: number; label: string }> {
    const tbl = InstallationRegistry.get2DASync(resname);
    if (!tbl) return [];
    return (Object.values(tbl.rows) as any[]).map((row) => {
      const raw = row[column];
      const label = (!raw || raw === '****') ? fallback : String(raw);
      return { index: row['__index'] as number, label };
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private static async _fetchFromResourceLoader(key: string): Promise<TwoDAObject | null> {
    try {
      const buffer = await ResourceLoader.loadResource(ResourceTypes['2da'], key);
      if (!buffer) return null;
      const tbl = new TwoDAObject(buffer);
      InstallationRegistry._cache2da.set(key, tbl);
      return tbl;
    } catch {
      return null;
    }
  }
}
