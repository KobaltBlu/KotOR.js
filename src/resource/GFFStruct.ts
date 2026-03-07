import type { GFFField } from "./GFFField";
import type { IGFFStructJSON } from "../interface/resource/IGFFStructJSON";

/**
 * Represents a GFF (Generic File Format) structure containing a collection of fields.
 * 
 * GFFStruct is a fundamental building block in the GFF file format used by BioWare's
 * Aurora Engine. It represents a structured data container that can hold multiple
 * fields of various data types, similar to a record or struct in programming.
 * 
 * @class GFFStruct
 * 
 * @example
 * ```typescript
 * // Create a new GFF structure
 * const struct = new GFFStruct(0x1234); // 0x1234 is the structure type
 * 
 * // Add fields to the structure
 * const nameField = new GFFField('Name', GFFDataType.CExoString, 'PlayerName');
 * struct.addField(nameField);
 * 
 * // Retrieve a field by label
 * const retrievedField = struct.getFieldByLabel('Name');
 * 
 * // Check if a field exists
 * if (struct.hasField('Name')) {
 *   console.log('Name field exists');
 * }
 * ```
 * 
 * @file GFFStruct.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GFFStruct {
  /** Unique identifier for this structure instance */
  uuid: string;
  
  /** Array of fields contained within this structure */
  fields: GFFField[];
  
  /** Type identifier for this structure (used to identify the structure's purpose) */
  type: number;

  /** Index position of this structure within its parent container */
  index: number = 0;
  
  /** Number of fields in this structure (legacy property, use fields.length instead) */
  fieldCount: number = 0;

  /**
   * Creates a new GFFStruct instance.
   * 
   * @param {number} [type=0] - The type identifier for this structure. Different types
   *                           represent different kinds of data structures (e.g., creature,
   *                           item, area, etc.)
   * 
   * @example
   * ```typescript
   * // Create a creature structure
   * const creatureStruct = new GFFStruct(0x0007);
   * 
   * // Create an item structure  
   * const itemStruct = new GFFStruct(0x0008);
   * ```
   */
  constructor(type = 0){
    this.uuid = crypto.randomUUID();
    this.fields = [];
    this.type = type;
  }

  /**
   * Sets the type identifier for this structure.
   * 
   * @param {number} i - The new type identifier
   * @returns {GFFStruct} This structure instance for method chaining
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * struct.setType(0x0007); // Set to creature type
   * ```
   */
  setType(i: number){
    this.type = i;
    return this;
  }

  /**
   * Adds a field to this structure.
   * 
   * @param {GFFField} field - The field to add to the structure
   * @returns {GFFField} The added field, or undefined if field is null/undefined
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * const nameField = new GFFField('Name', GFFDataType.CExoString, 'PlayerName');
   * struct.addField(nameField);
   * ```
   */
  addField(field: GFFField){
    if(!field) return;
    
    return this.fields[this.fields.length] = field;
  }

  /**
   * Removes a field from this structure by its label.
   * 
   * @param {string} [label=''] - The label of the field to remove
   * @returns {boolean} True if the field was found and removed, false otherwise
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * struct.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * 
   * const removed = struct.removeFieldByLabel('Name');
   * console.log(removed); // true
   * ```
   */
  removeFieldByLabel(label = ''){
    let field;
    for(let i = 0, len = this.fields.length; i < len; i++){
      field = this.fields[i];
      if(field.label == label){
        this.fields.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the type identifier of this structure.
   * 
   * @returns {number} The type identifier
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct(0x0007);
   * console.log(struct.getType()); // 0x0007
   * ```
   */
  getType(){
    return this.type;
  }

  /**
   * Gets all fields contained within this structure.
   * 
   * @returns {GFFField[]} Array of all fields in this structure
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * struct.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * struct.addField(new GFFField('Level', GFFDataType.UInt32, 1));
   * 
   * const fields = struct.getFields();
   * console.log(fields.length); // 2
   * ```
   */
  getFields(){
    return this.fields;
  }

  /**
   * Retrieves a field from this structure by its label.
   * 
   * @param {string} Label - The label of the field to retrieve
   * @returns {GFFField} The field with the specified label, or null if not found
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * struct.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * 
   * const nameField = struct.getFieldByLabel('Name');
   * if (nameField) {
   *   console.log(nameField.getValue()); // 'PlayerName'
   * }
   * ```
   */
  getFieldByLabel(Label: string): GFFField {

    for(let i = 0; i < this.fields.length; i++){
      const field = this.fields[i];
      if (field.label == Label){
        return field;
      }

      /*if (field.getType() == GFFDataType.LIST || field.getType() == GFFDataType.STRUCT){
        for(let j = 0; j!=field.getChildStructs().length; j++){
          let str = field.getChildStructs()[j];
          let child = str.getFieldByLabel(Label);
          if (child != null){
            return child;
          }
        }
      }*/
    }

    return null;
  }

  /**
   * Merges another GFFStruct into this structure by adding all its fields.
   * 
   * @param {GFFStruct} strt - The structure to merge into this one
   * @returns {GFFStruct} This structure instance for method chaining
   * 
   * @example
   * ```typescript
   * const struct1 = new GFFStruct();
   * struct1.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * 
   * const struct2 = new GFFStruct();
   * struct2.addField(new GFFField('Level', GFFDataType.UInt32, 1));
   * 
   * struct1.mergeStruct(struct2);
   * console.log(struct1.getFields().length); // 2
   * ```
   */
  mergeStruct(strt: GFFStruct){
    if(strt instanceof GFFStruct){
      for(let i = 0; i < strt.fields.length; i++){
        this.fields.push(strt.fields[i]);
      }
    }
    return this;
  }

  /**
   * Checks if this structure contains a field with the specified label.
   * 
   * @param {string} Label - The label of the field to check for
   * @returns {boolean} True if a field with the specified label exists, false otherwise
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct();
   * struct.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * 
   * if (struct.hasField('Name')) {
   *   console.log('Name field exists');
   * }
   * 
   * if (!struct.hasField('Level')) {
   *   console.log('Level field does not exist');
   * }
   * ```
   */
  hasField(Label: string){
    for(let i = 0; i < this.fields.length; i++){
      const field = this.fields[i];
      if (field.label == Label)
        return true;
    }
    return false;
  }

  /**
   * Converts this structure to a JSON representation.
   * 
   * @returns {IGFFStructJSON} A JSON object containing the structure's type and all field data
   * 
   * @example
   * ```typescript
   * const struct = new GFFStruct(0x0007);
   * struct.addField(new GFFField('Name', GFFDataType.CExoString, 'PlayerName'));
   * struct.addField(new GFFField('Level', GFFDataType.UInt32, 1));
   * 
   * const json = struct.toJSON();
   * console.log(json.type); // 0x0007
   * console.log(json.fields.Name.value); // 'PlayerName'
   * console.log(json.fields.Level.value); // 1
   * ```
   */
  toJSON(): IGFFStructJSON {
    const struct: IGFFStructJSON = {
      type: this.getType(),
      fields: {}
    };

    for(let i = 0; i < this.fields.length; i++){
      const f = this.fields[i];
      struct.fields[f.label] = f.toJSON();
    }

    return struct;
  }

}




