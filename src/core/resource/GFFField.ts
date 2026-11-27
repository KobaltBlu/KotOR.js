import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { CExoLocString } from "@core/resource/CExoLocString";
import { GFFStruct } from "@core/resource/GFFStruct";
import type { IGFFFieldJSON } from "@core/interface/resource/IGFFFieldJSON";

/**
 * Represents a field within a GFF (Generic File Format) structure.
 * 
 * GFFField is a fundamental component of the GFF file format used by BioWare's
 * Aurora Engine. It represents a single data field that can contain various types
 * of data including primitive types (integers, strings), complex types (vectors,
 * orientations), and nested structures.
 * 
 * @class GFFField
 * 
 * @example
 * ```typescript
 * // Create a string field
 * const nameField = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
 * 
 * // Create a vector field
 * const positionField = new GFFField(GFFDataType.VECTOR, 'Position', new THREE.Vector3(1, 2, 3));
 * 
 * // Create a nested structure field
 * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
 * structField.addChildStruct(new GFFStruct(0x0007));
 * 
 * // Get and set values
 * console.log(nameField.getValue); // 'PlayerName'
 * nameField.setValue('NewName');
 * ```
 * 
 * @file GFFField.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GFFField {
  private _uuid: string | undefined;

  /**
   * Unique identifier for this field instance. Generated on first read (editor
   * keys / undo coalescing) so bulk game-data parsing does not pay for one per
   * field; stable for the lifetime of the instance once read.
   */
  get uuid(): string {
    if(this._uuid === undefined){
      this._uuid = crypto.randomUUID();
    }
    return this._uuid;
  }

  set uuid(value: string) {
    this._uuid = value;
  }
  
  /** The data type of this field (from GFFDataType enum) */
  type: number;
  
  /** The label/name of this field */
  label: string;
  
  /** Raw binary data for this field */
  data: Uint8Array;
  
  /** DataView for reading binary data */
  dataView: DataView;
  
  /** The actual value stored in this field */
  value: any;
  
  /** Array of child structures (for STRUCT and LIST types) */
  childStructs: GFFStruct[] = [];
  
  /** Localized string data (for CEXOLOCSTRING type) */
  cexoLocString: CExoLocString;
  
  /** 3D vector data (for VECTOR type) */
  vector: {x: number, y: number, z: number};
  
  /** 3D orientation data (for ORIENTATION type) */
  orientation: {x: number, y: number, z: number, w: number};

  /** Index position of this field within its parent structure */
  index: number = 0;
  
  /** Index of the field's label in the label table */
  labelIndex: number = 0;

  /**
   * Creates a new GFFField instance.
   * 
   * @param {number} [type=0] - The data type of the field (from GFFDataType enum)
   * @param {string} [label=""] - The label/name of the field
   * @param {any} [value] - The initial value for the field (type-specific)
   * 
   * @example
   * ```typescript
   * // Create a string field
   * const nameField = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * 
   * // Create a vector field with initial position
   * const posField = new GFFField(GFFDataType.VECTOR, 'Position', new THREE.Vector3(1, 2, 3));
   * 
   * // Create a localized string field
   * const locField = new GFFField(GFFDataType.CEXOLOCSTRING, 'Description');
   * 
   * // Create a nested structure field
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * ```
   */
  constructor(type: number = 0, label: string = "", value?: any){
    this.type = type;
    this.label = label;
    this.data = new Uint8Array(0);
    this.dataView = new DataView(this.data.buffer);
    this.value = value;
    this.childStructs = [];

    switch(this.type){
      case GFFDataType.CEXOSTRING:
      case GFFDataType.RESREF:
        if(typeof this.value !== 'string')
          this.value = '';
      break;
      case GFFDataType.CEXOLOCSTRING:
        this.value = 0;
        this.cexoLocString = (value instanceof CExoLocString) ? value : new CExoLocString();
      break;
      case GFFDataType.ORIENTATION:
        this.value = 0;
        if(typeof value == 'object' && typeof value.x == 'number' && typeof value.y == 'number' && typeof value.z == 'number' && typeof value.w == 'number'){
          this.orientation = value;
        }else{
          this.orientation = {x: 0, y: 0, z: 0, w: 1};
        }
      break;
      case GFFDataType.VECTOR:
        this.value = 0;
        if(typeof value == 'object' && typeof value.x == 'number' && typeof value.y == 'number' && typeof value.z == 'number'){
          this.vector = value;
        }else{
          this.vector = {x: 0, y: 0, z: 0};
        }
      break;
      case GFFDataType.STRUCT:
        this.childStructs[0] = new GFFStruct();
      break;
      case GFFDataType.VOID:
        this.data = new Uint8Array(0);
        this.value = 0;
      break;
    }

  }

  /**
   * Gets the data type of this field.
   * 
   * @returns {GFFDataType} The data type identifier
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * console.log(field.getType); // GFFDataType.CExoString
   * ```
   */
  getType(): GFFDataType {
    return this.type;
  }

  /**
   * Gets the label/name of this field.
   * 
   * @returns {string} The field label
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * console.log(field.getLabel); // 'Name'
   * ```
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Gets the raw binary data for VOID type fields.
   * 
   * @returns {Uint8Array} The raw binary data
   * 
   * @example
   * ```typescript
   * const voidField = new GFFField(GFFDataType.VOID, 'BinaryData');
   * voidField.setValue(new Uint8Array([1, 2, 3, 4]));
   * const data = voidField.getVoid; // Uint8Array [1, 2, 3, 4]
   * ```
   */
  getVoid(){
    return this.data;
  }

  /**
   * Gets the value stored in this field.
   * 
   * The returned value depends on the field type:
   * - CEXOLOCSTRING: Returns the localized string value
   * - DWORD64: Returns the 64-bit unsigned integer value
   * - Other types: Returns the stored value directly
   * 
   * @returns {any} The field's value (type-dependent)
   * 
   * @example
   * ```typescript
   * const stringField = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * console.log(stringField.getValue); // 'PlayerName'
   * 
   * const intField = new GFFField(GFFDataType.INT, 'Level', 5);
   * console.log(intField.getValue); // 5
   * 
   * const vectorField = new GFFField(GFFDataType.VECTOR, 'Position', new THREE.Vector3(1, 2, 3));
   * console.log(vectorField.getValue); // Vector3 {x: 1, y: 2, z: 3}
   * ```
   */
  getValue(){
    switch(this.type){
      case GFFDataType.CEXOLOCSTRING:
        return this.cexoLocString.getValue();
      case GFFDataType.DWORD64:
        return this.dataView.getBigUint64(0, true);
      default:
        return this.value;
    }
  }

  /**
   * Gets the 3D vector value for VECTOR type fields.
   * 
   * @returns {THREE.Vector3} The 3D vector value
   * 
   * @example
   * ```typescript
   * const vectorField = new GFFField(GFFDataType.VECTOR, 'Position', new THREE.Vector3(1, 2, 3));
   * const position = vectorField.getVector;
   * console.log(position.x, position.y, position.z); // 1, 2, 3
   * ```
   */
  getVector(){
    return this.vector;
  }

  /**
   * Gets the first child structure for STRUCT type fields.
   * 
   * @returns {GFFStruct} The first child structure, or undefined if none exists
   * 
   * @example
   * ```typescript
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * const childStruct = new GFFStruct(0x0007);
   * structField.addChildStruct(childStruct);
   * 
   * const firstStruct = structField.getFieldStruct;
   * console.log(firstStruct.getType); // 0x0007
   * ```
   */
  getFieldStruct(): GFFStruct {
    return this.childStructs[0];
  }

  /**
   * Gets all child structures for STRUCT and LIST type fields.
   * 
   * @returns {GFFStruct} Array of all child structures
   * 
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * listField.addChildStruct(new GFFStruct(0x0008));
   * listField.addChildStruct(new GFFStruct(0x0008));
   * 
   * const children = listField.getChildStructs;
   * console.log(children.length); // 2
   * ```
   */
  getChildStructs(): GFFStruct[] {
    return this.childStructs;
  }

  /**
   * Gets a child structure by its type identifier.
   * 
   * @param {number} [type=-1] - The type identifier to search for
   * @returns {GFFStruct | null} The first child structure with the specified type, or null if not found
   * 
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * listField.addChildStruct(new GFFStruct(0x0008)); // Item type
   * listField.addChildStruct(new GFFStruct(0x0007)); // Creature type
   * 
   * const itemStruct = listField.getChildStructByType(0x0008);
   * console.log(itemStruct.getType); // 0x0008
   * ```
   */
  getChildStructByType(type = -1): GFFStruct | null {
    for(let i = 0; i < this.childStructs.length; i++){
      if(this.childStructs[i].type == type)
        return this.childStructs[i];
    }
    return null;
  }

  /**
   * Gets a field from the first child structure by its label.
   * 
   * @param {string} Label - The label of the field to retrieve
   * @returns {GFFField | null} The field with the specified label, or null if not found
   * 
   * @example
   * ```typescript
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * const childStruct = new GFFStruct(0x0007);
   * childStruct.addField(new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName'));
   * structField.addChildStruct(childStruct);
   * 
   * const nameField = structField.getFieldByLabel('Name');
   * console.log(nameField.getValue); // 'PlayerName'
   * ```
   */
  getFieldByLabel(Label: string): GFFField | null {
    if(this.childStructs.length){
      for(let i = 0; i < this.childStructs[0].fields.length; i++){
        let field = this.childStructs[0].fields[i];
        if (field.label == Label){
          return field;
        }
      }
    }

    return null;
  }

  /**
   * Gets the localized string data for CEXOLOCSTRING type fields.
   * 
   * @returns {CExoLocString} The localized string object
   * 
   * @example
   * ```typescript
   * const locField = new GFFField(GFFDataType.CEXOLOCSTRING, 'Description');
   * const locString = locField.getCExoLocString;
   * locString.addSubString('Hello World', 0);
   * ```
   */
  getCExoLocString(): CExoLocString {
    return this.cexoLocString;
  }

  /**
   * Gets the 3D orientation value for ORIENTATION type fields.
   * 
   * @returns {THREE.Quaternion} The 3D orientation quaternion
   * 
   * @example
   * ```typescript
   * const orientField = new GFFField(GFFDataType.ORIENTATION, 'Rotation', new THREE.Quaternion(0, 0, 0, 1));
   * const rotation = orientField.getOrientation;
   * console.log(rotation.x, rotation.y, rotation.z, rotation.w); // 0, 0, 0, 1
   * ```
   */
  getOrientation(): {x: number, y: number, z: number, w: number} {
    return this.orientation;
  }

  /**
   * Sets the raw binary data for this field.
   * 
   * @param {Uint8Array} data - The binary data to set
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.VOID, 'BinaryData');
   * field.setData(new Uint8Array([1, 2, 3, 4]));
   * ```
   */
  setData(data: Uint8Array): this {
    this.data = data;
    this.dataView = new DataView(this.data.buffer);
    return this;
  }

  /**
   * Sets the value of this field based on its data type.
   * 
   * The method handles type-specific validation and conversion:
   * - CEXOLOCSTRING: Accepts CExoLocString objects, numbers (for RESREF), or strings
   * - RESREF/CEXOSTRING/CHAR: Converts to string
   * - BYTE: Validates range 0-255
   * - SHORT: Validates range -32768 to 32767
   * - INT: Validates range -2147483648 to 2147483647
   * - WORD: Validates range 0-65535
   * - DWORD: Validates range 0-4294967295
   * - VOID: Accepts Uint8Array or ArrayBuffer
   * 
   * @param {any} val - The value to set (type-dependent)
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * // String field
   * const nameField = new GFFField(GFFDataType.CExoString, 'Name');
   * nameField.setValue('PlayerName');
   * 
   * // Integer field with validation
   * const levelField = new GFFField(GFFDataType.BYTE, 'Level');
   * levelField.setValue(5); // Valid: 0-255
   * 
   * // Vector field
   * const posField = new GFFField(GFFDataType.VECTOR, 'Position');
   * posField.setValue(new THREE.Vector3(1, 2, 3));
   * 
   * // Localized string field
   * const descField = new GFFField(GFFDataType.CEXOLOCSTRING, 'Description');
   * descField.setValue('Hello World');
   * ```
   */
  setValue(val: any): this {

    switch(this.type){
      case GFFDataType.CEXOLOCSTRING:
        if(val instanceof CExoLocString){
          this.cexoLocString = val;
        }else if(typeof val === 'number'){
          this.cexoLocString.setRESREF(val);
        }else if(typeof val === 'string'){
          this.cexoLocString.addSubString(val, 0);
        }
      break;
      case GFFDataType.RESREF:
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()
        
        this.value = val;
      break;
      case GFFDataType.CEXOSTRING:
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()
        
        this.value = val;
      break;
      case GFFDataType.CHAR:
        // CHAR is a signed byte; store as number (not string) so export
        // writes the numeric value instead of charCodeAt("2") === 50.
        this.value = (Number(val || 0) << 24) >> 24;
      break;
      case GFFDataType.BYTE:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= 0 && val <= 255){
          this.value = val;
        }else{
          console.error('Field.setValue BYTE OutOfBounds', val, this);
          this.value = val;
        }
      break;
      case GFFDataType.SHORT:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= -32768 && val <= 32767){
          this.value = val;
        }else{
          console.error('Field.setValue SHORT OutOfBounds', val, this);
          this.value = val;
        }
      break;
      case GFFDataType.INT:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= -2147483648 && val <= 21474836487){
          this.value = val;
        }else{
          console.error('Field.setValue INT OutOfBounds', val, this);
          this.value = val;
        }
      break;
      case GFFDataType.WORD:
        if(typeof val === 'undefined'){
          val = 0;
        }

        if(val >= 0 && val <= 65535){
          this.value = val;
        }else{
          console.error('Field.setValue WORD OutOfBounds', val, this);
          this.value = val;
        }
      break;
      case GFFDataType.DWORD:
        if(typeof val === 'undefined'){
          val = 0;
        }

        if(val >= 0 && val <= 4294967296){
          this.value = val;
        }else{
          console.error('Field.setValue DWORD OutOfBounds', val, this);
          this.value = val;
        }
      break;
      case GFFDataType.DWORD64: {
        // Exporter writes field.data (8 LE bytes); keep dataView in sync with value
        const n = typeof val === 'bigint' ? val : BigInt(Math.trunc(Number(val) || 0));
        this.data = new Uint8Array(8);
        this.dataView = new DataView(this.data.buffer);
        this.dataView.setBigUint64(0, n < 0n ? 0n : n, true);
        this.value = n < 0n ? 0n : n;
      break;
      }
      case GFFDataType.INT64: {
        const n = typeof val === 'bigint' ? val : BigInt(Math.trunc(Number(val) || 0));
        this.data = new Uint8Array(8);
        this.dataView = new DataView(this.data.buffer);
        this.dataView.setBigInt64(0, n, true);
        this.value = n;
      break;
      }
      case GFFDataType.VOID:
        if(val instanceof Uint8Array){
          this.value = val;
        }else if(val instanceof ArrayBuffer){
          this.value = new Uint8Array(val);
        }
      break;
      case GFFDataType.VECTOR:
        // Exporter serializes from this.vector, not this.value
        if(typeof val == 'object' && typeof val.x == 'number' && typeof val.y == 'number' && typeof val.z == 'number'){
          this.vector = {x: val.x, y: val.y, z: val.z};
        }
      break;
      case GFFDataType.ORIENTATION:
        // Exporter serializes from this.orientation, not this.value
        if(typeof val == 'object' && typeof val.x == 'number' && typeof val.y == 'number' && typeof val.z == 'number' && typeof val.w == 'number'){
          this.orientation = {x: val.x, y: val.y, z: val.z, w: val.w};
        }
      break;
      default:
        this.value = val;
      break;
    }
    return this;

  }

  /**
   * Sets the data type of this field.
   * 
   * @param {number} type - The new data type (from GFFDataType enum)
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * field.setType(GFFDataType.INT);
   * ```
   */
  setType(type: number): this {
    this.type = type;
    return this;
  }

  /**
   * Sets the label/name of this field.
   * 
   * @param {string} label - The new field label
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CExoString, 'OldName', 'PlayerName');
   * field.setLabel('NewName');
   * ```
   */
  setLabel(label: string): this {
    this.label = label;
    return this;
  }

  /**
   * Sets the localized string data for CEXOLOCSTRING type fields.
   * 
   * @param {CExoLocString} val - The localized string object to set
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const locField = new GFFField(GFFDataType.CEXOLOCSTRING, 'Description');
   * const locString = new CExoLocString;
   * locString.addSubString('Hello World', 0);
   * locField.setCExoLocString(locString);
   * ```
   */
  setCExoLocString(val: CExoLocString): this {
    this.cexoLocString = val;
    return this;
  }

  /**
   * Sets the 3D vector value for VECTOR type fields.
   * 
   * @param {THREE.Vector3} v - The 3D vector to set
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const vectorField = new GFFField(GFFDataType.VECTOR, 'Position');
   * vectorField.setVector(new THREE.Vector3(1, 2, 3));
   * ```
   */
  setVector(v: {x: number, y: number, z: number}): this {
    this.vector = v;
    return this;
  }

  /**
   * Sets the 3D orientation value for ORIENTATION type fields.
   * 
   * @param {THREE.Quaternion} v - The 3D orientation quaternion to set
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const orientField = new GFFField(GFFDataType.ORIENTATION, 'Rotation');
   * orientField.setOrientation(new THREE.Quaternion(0, 0, 0, 1));
   * ```
   */
  setOrientation(v: {x: number, y: number, z: number, w: number}): this {
    this.orientation = v;
    return this;
  }

  /**
   * Adds a child structure to this field.
   * 
   * Behavior depends on field type:
   * - LIST: Adds the structure to the end of the list
   * - STRUCT: Replaces the existing structure (index 0)
   * - Other types: No effect
   * 
   * @param {GFFStruct} strt - The structure to add
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * // Add to a list field
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * listField.addChildStruct(new GFFStruct(0x0008));
   * listField.addChildStruct(new GFFStruct(0x0008));
   * 
   * // Set a structure field
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * structField.addChildStruct(new GFFStruct(0x0007));
   * ```
   */
  addChildStruct(strt: GFFStruct): this {
    if(!(strt instanceof GFFStruct)){
      console.log('addChildStruct invalid type', strt);
      return this;
    }

    switch(this.type){
      case GFFDataType.LIST:
        this.childStructs.push(strt);
      break;
      case GFFDataType.STRUCT:
        this.childStructs[0] = strt;
      break;
    }

    return this;
  }

  /**
   * Removes a child structure from this field.
   * 
   * @param {GFFStruct} strt - The structure to remove
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * const itemStruct = new GFFStruct(0x0008);
   * listField.addChildStruct(itemStruct);
   * 
   * listField.removeChildStruct(itemStruct);
   * console.log(listField.getChildStructs.length); // 0
   * ```
   */
  removeChildStruct(strt: GFFStruct): this {
    let index = this.childStructs.indexOf(strt);
    if(index >= 0){
      this.childStructs.splice(index, 1);
    }
    return this;
  }

  /**
   * Sets all child structures for this field.
   * 
   * @param {GFFStruct} strts - Array of structures to set
   * @returns {this} This field instance for method chaining
   * 
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * const structures = [
   * new GFFStruct(0x0008),
   * new GFFStruct(0x0008),
   * new GFFStruct(0x0008)
   * ];
   * 
   * listField.setChildStructs(structures);
   * console.log(listField.getChildStructs.length); // 3
   * ```
   */
  setChildStructs(strts: GFFStruct[]): this {
    this.childStructs = strts;
    return this;
  }

  /**
   * Converts this field to OpenKotOR GFF JSON
   * (`https://openkotor.com/schemas/gff.schema.json`).
   *
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CEXOSTRING, 'Name', 'PlayerName');
   * const json = field.toJSON;
   * // { type: 'cexostring', value: 'PlayerName' }
   * ```
   */
  toJSON(): IGFFFieldJSON {
    switch (this.getType()) {
      case GFFDataType.BYTE:
        return { type: 'byte', value: Number(this.getValue()) & 0xFF };
      case GFFDataType.CHAR: {
        const n = Number(this.getValue());
        return { type: 'char', value: (n << 24) >> 24 };
      }
      case GFFDataType.WORD:
        return { type: 'word', value: Number(this.getValue()) & 0xFFFF };
      case GFFDataType.SHORT: {
        const n = Number(this.getValue());
        return { type: 'short', value: (n << 16) >> 16 };
      }
      case GFFDataType.DWORD:
        return { type: 'dword', value: Number(this.getValue()) >>> 0 };
      case GFFDataType.INT:
        return { type: 'int', value: Number(this.getValue()) | 0 };
      case GFFDataType.FLOAT:
        return { type: 'float', value: Number(this.getValue()) };
      case GFFDataType.DOUBLE:
        return { type: 'double', value: Number(this.getValue()) };
      case GFFDataType.DWORD64:
        return { type: 'dword64', value: GFFField.jsonIntegerFromBigInt(this.getBigUint64()) };
      case GFFDataType.INT64:
        return { type: 'int64', value: GFFField.jsonIntegerFromBigInt(this.getBigInt64()) };
      case GFFDataType.CEXOSTRING:
        return { type: 'cexostring', value: String(this.getValue() ?? '') };
      case GFFDataType.RESREF:
        return { type: 'resref', value: String(this.getValue() ?? '') };
      case GFFDataType.CEXOLOCSTRING: {
        const loc = this.getCExoLocString();
        const value: { [key: string]: string | number } = {};
        // BadStrRef (-1) is omitted per the OpenKotOR schema.
        if(loc && loc.getRESREF() !== -1){
          value.id = loc.getRESREF();
        }
        const strings = loc?.getStrings() ?? [];
        for(let i = 0; i < strings.length; i++){
          const sub = strings[i];
          if(!sub) continue;
          value[String(sub.GetStringID())] = sub.getString();
        }
        return { type: 'cexolocstring', value };
      }
      case GFFDataType.VOID: {
        const bytes = this.getVoid() || new Uint8Array(0);
        return { type: 'void', value64: GFFField.bytesToBase64(bytes) };
      }
      case GFFDataType.STRUCT: {
        const children = this.getChildStructs();
        const child = children.length ? children[0].toJSON() : {};
        return { type: 'struct', value: child };
      }
      case GFFDataType.LIST:
        return {
          type: 'list',
          value: this.getChildStructs().map((struct) => struct.toJSON()),
        };
      case GFFDataType.VECTOR: {
        const v = this.getVector() || { x: 0, y: 0, z: 0 };
        return { type: 'vector', value: { x: v.x, y: v.y, z: v.z } };
      }
      case GFFDataType.ORIENTATION: {
        const o = this.getOrientation() || { x: 0, y: 0, z: 0, w: 1 };
        return { type: 'orientation', value: { x: o.x, y: o.y, z: o.z, w: o.w } };
      }
      default:
        return { type: 'int', value: Number(this.getValue()) | 0 };
    }
  }

  /** Reads a little-endian unsigned 64-bit value from field data (or value). */
  getBigUint64(): bigint {
    if(this.dataView && this.data && this.data.byteLength >= 8){
      return this.dataView.getBigUint64(0, true);
    }
    const v = this.value;
    if(typeof v === 'bigint') return v;
    if(typeof v === 'number') return BigInt(Math.trunc(v));
    if(typeof v === 'string' && v.length) return BigInt(v);
    return 0n;
  }

  /** Reads a little-endian signed 64-bit value from field data (or value). */
  getBigInt64(): bigint {
    if(this.dataView && this.data && this.data.byteLength >= 8){
      return this.dataView.getBigInt64(0, true);
    }
    const v = this.value;
    if(typeof v === 'bigint') return v;
    if(typeof v === 'number') return BigInt(Math.trunc(v));
    if(typeof v === 'string' && v.length) return BigInt(v);
    return 0n;
  }

  private static jsonIntegerFromBigInt(value: bigint): number {
    if(value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)){
      return Number(value);
    }
    // JSON Schema wants an integer; beyond safe range we still emit a number
    // (precision may be lost) rather than throwing on BigInt stringify.
    return Number(value);
  }

  private static bytesToBase64(bytes: Uint8Array): string {
    if(typeof Buffer !== 'undefined'){
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const chunk = 0x8000;
    for(let i = 0; i < bytes.length; i += chunk){
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

}