import { BinaryReader } from '@/utility/binary/BinaryReader';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import {
  objectToTOML,
  objectToXML,
  objectToYAML,
  tomlToObject,
  xmlToObject,
  yamlToObject,
} from '@/utility/FormatSerialization';

export const TWO_DA_FILE_TYPE = '2DA ';

export const TWO_DA_VERSION_EXPORT = 'V2.b';

const TWO_DA_VERSIONS_RECOGNIZED = new Set<string>([TWO_DA_VERSION_EXPORT, 'V2.0']);

/** Type + version label (8 bytes) before the column name list. */
export const TWO_DA_TYPE_VERSION_SIZE = 8;

/** The byte after the version is a single line break before column names. */
const TWO_DA_NEWLINE_AFTER_HEADER = 1;

const byteLF = '\n'.charCodeAt(0);
const byteHT = '\t'.charCodeAt(0);
const byteNUL = 0;

export function isTwoDAFileVersion(v: string): boolean {
  return TWO_DA_VERSIONS_RECOGNIZED.has(v);
}

export type WriteTwoDAFormat = '2da' | 'csv' | 'json';

export interface TwoDAJSONRow {
  label: string;
  cells: string[];
}

export interface TwoDAJSONData {
  headers: string[];
  rows: TwoDAJSONRow[];
}

/**
 * Opaque view of a 2DA row; keeps {@link TwoDAObject} in sync on mutation.
 */
export class TwoDARow {
  private row: Record<string, string>;

  constructor(
    private owner: TwoDAObject,
    row: Record<string, string>
  ) {
    this.row = row;
  }

  label(): string {
    return String(this.row.__rowlabel ?? '');
  }

  getString(column: string): string {
    return String(this.row[column] ?? '****');
  }

