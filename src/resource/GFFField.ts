import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "./CExoLocString";
import { GFFStruct } from "./GFFStruct";
import type { IGFFFieldJSON } from "../interface/resource/IGFFFieldJSON";

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
 * console.log(nameField.getValue()); // 'PlayerName'
 * nameField.setValue('NewName');
 * ```
 * 
 * @file GFFField.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GFFField {
  /** Unique identifier for this field instance */
  uuid: string;
  
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
    this.uuid = crypto.randomUUID();
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
   * log.info(field.getType()); // GFFDataType.CExoString
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
   * log.info(field.getLabel()); // 'Name'
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
   * const data = voidField.getVoid(); // Uint8Array [1, 2, 3, 4]
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
   * console.log(stringField.getValue()); // 'PlayerName'
   * 
   * const intField = new GFFField(GFFDataType.INT, 'Level', 5);
   * console.log(intField.getValue()); // 5
   * 
   * const vectorField = new GFFField(GFFDataType.VECTOR, 'Position', new THREE.Vector3(1, 2, 3));
   * console.log(vectorField.getValue()); // Vector3 {x: 1, y: 2, z: 3}
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
   * const position = vectorField.getVector();
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
   * const childStruct = new GFFStruct(7);
   * structField.addChildStruct(childStruct);
   *
   * const firstStruct = structField.getFieldStruct();
   * log.info(firstStruct.getType()); // 7
   * ```
   */
  getFieldStruct(): GFFStruct {
    return this.childStructs[0];
  }

  /**
   * Gets all child structures for STRUCT and LIST type fields.
   *
   * @returns {GFFStruct[]} Array of all child structures
   *
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * listField.addChildStruct(new GFFStruct(8));
   * listField.addChildStruct(new GFFStruct(8));
   *
   * const children = listField.getChildStructs();
   * log.info(children.length); // 2
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
   * listField.addChildStruct(new GFFStruct(8)); // Item type
   * listField.addChildStruct(new GFFStruct(7)); // Creature type
   *
   * const itemStruct = listField.getChildStructByType(8);
   * log.info(itemStruct.getType()); // 8
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
   * const childStruct = new GFFStruct(7);
   * childStruct.addField(new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName'));
   * structField.addChildStruct(childStruct);
   *
   * const nameField = structField.getFieldByLabel('Name');
   * log.info(nameField.getValue()); // 'PlayerName'
   * ```
   */
  getFieldByLabel(Label: string): GFFField | null {
    if(this.childStructs.length){
      for(let i = 0; i < this.childStructs[0].fields.length; i++){
        const field = this.childStructs[0].fields[i];
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
   * const locString = locField.getCExoLocString();
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
   * const rotation = orientField.getOrientation();
   * log.info(rotation.x, rotation.y, rotation.z, rotation.w); // 0, 0, 0, 1
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
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()

        this.value = val.toString();
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
      case GFFDataType.VOID:
        if(val instanceof Uint8Array){
          this.value = val;
        }else if(val instanceof ArrayBuffer){
          this.value = new Uint8Array(val);
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
   * const locString = new CExoLocString();
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
   * listField.addChildStruct(new GFFStruct(8));
   * listField.addChildStruct(new GFFStruct(8));
   *
   * // Set a structure field
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * structField.addChildStruct(new GFFStruct(7));
   * ```
   */
  addChildStruct(strt: GFFStruct): this {
    if(!(strt instanceof GFFStruct)){
      log.warn('addChildStruct invalid type', strt);
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
   * const itemStruct = new GFFStruct(8);
   * listField.addChildStruct(itemStruct);
   *
   * listField.removeChildStruct(itemStruct);
   * log.info(listField.getChildStructs().length); // 0
   * ```
   */
  removeChildStruct(strt: GFFStruct): this {
    const index = this.childStructs.indexOf(strt);
    if(index >= 0){
      this.childStructs.splice(index, 1);
    }
    return this;
  }

  /**
   * Sets all child structures for this field.
   *
   * @param {GFFStruct[]} strts - Array of structures to set
   * @returns {this} This field instance for method chaining
   *
   * @example
   * ```typescript
   * const listField = new GFFField(GFFDataType.LIST, 'ItemList');
   * const structures = [
   *   new GFFStruct(8),
   *   new GFFStruct(8),
   *   new GFFStruct(8)
   * ];
   *
   * listField.setChildStructs(structures);
   * log.info(listField.getChildStructs().length); // 3
   * ```
   */
  setChildStructs(strts: GFFStruct[]): this {
    this.childStructs = strts;
    return this;
  }

  /**
   * Converts this field to a JSON representation.
   * 
   * The JSON structure includes:
   * - type: The field's data type
   * - value: The field's value (type-specific)
   * - structs: Array of child structure JSON objects
   * 
   * @returns {IGFFFieldJSON} A JSON object representing this field
   * 
   * @example
   * ```typescript
   * const field = new GFFField(GFFDataType.CExoString, 'Name', 'PlayerName');
   * const json = field.toJSON();
   * console.log(json.type); // GFFDataType.CExoString
   * console.log(json.value); // 'PlayerName'
   * 
   * // With child structures
   * const structField = new GFFField(GFFDataType.STRUCT, 'CreatureData');
   * structField.addChildStruct(new GFFStruct(0x0007));
   * const structJson = structField.toJSON();
   * console.log(structJson.structs.length); // 1
   * ```
   */
  toJSON(): IGFFFieldJSON {
    const field = {
      type: this.getType(),
      value: this.getValue(),
      structs: [] as any[]
    };

    switch (this.getType()) {
      case GFFDataType.CEXOLOCSTRING:
        field.value = this.getCExoLocString();
      break;
      case GFFDataType.VOID:
        field.value = this.getVoid();
      break;
      case GFFDataType.ORIENTATION:
        field.value = this.getOrientation();
      break;
      case GFFDataType.VECTOR:
        field.value = this.getVector();
      break;
    }

    const children = this.getChildStructs();
    for(let i = 0; i < children.length; i++){
      field.structs[i] = children[i].toJSON();
    }

    return field;
  }

}