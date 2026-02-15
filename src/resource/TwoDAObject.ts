import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { createScopedLogger, LogScope } from "@/utility/Logger";
const log = createScopedLogger(LogScope.Resource);

/** Blank cell token in 2DA files. */
export const TWODA_BLANK = '****';

/** Detected 2DA format from buffer (PyKotor twoda_auto.detect_2da). */
export type TwoDAFormat = '2da' | 'csv' | 'json' | 'invalid';

/** Format for writing 2DA (excludes 'invalid'). */
export type WriteTwoDAFormat = '2da' | 'csv' | 'json';

/**
 * Detect 2DA data format from buffer (PyKotor detect_2da).
 * Does not guarantee data integrity.
 */
export function detectTwoDAFormat(buffer: Uint8Array): TwoDAFormat {
  if (!buffer || buffer.length < 4) return 'invalid';
  const first4 = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (first4 === '2DA ') return '2da';
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(256, buffer.length)));
  if (decoded.includes('{')) return 'json';
  if (decoded.includes(',')) return 'csv';
  return 'invalid';
}

/**
 * A single row in a 2DA table with typed accessors (string, int, float).
 * Returned by TwoDAObject.getRow() / findRow().
 */
export class TwoDARow {
  constructor(
    public readonly rowLabel: string,
    public readonly rowIndex: number,
    private _data: Record<string, string | number>,
    private _columns: string[],
  ) {}

  label(): string {
    return this.rowLabel;
  }

  getString(header: string): string {
    if (header !== '__rowlabel' && header !== '__index' && !this._columns.includes(header)) {
      throw new Error(`Column '${header}' does not exist.`);
    }
    const v = this._data[header];
    return v === undefined ? '' : String(v);
  }

  getInteger(header: string, defaultVal?: number): number | undefined {
    const cell = this.getString(header);
    if (cell === '' || cell === TWODA_BLANK) return defaultVal;
    const parsed = cell.startsWith('0x') ? parseInt(cell, 16) : parseInt(cell, 10);
    return isNaN(parsed) ? defaultVal : parsed;
  }

  getFloat(header: string, defaultVal?: number): number | undefined {
    const cell = this.getString(header);
    if (cell === '' || cell === TWODA_BLANK) return defaultVal;
    const parsed = parseFloat(cell);
    return isNaN(parsed) ? defaultVal : parsed;
  }

  setString(header: string, value: string | null): void {
    if (header !== '__rowlabel' && header !== '__index' && !this._columns.includes(header)) {
      throw new Error(`Column '${header}' does not exist.`);
    }
    this._data[header] = value == null ? '' : String(value);
  }

  setInteger(header: string, value: number | null): void {
    this.setString(header, value == null ? '' : String(value));
  }

  setFloat(header: string, value: number | null): void {
    this.setString(header, value == null ? '' : String(value));
  }

  /** Raw row data (column -> cell). Mutations persist to the parent 2DA. */
  get data(): Record<string, string | number> {
    return this._data;
  }

  /** Whether this row has a value for the given header (PyKotor has_string). */
  hasString(header: string): boolean {
    return header === '__rowlabel' || header === '__index' || this._columns.includes(header);
  }

  /** Batch update cell values; keys are column headers (PyKotor update_values). */
  updateValues(values: Record<string, string>): void {
    for (const [column, cell] of Object.entries(values)) {
      this.setString(column, cell);
    }
  }
}

/**
 * TwoDAObject class.
 *
 * Class representing a 2D Array file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TwoDAObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** Internal row shape: __index, __rowlabel, and dynamic column names (string values). */
export interface ITwoDARowData {
  __index: number;
  __rowlabel: string;
  [column: string]: string | number;
}

/** Alias for row data; exported from resource index. */
export type TwoDARowData = ITwoDARowData;

/** JSON input for fromJSON (PyKotor { headers, rows } or legacy { rows }). */
export interface TwoDAJSONInput {
  headers?: string[];
  rows?: Array<{ label?: string; _id?: string; cells?: string[]; [key: string]: string | string[] | undefined }>;
}

export class TwoDAObject {

