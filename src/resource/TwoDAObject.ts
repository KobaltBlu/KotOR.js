import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from "@/utility/FormatSerialization";
import { GameFileSystem } from '@/utility/GameFileSystem';
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);

export const TWODA_BLANK = '****';

export type TwoDAFormat = '2da' | 'csv' | 'json' | 'invalid';
export type WriteTwoDAFormat = '2da' | 'csv' | 'json';

export function detectTwoDAFormat(buffer: Uint8Array): TwoDAFormat {
  if (!buffer || buffer.length < 4) return 'invalid';
  const first4 = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (first4 === '2DA ') return '2da';
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(256, buffer.length)));
  if (decoded.includes('{')) return 'json';
  if (decoded.includes(',')) return 'csv';
  return 'invalid';
}

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
    const value = this._data[header];
    return value === undefined ? '' : String(value);
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

  get data(): Record<string, string | number> {
    return this._data;
  }

  hasString(header: string): boolean {
    return header === '__rowlabel' || header === '__index' || this._columns.includes(header);
  }

  updateValues(values: Record<string, string>): void {
    for (const [column, cell] of Object.entries(values)) {
      this.setString(column, cell);
    }
  }
}

export interface ITwoDARowData {
  __index: number;
  __rowlabel: string;
  [column: string]: string | number;
}

export type TwoDARowData = ITwoDARowData;

export interface TwoDAJSONInput {
  headers?: string[];
  rows?: Array<{ label?: string; _id?: string; cells?: string[]; [key: string]: string | string[] | undefined }>;
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

  file: Uint8Array|string|undefined = undefined;
  FileType: string;
  FileVersion: string;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
  columns: string[];
  rows: Record<string, ITwoDARowData> = {};
  private _labelToIndex: Map<string, number> = new Map();

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

  read2DA(br: BinaryReader): void {
    this.FileType = br.readChars(4);
    this.FileVersion = br.readChars(4);

    br.position += 1;

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

    const RowIndexes = [];
    for (let i = 0; i < this.RowCount; i++){
      let rowIndex = "";
      let c;

      while ((c = br.readChar()).charCodeAt(0) != 9){
        rowIndex = rowIndex + c;
      }

      RowIndexes[i] = (rowIndex);
    }

    this.CellCount = this.ColumnCount * this.RowCount;
    const offsets = [];
    for (let i = 0; i < this.CellCount; i++){
      offsets[i] = br.readUInt16();
    }

    br.readUInt16();
    const dataOffset = br.position;

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
          token = TWODA_BLANK;

        row[this.columns[j+1]] = token;
      }