  getInteger(column: string, defaultValue = 0): number {
    const value = this.getString(column);
    if (value === '****') {
      return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  hasString(column: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.row, column);
  }

  updateValues(values: Record<string, string | number>): void {
    Object.keys(values).forEach((column) => {
      if (column === '__index' || column === '__rowlabel') {
        return;
      }
      this.row[column] = String(values[column]);
    });
    this.owner.syncCounts();
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
export class TwoDAObject {
  file: Uint8Array | string | undefined = undefined;
  FileType: string;
  FileVersion: string;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
  columns: string[];
  rows: Record<number, Record<string, string>> = {};

  /**
   * Constructor for the TwoDAObject class
   * @param file - The file to read from
   * @param onComplete - The function to call when the 2DA object is loaded
   */
  constructor(file: Uint8Array | string | undefined = undefined, onComplete?: Function) {
    this.file = file;
    this.FileType = TWO_DA_FILE_TYPE;
    this.FileVersion = TWO_DA_VERSION_EXPORT;
    this.columns = ['__rowlabel'];
    this.ColumnCount = 0;
    this.RowCount = 0;
    this.CellCount = 0;
    this.rows = {};

    if (file) {
      if (file instanceof Uint8Array) {
        const br = new BinaryReader(file);
        this.read2DA(br);

        if (onComplete != null) onComplete();
      } else if (typeof file === 'string') {
        this.file = file;
        GameFileSystem.readFile(this.file)
          .then((buffer) => {
            const br = new BinaryReader(buffer);
            this.read2DA(br);

            if (onComplete != null) onComplete();
          })
          .catch((err) => {
            throw err;
          });
      } else {
        //invalid resource
      }
    }
  }

  /**
   * Read the 2DA object from a binary reader
   * @param br - The binary reader to read from
   */
  read2DA(br: BinaryReader): void {
    this.FileType = br.readChars(4);
    this.FileVersion = br.readChars(4);

    if (this.FileType !== TWO_DA_FILE_TYPE || !isTwoDAFileVersion(this.FileVersion)) {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    // Skip the line break after the version; column names follow as tab-delimited, null-terminated text.
    br.position += TWO_DA_NEWLINE_AFTER_HEADER;

    let str = '';
    let ch;
    this.columns = ['__rowlabel'];
    while ((ch = br.readChar()).charCodeAt(0) != byteNUL) {
      if (ch.charCodeAt(0) != byteHT) {
        str = str + ch;
      } else {
        this.columns.push(str);
        str = '';
      }
    }

    this.ColumnCount = this.columns.length - 1;
    this.RowCount = br.readUInt32();

    //Get the row index numbers
    const RowIndexes = [];
    for (let i = 0; i < this.RowCount; i++) {
      let rowIndex = '';
      let c;

      while ((c = br.readChar()).charCodeAt(0) != byteHT) {
        rowIndex = rowIndex + c;
      }

      RowIndexes[i] = rowIndex;
    }

    //Get the Row Data Offsets
    this.CellCount = this.ColumnCount * this.RowCount;
    const offsets = [];
    for (let i = 0; i < this.CellCount; i++) {
      offsets[i] = br.readUInt16();
    }

    const dataSize = br.readUInt16();
    const dataOffset = br.position;

    //Get the Row Data
    for (let i = 0; i < this.RowCount; i++) {
      const row: Record<string, string> = { __index: String(i), __rowlabel: RowIndexes[i] };

      for (let j = 0; j < this.ColumnCount; j++) {
        const offset = dataOffset + offsets[i * this.ColumnCount + j];

        try {
          br.position = offset;
        } catch (e) {
          console.error(e);
          throw e;
        }

        let token = '';
        let c;

        while ((c = br.readChar()).charCodeAt(0) != byteNUL) token = token + c;

        if (token == '') token = '****';

        row[this.columns[j + 1]] = token;
      }

      this.rows[i] = row;
    }

    this.syncCounts();
  }

  /**
   * Convert the 2DA object to a buffer
   * @returns The buffer
   */
  toExportBuffer(): Uint8Array {
    try {
      const bw = new BinaryWriter();
      bw.writeChars(TWO_DA_FILE_TYPE);
      bw.writeChars(TWO_DA_VERSION_EXPORT);
      bw.writeByte(byteLF);

      for (let i = 1; i < this.columns.length; i++) {
        bw.writeChars(this.columns[i]);
        bw.writeByte(byteHT);
      }

      bw.writeByte(byteNUL);

      const indexes = Object.keys(this.rows)
        .map((value) => Number.parseInt(value, 10))
        .sort((a, b) => a - b);
      //Write the row count as a UInt32
      bw.writeUInt32(indexes.length);

      for (let i = 0; i < indexes.length; i++) {
        bw.writeChars(this.getRowLabel(indexes[i]));
        bw.writeByte(byteHT);
      }

      const valuesWriter = new BinaryWriter();
      const values = new Map<string, number>(); //value, offset
      // values.set('Some Value', 0);
      for (let i = 0; i < indexes.length; i++) {
        const index = indexes[i];
        const row = this.rows[index];
        const rowKeys = Object.keys(row);
        for (let j = 0; j < rowKeys.length; j++) {
          const key = rowKeys[j];
          if (key != '__rowlabel' && key != '__index') {
            const value: string = row[key] == '****' ? '' : String(row[key]);
            if (values.has(value)) {
              bw.writeUInt16(values.get(value));
            } else {
              const offset = valuesWriter.position;
              bw.writeUInt16(offset);
              valuesWriter.writeStringNullTerminated(value);
              values.set(value, offset);
            }
          }
        }
      }

      bw.writeUInt16(valuesWriter.buffer.length);
      bw.writeBytes(valuesWriter.buffer);

      return bw.buffer;
    } catch (e) {
      console.error(e);
      return new Uint8Array(0);
    }
  }

  /**
   * Convert the 2DA object to a CSV string
   * @returns The CSV string
   */
  toCSV(): string {
    const quoteIfNeeded = (v: any): string => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    let csv = '';
    for (let i = 0; i < this.columns.length; i++) {
      csv += quoteIfNeeded(this.columns[i]);
      if (i < this.columns.length - 1) csv += ',';
    }
    csv += '\n';
    const indexes = Object.keys(this.rows)
      .map((value) => Number.parseInt(value, 10))
      .sort((a, b) => a - b);
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i];
      const row = this.rows[index];
      for (let j = 0; j < this.columns.length; j++) {
        csv += quoteIfNeeded(row[this.columns[j]]);
        if (j < this.columns.length - 1) csv += ',';
      }
      csv += '\n';
    }
    return csv;
  }

  /**
   * Parse a CSV string and populate this instance's columns and rows.
   * Handles RFC-4180 quoting (values containing commas or double-quotes).
   * @param csv - The CSV string to parse
   * @returns A new TwoDAObject populated from the CSV data
   */
  static fromCSV(csv: string): TwoDAObject {
    const obj = new TwoDAObject(undefined);

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    };

    // Normalise line endings
    const lines = csv.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
    let lineIdx = 0;

    while (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
    if (lineIdx >= lines.length) return obj;

    const headers = parseCSVLine(lines[lineIdx++]);
    obj.columns = headers;
    obj.ColumnCount = Math.max(0, headers.length - 1);

    let rowIdx = 0;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx++];
      if (line.trim() === '') continue;
      const cells = parseCSVLine(line);
      const row: any = { __index: rowIdx };
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cells[j] !== undefined ? cells[j] : '****';
      }
      obj.rows[rowIdx] = row;
      rowIdx++;
    }