  file: Uint8Array|string|undefined = undefined;
  FileType: string;
  FileVersion: string;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
  columns: string[];
  rows: Record<string, ITwoDARowData> = {};
  /** O(1) lookup: row label -> row index (for findRow). */
  private _labelToIndex: Map<string, number> = new Map();

  /**
   * Constructor for the TwoDAObject class
   * @param file - The file to read from
   * @param onComplete - The function to call when the 2DA object is loaded
   */
  constructor(file: Uint8Array|string|undefined = undefined, onComplete?: (obj: TwoDAObject) => void){
    this.file = file;
    this.columns = ["__rowlabel"];
    this.ColumnCount = 0;
    this.RowCount = 0;
    this.CellCount = 0;
    this.rows = {};

    if(file){
      if(file instanceof Uint8Array) {
        const br = new BinaryReader(file);
        this.read2DA(br);

        if(onComplete != null)
          onComplete(this);
      }else if(typeof file === "string"){
        this.file = file;
        GameFileSystem.readFile(this.file).then((buffer) => {
          const br = new BinaryReader(buffer);
          this.read2DA(br);

          if(onComplete != null)
            onComplete(this);
        }).catch((err) => {
          throw err;
        });
      }else{
        //invalid resource
      }
    }else{
      //invalid resource
    }
  }

  /**
   * Read the 2DA object from a binary reader
   * @param br - The binary reader to read from
   */
  read2DA(br: BinaryReader): void {
    this.FileType = br.readChars(4);
    this.FileVersion = br.readChars(4);

    br.position += 1; // Newline (skip)

    let str = "";
    let ch;
    this.columns = ["__rowlabel"];
    while ((ch = br.readChar()).charCodeAt(0) != 0){
      if(ch.charCodeAt(0) != 9){
        str = str + ch;
      }else{
        this.columns.push(str);
        str = '';
      }
    }

    this.ColumnCount = this.columns.length - 1;
    this.RowCount = br.readUInt32();

    //Get the row index numbers
    const RowIndexes = [];
    for (let i = 0; i < this.RowCount; i++){
      let rowIndex = "";
      let c;

      while ((c = br.readChar()).charCodeAt(0) != 9){
        rowIndex = rowIndex + c;
      }

      RowIndexes[i] = (rowIndex);
    }

    //Get the Row Data Offsets
    this.CellCount = this.ColumnCount * this.RowCount;
    const offsets = [];
    for (let i = 0; i < this.CellCount; i++){
      offsets[i] = br.readUInt16();
    }

    const _dataSize = br.readUInt16();
    const dataOffset = br.position;

    //Get the Row Data
    for (let i = 0; i < this.RowCount; i++){

      const row: ITwoDARowData = { "__index": i, "__rowlabel": RowIndexes[i] };

      for (let j = 0; j < this.ColumnCount; j++){

        const offset = dataOffset + offsets[i * this.ColumnCount + j];

        try{
          br.position = offset;
        }catch(e){
          log.error(e);
          throw e;
        }

        let token = "";
        let c;

        while((c = br.readChar()).charCodeAt(0) != 0)
          token = token + c;

        if(token == "")
          token = "****";

        row[this.columns[j+1]] = token;
      }

      this.rows[i] = row;
      this._labelToIndex.set(String(RowIndexes[i]).toLowerCase(), i);
    }
  }

  /** Number of rows (height). */
  getHeight(): number {
    return this.RowCount ?? Object.keys(this.rows).length;
  }

  /** Number of data columns (width), excluding __rowlabel. */
  getWidth(): number {
    return this.ColumnCount ?? (this.columns ? this.columns.length - 1 : 0);
  }

  /** Returns [height, width]. */
  getShape(): [number, number] {
    return [this.getHeight(), this.getWidth()];
  }

  /** Get row by numeric index (0-based). Returns TwoDARow or undefined. Mutations via the row update this 2DA. */
  getRow(rowIndex: number): TwoDARow | undefined {
    const row = this.rows[rowIndex];
    if (row == null) return undefined;
    const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
    return new TwoDARow(
      row['__rowlabel'] ?? String(rowIndex),
      rowIndex,
      row,
      dataColumns,
    );
  }

