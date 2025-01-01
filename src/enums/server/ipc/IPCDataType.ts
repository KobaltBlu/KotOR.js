export enum IPCDataType {
  /**
   * Binary data  
   */
  VOID = 0x00,
  /**
   * 32-bit integer
   */
  INTEGER = 0x03,
  /**
   * 32-bit float
   */
  FLOAT = 0x04,
  /**
   * String
   */
  STRING = 0x05,
  /**
   * Object ID
   * These are special DWORDs that are used to represent object IDs in the game
   */
  OBJECT_ID = 0x06,
}