      this.rows[i] = row;
      this._labelToIndex.set(String(RowIndexes[i]).toLowerCase(), i);
    }
  }

  getHeight(): number {
    return this.RowCount ?? Object.keys(this.rows).length;
  }

  getWidth(): number {
    return this.ColumnCount ?? (this.columns ? this.columns.length - 1 : 0);
  }

  getShape(): [number, number] {
    return [this.getHeight(), this.getWidth()];
  }

  getRow(rowIndex: number): TwoDARow | undefined {
    const row = this.rows[rowIndex];
    if (row == null) return undefined;
    const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
    return new TwoDARow(
      row['__rowlabel'] ?? String(rowIndex),
      rowIndex,
      row,
      dataColumns,
    );
  }

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

  getCellSafe(rowIndex: number, column: string, defaultVal = ''): string {
    try {
      const row = this.rows[rowIndex];
      if (row == null) return defaultVal;
      const value = row[column];
      return value === TWODA_BLANK || value === undefined ? defaultVal : String(value);
    } catch {
      return defaultVal;
    }
  }

  getCell(rowIndex: number, column: string): string {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    if (!this.columns.includes(column)) throw new Error(`Column '${column}' does not exist.`);
    return String(row[column] ?? '');
  }

  setCell(rowIndex: number, column: string, value: string | number | null): void {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    if (column !== '__rowlabel' && column !== '__index' && !this.columns.includes(column)) {
      throw new Error(`Column '${column}' does not exist.`);
    }
    row[column] = value == null ? '' : String(value);
  }

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

  getColumns(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const header of this.getHeaders()) {
      out[header] = this.getColumn(header);
    }
    return out;
  }

  addRow(rowLabel?: string | null, cells?: Record<string, string | number>): number {
    const idx = this.RowCount;
    const label = rowLabel != null ? String(rowLabel) : String(idx);
    const row: ITwoDARowData = { __index: idx, __rowlabel: label };
    const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
    for (const col of dataColumns) {
      row[col] = (cells && cells[col] != null) ? String(cells[col]) : '';
    }
    this.rows[idx] = row;
    this.RowCount = idx + 1;
    this._labelToIndex.set(label.toLowerCase(), idx);
    return idx;
  }

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

  removeColumn(header: string): void {
    if (!this.columns.includes(header) || header === '__rowlabel') return;
    this.columns = this.columns.filter((c) => c !== header);
    this.ColumnCount = this.columns.length - 1;
    for (const idx of Object.keys(this.rows)) {
      const current = this.rows[idx];
      const { [header]: _removed, ...rest } = current;
      this.rows[idx] = rest as ITwoDARowData;
    }
  }

  resize(rowCount: number): void {
    if (rowCount < 0) throw new Error('Row count cannot be negative.');
    const keys = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    if (rowCount < keys.length) {
      const next: Record<string, ITwoDARowData> = {};
      for (const i of keys) {
        if (i < rowCount) next[i] = this.rows[i];
      }
      this.rows = next;
      this._rebuildLabelLookup();
    } else {
      const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
      for (let i = keys.length; i < rowCount; i++) {
        const row: ITwoDARowData = { __index: i, __rowlabel: String(i) };
        for (const col of dataColumns) row[col] = '';
        this.rows[i] = row;
        this._labelToIndex.set(String(i), i);
      }
    }
    this.RowCount = rowCount;
  }

  getLabels(): string[] {
    const keys = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    return keys.map((i) => (this.rows[i] && this.rows[i]['__rowlabel']) ?? String(i));
  }

  getRowLabel(rowIndex: number): string {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    return row['__rowlabel'] ?? String(rowIndex);
  }

  setLabel(rowIndex: number, value: string): void {
    const row = this.rows[rowIndex];
    if (row == null) throw new Error(`Row index ${rowIndex} out of range.`);
    const oldLabel = row['__rowlabel'];
    row['__rowlabel'] = value;
    if (oldLabel != null) this._labelToIndex.delete(String(oldLabel).toLowerCase());
    this._labelToIndex.set(String(value).toLowerCase(), rowIndex);
  }

  hasRow(rowIndex: number): boolean {
    return this.rows[rowIndex] != null;
  }

  rowIndex(row: TwoDARow): number | undefined {
    const key = String(row.rowLabel).toLowerCase();
    const idx = this._labelToIndex.get(key);
    if (idx !== undefined && this.getRow(idx)?.data === row.data) return idx;
    const keys = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const found = this.getRow(i);
      if (found && found.rowLabel === row.rowLabel && found.data === row.data) return i;
    }
    return undefined;
  }

  copyRow(sourceRow: TwoDARow, rowLabel?: string | null, overrideCells?: Record<string, string | number>): number {
    const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
    const cells: Record<string, string> = {};
    for (const col of dataColumns) {
      cells[col] = overrideCells && col in overrideCells ? String(overrideCells[col]) : sourceRow.getString(col);
    }
    return this.addRow(rowLabel ?? undefined, cells);
  }

  filterRows(predicate: (row: TwoDARow) => boolean): TwoDAObject {
    const out = new TwoDAObject();
    const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
    for (const header of dataColumns) out.addColumn(header);
    const keys = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const row = this.getRow(i);
      if (row && predicate(row)) out.addRow(row.rowLabel, row.data);
    }
    return out;
  }

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

  labelMax(): number {
    const labels = this.getLabels();
    let max = -1;
    for (const label of labels) {
      const n = parseInt(String(label), 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
    return max + 1;
  }

  updateCells(updates: Map<[number, string], string | number>): void {
    updates.forEach((value, [rowIdx, col]) => this.setCell(rowIdx, col, value));
  }

  compare(other: TwoDAObject, logFunc: (msg: string) => void = (message) => log.info(message)): boolean {
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
    const keys = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    for (const i of keys) {
      const label = this.rows[i]?.['__rowlabel'];
      if (label != null) this._labelToIndex.set(String(label).toLowerCase(), i);
    }
  }

  toExportBuffer(): Uint8Array {
    try {
      const bw = new BinaryWriter();
      bw.writeChars('2DA ');
      bw.writeChars('V2.b');
      bw.writeByte(0x0a);

      const dataColumns = this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
      for (const header of dataColumns) {
        bw.writeChars(header);
        bw.writeByte(0x09);
      }
      bw.writeByte(0x00);

      const sortedIndices = Object.keys(this.rows).map((k) => parseInt(k, 10)).filter((k) => !isNaN(k)).sort((a, b) => a - b);
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
          const value = raw === TWODA_BLANK ? '' : String(raw);
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

  getHeaders(): string[] {
    return this.columns.filter((c) => c !== '__rowlabel' && c !== '__index');
  }

  toCSV(): string {
    const headers = this.getHeaders();
    const headerRow = ['', ...headers].join(',') + '\n';
    const indexes = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    const dataRows = indexes.map((idx) => {
      const row = this.rows[idx];
      const label = row['__rowlabel'] ?? String(idx);
      const cells = headers.map((h) => String(row[h] ?? '').replace(/"/g, '""'));
      return `"${label}",${cells.map((c) => c.includes(',') || c.includes('"') || c.includes('\n') ? `"${c}"` : c).join(',')}`;
    }).join('\n');
    return headerRow + dataRows + (dataRows ? '\n' : '');
  }

  fromCSV(csv: string): void {
    const lines = csv.split(/\r?\n/).map((l) => l.trim());
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
            if (line[next + 1] === '"') {
              end = next + 2;
              continue;
            }
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
    const headers = first.slice(1).map((h) => h.trim()).filter(Boolean);
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

  toJSON(): { headers: string[]; rows: { label: string; cells: string[] }[] } {
    const headers = this.getHeaders();
    const indexes = Object.keys(this.rows).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    const rows = indexes.map((idx) => {
      const row = this.rows[idx];
      return {
        label: String(row['__rowlabel'] ?? idx),
        cells: headers.map((h) => (row[h] ?? '') as string),
      };
    });
    return { headers, rows };
  }

  fromJSON(json: string | TwoDAJSONInput): void {
    const obj: TwoDAJSONInput = typeof json === 'string' ? JSON.parse(json) as TwoDAJSONInput : json;
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

  static fromCSV(csv: string): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromCSV(csv);
    return two;
  }

  static fromJSON(json: string | TwoDAJSONInput): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromJSON(json);
    return two;
  }

  toXML(): string {
    return objectToXML(this.toJSON());
  }

  fromXML(xml: string): void {
    this.fromJSON(xmlToObject(xml) as TwoDAJSONInput);
  }

  toYAML(): string {
    return objectToYAML(this.toJSON());
  }

  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as TwoDAJSONInput);
  }

  toTOML(): string {
    return objectToTOML(this.toJSON());
  }

  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as TwoDAJSONInput);
  }

  static fromXML(xml: string): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromXML(xml);
    return two;
  }

  static fromYAML(yaml: string): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromYAML(yaml);
    return two;
  }

  static fromTOML(toml: string): TwoDAObject {
    const two = new TwoDAObject(undefined);
    two.fromTOML(toml);
    return two;
  }

  toBuffer(format: WriteTwoDAFormat = '2da'): Uint8Array {
    if (format === '2da') return this.toExportBuffer();
    if (format === 'csv') return new TextEncoder().encode(this.toCSV());
    if (format === 'json') return new TextEncoder().encode(JSON.stringify(this.toJSON(), null, 2));
    return this.toExportBuffer();
  }

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

  getRowByIndex(index = -1){
    for (const key of Object.keys(this.rows)) {
      if(this.rows[key]['__index'] == index){
        return this.rows[key];
      }
    }
  }

  getByID(index: string | number = -1): ITwoDARowData | undefined {
    const want = String(index);
    for (const key of Object.keys(this.rows)) {
      if (String(this.rows[key]['__rowlabel']) === want) {
        return this.rows[key];
      }
    }
  }

  getRowByColumnAndValue(column: string = '', value: string | number | undefined = undefined): ITwoDARowData | undefined {
    for (const key of Object.keys(this.rows)) {
      if(this.rows[key][column] == value){
        return this.rows[key];
      }
    }
  }

  static cellParser(cell: string | number | null | undefined): string | number | null {
    if(cell === TWODA_BLANK){
      return null;
    }else{
      return cell;
    }
  }

  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'number', default_value?: number): number;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'string', default_value?: string): string;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'boolean', default_value?: boolean): boolean;
  static normalizeValue(value: string | number | boolean | null | undefined, datatype: 'number'|'string'|'boolean', default_value?: number | string | boolean): number | string | boolean {
    switch(datatype){
      case 'number': {
        if (typeof default_value === 'undefined') default_value = 0;
        if (value === TWODA_BLANK) return default_value;
        if (typeof value === 'string' && value.slice(0, 2) === '0x') return parseInt(value, 16);
        const n = parseFloat(String(value));
        return isNaN(n) ? default_value : n;
      }
      case 'string':
        if (typeof default_value === 'undefined') default_value = '';
        return value === TWODA_BLANK ? default_value : String(value ?? '');
      case 'boolean':
        if (typeof default_value === 'undefined') default_value = false;
        return value === TWODA_BLANK ? default_value : !!value;
      default:
        return '';
    }
  }
}

export function readTwoDAFromBuffer(buffer: Uint8Array, format?: TwoDAFormat): TwoDAObject {
  return TwoDAObject.fromBuffer(buffer, format);
}

export function writeTwoDAToBuffer(twoda: TwoDAObject, format: WriteTwoDAFormat = '2da'): Uint8Array {
  return twoda.toBuffer(format);
}