  /** Find row by row label. O(1) when _labelToIndex is populated. */
  findRow(rowLabel: string): TwoDARow | null {
    const key = String(rowLabel).toLowerCase();
    const rowIndex = this._labelToIndex.get(key);
    if (rowIndex !== undefined) return this.getRow(rowIndex) ?? null;
    for (const idx of Object.keys(this.rows)) {
      const row = this.rows[idx];
      if (row && String(row['__rowlabel']).toLowerCase() === key) {
        const i = parseInt(idx, 10);
        this._labelToIndex.set(key, i);
        return this.getRow(i) ?? null;
      }
    }
    return null;
  }

  /** Get cell value; returns default if row/column missing. */
  getCellSafe(rowIndex: number, column: string, defaultVal = ''): string {
    try {
      const row = this.rows[rowIndex];
      if (row == null) return defaultVal;
      const v = row[column];
      return v === TWODA_BLANK || v === undefined ? defaultVal : String(v);
    } catch {
      return defaultVal;
    }
  }

  /** Get cell value. Throws if row or column missing. */
  getCell(rowIndex: number, column: string): string {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    if (!this.columns.includes(column)) throw new Error(`Column '${column}' does not exist.`);
    return String(row[column] ?? '');
  }

  /** Set cell value. */
  setCell(rowIndex: number, column: string, value: string | number | null): void {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    if (column !== '__rowlabel' && column !== '__index' && !this.columns.includes(column)) {
      throw new Error(`Column '${column}' does not exist.`);
    }
    row[column] = value == null ? '' : String(value);
  }

  /** Get all values for a column. */
  getColumn(header: string): string[] {
    if (!this.columns.includes(header)) {
      throw new Error(`The header '${header}' does not exist.`);
    }
    const out: string[] = [];
    const keys = Object.keys(this.rows).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (const idx of keys) {
      const row = this.rows[idx];
      out.push(row && row[header] !== undefined ? String(row[header]) : '');
    }
    return out;
  }