    obj.RowCount = rowIdx;
    obj.CellCount = obj.ColumnCount * obj.RowCount;
    return obj;
  }

  /**
   * Get a row by index
   * @param index - The index to get the row by
   * @returns The row
   */
  getRowByIndex(index = -1) {
    for (const key of Object.keys(this.rows)) {
      if (this.rows[key]['__index'] == index) {
        return this.rows[key];
      }
    }
  }

  syncCounts(): void {
    this.RowCount = Object.keys(this.rows).length;
    this.ColumnCount = Math.max(this.columns.length - 1, 0);
    this.CellCount = this.RowCount * this.ColumnCount;
  }

  getHeight(): number {
    return this.RowCount;
  }

  getWidth(): number {
    return this.ColumnCount;
  }

  getRow(index: number): TwoDARow | null {
    const row = this.rows[index];
    return row ? new TwoDARow(this, row) : null;
  }

  findRow(label: string): TwoDARow | null {
    const row = Object.values(this.rows).find((entry) => String(entry.__rowlabel) === String(label));
    return row ? new TwoDARow(this, row) : null;
  }

  getCell(rowIndex: number, column: string): string | undefined {
    return this.rows[rowIndex]?.[column];
  }

  getCellSafe(rowIndex: number, column: string, defaultValue: string): string {
    return this.getCell(rowIndex, column) ?? defaultValue;
  }

  setCell(rowIndex: number, column: string, value: string | number): void {
    const row = this.rows[rowIndex];
    if (!row) {
      return;
    }
    if (!this.columns.includes(column)) {
      this.addColumn(column);
    }
    row[column] = String(value);
  }

  addColumn(column: string): void {
    if (!this.columns.includes(column)) {
      this.columns.push(column);
      Object.values(this.rows).forEach((row) => {
        if (!Object.prototype.hasOwnProperty.call(row, column)) {
          row[column] = '****';
        }
      });
      this.syncCounts();
    }
  }

  addRow(label: string, values: Record<string, string | number> = {}): number {
    Object.keys(values).forEach((column) => {
      if (!this.columns.includes(column)) {
        this.addColumn(column);
      }
    });

    const nextIndex = this.RowCount;
    const row: Record<string, string> = {
      __index: String(nextIndex),
      __rowlabel: String(label),
    };

    for (let i = 1; i < this.columns.length; i++) {
      const column = this.columns[i];
      row[column] = Object.prototype.hasOwnProperty.call(values, column) ? String(values[column]) : '****';
    }

    this.rows[nextIndex] = row;
    this.syncCounts();
    return nextIndex;
  }

  getColumn(column: string): string[] {
    return Object.keys(this.rows)
      .map((value) => Number.parseInt(value, 10))
      .sort((a, b) => a - b)
      .map((index) => this.rows[index]?.[column] ?? '****');
  }

  getColumns(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (let i = 1; i < this.columns.length; i++) {
      out[this.columns[i]] = this.getColumn(this.columns[i]);
    }
    return out;
  }

  compare(other: TwoDAObject, onMessage?: (message: string) => void): boolean {
    if (this.ColumnCount !== other.ColumnCount || this.RowCount !== other.RowCount) {
      onMessage?.('Shape mismatch');
      return false;
    }

    for (let i = 0; i < this.RowCount; i++) {
      const left = this.rows[i];
      const right = other.rows[i];
      if (!left || !right) {
        onMessage?.(`Row mismatch at ${i}`);
        return false;
      }
      for (let j = 0; j < this.columns.length; j++) {
        const column = this.columns[j];
        if (String(left[column] ?? '') !== String(right[column] ?? '')) {
          onMessage?.(`Cell mismatch at row ${i}, column ${column}`);
          return false;
        }
      }
    }

    return true;
  }

  getLabels(): string[] {
    return Object.keys(this.rows)
      .map((value) => Number.parseInt(value, 10))
      .sort((a, b) => a - b)
      .map((index) => this.getRowLabel(index));
  }

  getRowLabel(index: number): string {
    return String(this.rows[index]?.__rowlabel ?? '');
  }

  setLabel(index: number, label: string): void {
    if (this.rows[index]) {
      this.rows[index].__rowlabel = String(label);
    }
  }

  copyRow(row: TwoDARow, label: string, overrides: Record<string, string | number> = {}): number {
    const source = this.findRow(row.label());
    const sourceRow = source ? this.rows[this.rowIndex(source)] : undefined;
    const values: Record<string, string | number> = {};
    if (sourceRow) {
      for (let i = 1; i < this.columns.length; i++) {
        const column = this.columns[i];
        values[column] = sourceRow[column];
      }
    }
    Object.assign(values, overrides);
    return this.addRow(label, values);
  }

  rowIndex(row: TwoDARow): number {
    const label = row.label();
    const entry = Object.entries(this.rows).find(([, value]) => String(value.__rowlabel) === label);
    return entry ? Number.parseInt(entry[0], 10) : -1;
  }

  filterRows(predicate: (row: TwoDARow) => boolean): TwoDAObject {
    const filtered = new TwoDAObject();
    filtered.columns = [...this.columns];
    Object.keys(this.rows)
      .map((value) => Number.parseInt(value, 10))
      .sort((a, b) => a - b)
      .forEach((index) => {
        const wrapped = this.getRow(index);
        if (wrapped && predicate(wrapped)) {
          const row = this.rows[index];
          const values: Record<string, string> = {};
          for (let i = 1; i < this.columns.length; i++) {
            values[this.columns[i]] = row[this.columns[i]];
          }
          filtered.addRow(String(row.__rowlabel), values);
        }
      });
    filtered.syncCounts();
    return filtered;
  }

  columnMax(column: string): number {
    const values = this.getColumn(column)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => !Number.isNaN(value));
    return values.length ? Math.max(...values) + 1 : 0;
  }

  labelMax(): number {
    const values = this.getLabels()
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => !Number.isNaN(value));
    return values.length ? Math.max(...values) + 1 : 0;
  }

  updateCells(updates: Map<[number, string], string | number>): void {
    updates.forEach((value, key) => {
      const [rowIndex, column] = key;
      this.setCell(rowIndex, column, value);
    });
  }

  toJSON(): TwoDAJSONData {
    return {
      headers: this.columns.slice(1),
      rows: Object.keys(this.rows)
        .map((value) => Number.parseInt(value, 10))
        .sort((a, b) => a - b)
        .map((index) => ({
          label: this.getRowLabel(index),
          cells: this.columns.slice(1).map((column) => this.rows[index]?.[column] ?? '****'),
        })),
    };
  }

  fromJSON(json: string | TwoDAJSONData): void {
    const data = typeof json === 'string' ? (JSON.parse(json) as TwoDAJSONData) : json;
    this.columns = ['__rowlabel', ...(data.headers ?? [])];
    this.rows = {};
    (data.rows ?? []).forEach((row, index) => {
      const mapped: Record<string, string> = {
        __index: String(index),
        __rowlabel: String(row.label),
      };
      this.columns.slice(1).forEach((column, columnIndex) => {
        mapped[column] = String(row.cells?.[columnIndex] ?? '****');
      });
      this.rows[index] = mapped;
    });
    this.syncCounts();
  }

  static fromJSON(json: string | TwoDAJSONData): TwoDAObject {
    const two = new TwoDAObject();
    two.fromJSON(json);
    return two;
  }

  toXML(): string {
    return objectToXML(this.toJSON());
  }

  fromXML(xml: string): void {
    this.fromJSON(xmlToObject(xml) as TwoDAJSONData);
  }

  static fromXML(xml: string): TwoDAObject {
    const two = new TwoDAObject();
    two.fromXML(xml);
    return two;
  }

  toYAML(): string {
    return objectToYAML(this.toJSON());
  }

  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as TwoDAJSONData);
  }

  static fromYAML(yaml: string): TwoDAObject {
    const two = new TwoDAObject();
    two.fromYAML(yaml);
    return two;
  }

  toTOML(): string {
    return objectToTOML(this.toJSON());
  }

  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as TwoDAJSONData);
  }

  static fromTOML(toml: string): TwoDAObject {
    const two = new TwoDAObject();
    two.fromTOML(toml);
    return two;
  }

  static fromCSV(csv: string): TwoDAObject {
    const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
    const two = new TwoDAObject();
    if (!lines.length) {
      return two;
    }
    const headers = lines[0].split(',');
    two.columns = ['__rowlabel', ...headers.slice(1)];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const rowValues: Record<string, string> = {};
      two.columns.slice(1).forEach((column, index) => {
        rowValues[column] = values[index + 1] ?? '****';
      });
      two.addRow(values[0] ?? String(i - 1), rowValues);
    }
    two.syncCounts();
    return two;
  }

  static fromBuffer(buffer: Uint8Array, format?: WriteTwoDAFormat): TwoDAObject {
    return readTwoDAFromBuffer(buffer, format);
  }

  toBuffer(format: WriteTwoDAFormat = '2da'): Uint8Array {
    return writeTwoDAToBuffer(this, format);
  }

  /**
   * Get a row by ID
   * @param index - The ID to get the row by
   * @returns The row
   */
  getByID(index = -1) {
    for (const key of Object.keys(this.rows)) {
      if (this.rows[key]['__rowlabel'] == index) {
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
  getRowByColumnAndValue(column: string = '', value: any = undefined) {
    for (const key of Object.keys(this.rows)) {
      if (this.rows[key][column] == value) {
        return this.rows[key];
      }
    }
  }

  /**
   * Parse a cell value
   * @param cell - The cell value to parse
   * @returns The parsed value
   */
  static cellParser(cell: any) {
    if (cell === '****') {
      return null;
    } else {
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
  static normalizeValue(value: any, datatype: 'number' | 'string' | 'boolean', default_value: any) {
    switch (datatype) {
      case 'number':
        if (typeof default_value === 'undefined') default_value = 0;
        if (value === '****') return default_value;

        if (typeof value === 'string' && value.slice(0, 2) == '0x') {
          return parseInt(value);
        }

        value = parseFloat(value);
        if (isNaN(value)) value = default_value;
        return value;
        break;
      case 'string':
        if (typeof default_value === 'undefined') default_value = '';
        if (value === '****') return default_value;
        return value;
        break;
      case 'boolean':
        if (typeof default_value === 'undefined') default_value = false;
        if (value === '****') return default_value;
        return !!value;
        break;
    }
    console.warn('normalizeValue', 'unhandled datatype', value);
    return '';
  }
}

export function detectTwoDAFormat(buffer: Uint8Array): WriteTwoDAFormat | 'invalid' {
  if (!buffer || buffer.length < 4) {
    return 'invalid';
  }
  if (buffer.length >= TWO_DA_TYPE_VERSION_SIZE) {
    const dec = new TextDecoder();
    if (dec.decode(buffer.slice(0, 4)) === TWO_DA_FILE_TYPE && isTwoDAFileVersion(dec.decode(buffer.slice(4, 8)))) {
      return '2da';
    }
  }
  const head = new TextDecoder().decode(buffer.slice(0, Math.min(256, buffer.length))).trimStart();
  if (head.startsWith('{') || head.startsWith('[')) {
    return 'json';
  }
  if (head.includes(',')) {
    return 'csv';
  }
  return 'invalid';
}

export function readTwoDAFromBuffer(buffer: Uint8Array, format?: WriteTwoDAFormat): TwoDAObject {
  const resolved = format ?? detectTwoDAFormat(buffer);
  if (resolved === '2da') {
    return new TwoDAObject(buffer);
  }
  const text = new TextDecoder().decode(buffer);
  if (resolved === 'csv') {
    return TwoDAObject.fromCSV(text);
  }
  if (resolved === 'json') {
    return TwoDAObject.fromJSON(text);
  }
  throw new Error('Unsupported 2DA buffer format.');
}

export function writeTwoDAToBuffer(two: TwoDAObject, format: WriteTwoDAFormat = '2da'): Uint8Array {
  if (format === '2da') {
    return two.toExportBuffer();
  }
  if (format === 'csv') {
    return new TextEncoder().encode(two.toCSV());
  }
  return new TextEncoder().encode(JSON.stringify(two.toJSON()));
}