  /** Get all columns as a map of header name to array of cell values (PyKotor get_columns). */
  getColumns(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const h of this.getHeaders()) {
      out[h] = this.getColumn(h);
    }
    return out;
  }

  /** Add a new row. Returns the new row index. */
  addRow(rowLabel?: string | null, cells?: Record<string, string | number>): number {
    const idx = this.RowCount;
    const label = rowLabel != null ? String(rowLabel) : String(idx);
    const row: ITwoDARowData = { __index: idx, __rowlabel: label };
    const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
    for (const col of dataColumns) {
      row[col] = (cells && cells[col] != null) ? String(cells[col]) : '';
    }
    this.rows[idx] = row;
    this.RowCount = idx + 1;
    this._labelToIndex.set(label.toLowerCase(), idx);
    return idx;
  }

  /** Add a new column. All existing rows get empty value for it. */
  addColumn(header: string): void {
    if (this.columns.includes(header)) {
      throw new Error(`The header '${header}' already exists.`);
    }
    this.columns.push(header);
    this.ColumnCount = this.columns.length - 1;
    for (const idx of Object.keys(this.rows)) {
      this.rows[idx][header] = '';
    }
  }

  /** Remove a column. */
  removeColumn(header: string): void {
    if (!this.columns.includes(header) || header === '__rowlabel') return;
    this.columns = this.columns.filter(c => c !== header);
    this.ColumnCount = this.columns.length - 1;
    for (const idx of Object.keys(this.rows)) {
      const current = this.rows[idx];
      const { [header]: _removed, ...rest } = current;
      this.rows[idx] = rest as ITwoDARowData;
    }
  }

  /** Set number of rows. Trims or appends blank rows. */
  resize(rowCount: number): void {
    if (rowCount < 0) throw new Error('Row count cannot be negative.');
    const keys = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    if (rowCount < keys.length) {
      const next: Record<string, ITwoDARowData> = {};
      for (const i of keys) {
        if (i < rowCount) next[i] = this.rows[i];
      }
      this.rows = next;
      this._rebuildLabelLookup();
    } else {
      const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
      for (let i = keys.length; i < rowCount; i++) {
        const row: ITwoDARowData = { __index: i, __rowlabel: String(i) };
        for (const col of dataColumns) row[col] = '';
        this.rows[i] = row;
        this._labelToIndex.set(String(i), i);
      }
    }
    this.RowCount = rowCount;
  }

  /** Returns a copy of row labels (same order as getRow). */
  getLabels(): string[] {
    const keys = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    return keys.map(i => (this.rows[i] && this.rows[i]['__rowlabel']) ?? String(i));
  }

  /** Returns row label for the given row index. */
  getRowLabel(rowIndex: number): string {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    return row['__rowlabel'] ?? String(rowIndex);
  }

  /** Sets the row label at the given index; updates label lookup. */
  setLabel(rowIndex: number, value: string): void {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    const oldLabel = row['__rowlabel'];
    row['__rowlabel'] = value;
    if (oldLabel != null) this._labelToIndex.delete(String(oldLabel).toLowerCase());
    this._labelToIndex.set(String(value).toLowerCase(), rowIndex);
  }

  /** True if row index is in range. */
  hasRow(rowIndex: number): boolean {
    return this.rows[rowIndex] != null;
  }

  /** Index of the given TwoDARow in this table, or undefined if not found. */
  rowIndex(row: TwoDARow): number | undefined {
    const key = String(row.rowLabel).toLowerCase();
    const idx = this._labelToIndex.get(key);
    if (idx !== undefined && this.getRow(idx)?.data === row.data) return idx;
    const keys = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const r = this.getRow(i);
      if (r && r.rowLabel === row.rowLabel && r.data === row.data) return i;
    }
    return undefined;
  }

  /** Add a new row by copying an existing row; optional override cells. Returns new row index. */
  copyRow(sourceRow: TwoDARow, rowLabel?: string | null, overrideCells?: Record<string, string | number>): number {
    const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
    const cells: Record<string, string> = {};
    for (const col of dataColumns) {
      cells[col] = overrideCells && col in overrideCells ? String(overrideCells[col]) : sourceRow.getString(col);
    }
    return this.addRow(rowLabel ?? undefined, cells);
  }

  /** Returns a new TwoDAObject with only rows that pass the predicate. */
  filterRows(predicate: (row: TwoDARow) => boolean): TwoDAObject {
    const out = new TwoDAObject();
    const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
    for (const h of dataColumns) out.addColumn(h);
    const keys = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const row = this.getRow(i);
      if (row && predicate(row)) out.addRow(row.rowLabel, row.data);
    }
    return out;
  }

  /** Maximum numeric value in the given column (parsed as int); returns max+1 for next id. */
  columnMax(header: string): number {
    const col = this.getColumn(header);
    let max = -1;
    for (const cell of col) {
      if (cell === '' || cell === TWODA_BLANK) continue;
      const n = cell.startsWith('0x') ? parseInt(cell, 16) : parseInt(cell, 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
    return max + 1;
  }

  /** Maximum numeric row label; returns max+1 for next label. */
  labelMax(): number {
    const labels = this.getLabels();
    let max = -1;
    for (const label of labels) {
      const n = parseInt(String(label), 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
    return max + 1;
  }

  /** Batch update cells: keys are [rowIndex, column], values are new cell values. */
  updateCells(updates: Map<[number, string], string | number>): void {
    updates.forEach((value, [rowIdx, col]) => this.setCell(rowIdx, col, value));
  }

  /**
   * Compare this 2DA with another; log differences via logFunc (PyKotor compare).
   * @returns true if identical, false if differences were found (and logged)
   */
  compare(other: TwoDAObject, logFunc: (msg: string) => void = (m) => log.info(m)): boolean {
    const selfHeaders = new Set(this.getHeaders());
    const otherHeaders = new Set(other.getHeaders());
    let ret = true;
    const missing = [...selfHeaders].filter((h) => !otherHeaders.has(h));
    const extra = [...otherHeaders].filter((h) => !selfHeaders.has(h));
    if (missing.length) {
      logFunc(`Missing headers in new TwoDA: ${missing.join(', ')}`);
      ret = false;
    }
    if (extra.length) {
      logFunc(`Extra headers in new TwoDA: ${extra.join(', ')}`);
      ret = false;
    }
    const commonHeaders = [...selfHeaders].filter((h) => otherHeaders.has(h));
    const selfLabels = new Set(this.getLabels());
    const otherLabels = new Set(other.getLabels());
    const missingRows = [...selfLabels].filter((l) => !otherLabels.has(l));
    const extraRows = [...otherLabels].filter((l) => !selfLabels.has(l));
    if (missingRows.length) {
      logFunc(`Missing rows in new TwoDA: ${missingRows.join(', ')}`);
      ret = false;
    }
    if (extraRows.length) {
      logFunc(`Extra rows in new TwoDA: ${extraRows.join(', ')}`);
      ret = false;
    }
    const commonLabels = [...selfLabels].filter((l) => otherLabels.has(l));
    for (const label of commonLabels) {
      const selfRow = this.findRow(label);
      const otherRow = other.findRow(label);
      if (!selfRow || !otherRow) continue;
      for (const header of commonHeaders) {
        const a = selfRow.getString(header);
        const b = otherRow.getString(header);
        if (a !== b) {
          logFunc(`Cell mismatch at Row '${label}' Header '${header}': '${a}' --> '${b}'`);
          ret = false;
        }
      }
    }
    return ret;
  }

  private _rebuildLabelLookup(): void {
    this._labelToIndex.clear();
    const keys = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const label = this.rows[i]?.['__rowlabel'];
      if (label != null) this._labelToIndex.set(String(label).toLowerCase(), i);
    }
  }

  /**
   * Convert the 2DA object to a buffer (binary 2DA V2.b).
   * Writes row labels (__rowlabel) not row indices.
   */
  toExportBuffer(): Uint8Array {
    try {
      const bw = new BinaryWriter();
      bw.writeChars('2DA ');
      bw.writeChars('V2.b');
      bw.writeByte(0x0a); // newline

      const dataColumns = this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
      for (const h of dataColumns) {
        bw.writeChars(h);
        bw.writeByte(0x09); // tab
      }
      bw.writeByte(0x00); // null terminate column list

      const sortedIndices = Object.keys(this.rows).map(k => parseInt(k, 10)).filter(k => !isNaN(k)).sort((a, b) => a - b);
      bw.writeUInt32(sortedIndices.length);

      for (const i of sortedIndices) {
        const label = (this.rows[i] && this.rows[i]['__rowlabel']) ?? String(i);
        bw.writeChars(String(label) + '\t');
      }

      const valuesWriter = new BinaryWriter();
      const valueToOffset = new Map<string, number>();
      const cellOffsets: number[] = [];

      for (const i of sortedIndices) {
        const row = this.rows[i];
        for (const header of dataColumns) {
          const raw = row && row[header] != null ? row[header] : '';
          const value = raw === '****' ? '' : String(raw);
          const valueWithNull = value + '\0';
          let offset = valueToOffset.get(valueWithNull);
          if (offset === undefined) {
            offset = valuesWriter.position;
            valueToOffset.set(valueWithNull, offset);
            valuesWriter.writeStringNullTerminated(value);
          }
          cellOffsets.push(offset);
        }
      }

      for (const off of cellOffsets) bw.writeUInt16(off);
      bw.writeUInt16(valuesWriter.buffer.length);
      bw.writeBytes(valuesWriter.buffer);

      return bw.buffer;
    } catch (e) {
      log.error(e);
      return new Uint8Array(0);
    }
  }

  /** Data column names (excludes __rowlabel and __index). */
  getHeaders(): string[] {
    return this.columns.filter(c => c !== '__rowlabel' && c !== '__index');
  }

  /**
   * Convert the 2DA object to a CSV string (PyKotor-compatible: first column empty for header row, then row label + cells).
   * @returns The CSV string
   */
  toCSV(): string {
    const headers = this.getHeaders();
    const headerRow = ['', ...headers].join(',') + '\n';
    const indexes = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    const dataRows = indexes.map(idx => {
      const row = this.rows[idx];
      const label = row['__rowlabel'] ?? String(idx);
      const cells = headers.map(h => String(row[h] ?? '').replace(/"/g, '""'));
      return `"${label}",${cells.map(c => c.includes(',') || c.includes('"') || c.includes('\n') ? `"${c}"` : c).join(',')}`;
    }).join('\n');
    return headerRow + dataRows + (dataRows ? '\n' : '');
  }

  /**
   * Parse CSV string into this 2DA (PyKotor-style: first column = row label, rest = headers).
   * Clears existing rows/columns and replaces with CSV data.
   */
  fromCSV(csv: string): void {
    const lines = csv.split(/\r?\n/).map(l => l.trim());
    if (lines.length === 0) return;
    const parseRow = (line: string): string[] => {
      const out: string[] = [];
      let i = 0;
      while (i < line.length) {
        if (line[i] === '"') {
          let end = i + 1;
          while (end < line.length) {
            const next = line.indexOf('"', end);
            if (next === -1) break;
            if (line[next + 1] === '"') { end = next + 2; continue; }
            end = next;
            break;
          }
          out.push(line.slice(i + 1, end).replace(/""/g, '"'));
          i = end + 1;
          if (line[i] === ',') i++;
          continue;
        }
        const comma = line.indexOf(',', i);
        if (comma === -1) {
          out.push(line.slice(i).trim());
          break;
        }
        out.push(line.slice(i, comma).trim());
        i = comma + 1;
      }
      return out;
    };
    const first = parseRow(lines[0]);
    const headers = first.slice(1).map(h => h.trim()).filter(Boolean);
    if (headers.length === 0) throw new Error('CSV header is missing or not formatted correctly.');
    this.columns = ['__rowlabel', ...headers];
    this.ColumnCount = headers.length;
    this.rows = {};
    this.RowCount = 0;
    this._labelToIndex.clear();
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const row = parseRow(line);
      if (row.length !== headers.length + 1) throw new Error(`Row ${i + 1} does not have the correct number of columns.`);
      const label = row[0].trim();
      if (!label) throw new Error(`Row ${i + 1} does not have a valid label.`);
      const cells: Record<string, string> = {};
      headers.forEach((h, j) => { cells[h] = row[j + 1] ?? ''; });
      this.addRow(label, cells);
    }
  }

  /**
   * Convert to JSON object (PyKotor-style: { headers: string[], rows: { label: string, cells: string[] }[] }).
   */
  toJSON(): { headers: string[]; rows: { label: string; cells: string[] }[] } {
    const headers = this.getHeaders();
    const indexes = Object.keys(this.rows).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    const rows = indexes.map(idx => {
      const row = this.rows[idx];
      return {
        label: String(row['__rowlabel'] ?? idx),
        cells: headers.map(h => (row[h] ?? '') as string),
      };
    });
    return { headers, rows };
  }

  /**
   * Load from JSON (supports PyKotor format { headers, rows } or legacy { rows: [ { _id, ... } ] }).
   * Clears existing data and replaces with JSON.
   */
  fromJSON(json: string | TwoDAJSONInput): void {
    type Parsed = TwoDAJSONInput;
    const obj: Parsed = typeof json === 'string' ? (JSON.parse(json) as Parsed) : json;
    if (obj.headers && Array.isArray(obj.rows)) {
      const headers = obj.headers;
      this.columns = ['__rowlabel', ...headers];
      this.ColumnCount = headers.length;
      this.rows = {};
      this.RowCount = 0;
      this._labelToIndex.clear();
      for (const row of obj.rows) {
        const label = String(row.label ?? '');
        const cells = row.cells ?? [];
        const cellMap: Record<string, string> = {};
        headers.forEach((h, i) => { cellMap[h] = (cells[i] as string) ?? ''; });
        this.addRow(label, cellMap);
      }
      return;
    }
    this.columns = ['__rowlabel'];
    this.ColumnCount = 0;
    this.rows = {};
    this.RowCount = 0;
    this._labelToIndex.clear();
    const legacyRows = obj.rows ?? [];
    for (const row of legacyRows) {
      const label = String(row._id ?? row.label ?? '');
      const { _id: _ri, label: _rl, cells: _rc, ...rest } = row;
      for (const h of Object.keys(rest)) {
        if (!this.columns.includes(h)) {
          this.columns.push(h);
          this.ColumnCount = this.columns.length - 1;
        }
      }
      this.addRow(label, rest as Record<string, string>);
    }
  }

  /**
   * Static factory: create TwoDAObject from CSV string.
   */
  static fromCSV(csv: string): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromCSV(csv);
    return two;
  }

  /**
   * Static factory: create TwoDAObject from JSON string or object.
   */
  static fromJSON(json: string | { headers?: string[]; rows?: Array<{ label?: string; _id?: string; cells?: string[]; [key: string]: string | string[] | undefined }> }): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromJSON(json);
    return two;
  }

  /**
   * Serialize this 2DA to a buffer in the given format (PyKotor write_2da / bytes_2da).
   * @param format - '2da' (binary), 'csv', or 'json'
   */
  toBuffer(format: WriteTwoDAFormat = '2da'): Uint8Array {
    if (format === '2da') return this.toExportBuffer();
    if (format === 'csv') return new TextEncoder().encode(this.toCSV());
    if (format === 'json') return new TextEncoder().encode(JSON.stringify(this.toJSON(), null, 2));
    return this.toExportBuffer();
  }

  /**
   * Load 2DA from buffer with auto-detected format (PyKotor read_2da).
   * Format is detected via detectTwoDAFormat; pass format to force binary/csv/json.
   */
  static fromBuffer(buffer: Uint8Array, format?: TwoDAFormat): TwoDAObject {
    const detected = format ?? detectTwoDAFormat(buffer);
    if (detected === 'invalid') {
      throw new Error('Failed to determine the format of the 2DA file.');
    }
    const two = new TwoDAObject(undefined);
    if (detected === '2da') {
      const br = new BinaryReader(buffer);
      two.read2DA(br);
      return two;
    }
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (detected === 'csv') {
      two.fromCSV(decoded);
      return two;
    }
    two.fromJSON(decoded);
    return two;
  }

  /**
   * Get a row by index
   * @param index - The index to get the row by
   * @returns The row
   */
  getRowByIndex(index = -1){
    for (const key of Object.keys(this.rows)) {
      if(this.rows[key]['__index'] == index){
        return this.rows[key];
      }
    }
  }

  /**
   * Get a row by ID
   * @param index - The ID to get the row by
   * @returns The row
   */
  getByID(index: string | number = -1): ITwoDARowData | undefined {
    const want = String(index);
    for (const key of Object.keys(this.rows)) {
      if (String(this.rows[key]['__rowlabel']) === want) {
        return this.rows[key];
      }
    }
  }

  /**
   * Get a row by column and value
   * @param column - The column to get the row by
   * @param value - The value to get the row by
   * @returns The row
   */
  getRowByColumnAndValue(column: string = '', value: string | number | undefined = undefined): ITwoDARowData | undefined {
    for (const key of Object.keys(this.rows)) {
      if(this.rows[key][column] == value){
        return this.rows[key];
      }
    }
  }

  /**
   * Parse a cell value
   * @param cell - The cell value to parse
   * @returns The parsed value
   */
  static cellParser(cell: string | number | null | undefined): string | number | null {
    if(cell === '****'){
      return null;
    }else{
      return cell;
    }
  }

  /**
   * Normalize a value based on the datatype
   * @param value - The value to normalize
   * @param datatype - The datatype to normalize to
   * @param default_value - The default value to return if the value is null
   * @returns The normalized value
   */
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'number', default_value?: number): number;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'string', default_value?: string): string;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'boolean', default_value?: boolean): boolean;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'number'|'string'|'boolean', default_value?: number | string | boolean): number | string | boolean {
    switch(datatype){
      case 'number': {
        if (typeof default_value === 'undefined') default_value = 0;
        if (value === '****') return default_value;
        if (typeof value === 'string' && value.slice(0, 2) === '0x') return parseInt(value, 16);
        const n = parseFloat(String(value));
        return isNaN(n) ? default_value : n;
      }
      case 'string':
        if (typeof default_value === 'undefined') default_value = '';
        return value === '****' ? default_value : String(value ?? '');
      case 'boolean':
        if (typeof default_value === 'undefined') default_value = false;
        return value === '****' ? default_value : !!value;
      default:
        return '';
    }
  }

}

/**
 * Load a TwoDA from buffer with auto-detected format (PyKotor read_2da).
 */
export function readTwoDAFromBuffer(buffer: Uint8Array, format?: TwoDAFormat): TwoDAObject {
  return TwoDAObject.fromBuffer(buffer, format);
}

/**
 * Serialize a TwoDA to buffer in the given format (PyKotor write_2da / bytes_2da).
 */
export function writeTwoDAToBuffer(twoda: TwoDAObject, format: WriteTwoDAFormat = '2da'): Uint8Array {
  return twoda.toBuffer(format);
}
