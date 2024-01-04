/**
 * NWScriptByteCode enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptByteCode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum NWScriptByteCode {
  'CPDOWNSP'=       1,
  'RSADD'=          2, //Reserve Space On Stack
  'CPTOPSP'=        3,
  'CONST'=          4, //Constant Type is declared by the next byte x03, x04, x05, x06
  'ACTION'=         5,
  'LOGANDII'=       6,
  'LOGORII'=        7,
  'INCORII'=        8,
  'EXCORII'=        9,
  'BOOLANDII'=      10,
  'EQUAL'=          11, //Constant Type is declared by the next byte x03, x04, x05, x06
  'NEQUAL'=         12, //Constant Type is declared by the next byte x03, x04, x05, x06
  'GEQ'=            13, //Constant Type is declared by the next byte x03, x04
  'GT'=             14, //Constant Type is declared by the next byte x03, x04
  'LT'=             15, //Constant Type is declared by the next byte x03, x04
  'LEQ'=            16, //Constant Type is declared by the next byte x03, x04
  'SHLEFTII'=       17,
  'SHRIGHTII'=      18,
  'USHRIGHTII'=     19,
  'ADD'=            20,
  'SUB'=            21,
  'MUL'=            22,
  'DIV'=            23,
  'MOD'=            24,
  'NEG'=            25,
  'COMPI'=          26,
  'MOVSP'=          27,
  'STORE_STATEALL'= 28,
  'JMP'=            29,
  'JSR'=            30,
  'JZ'=             31,
  'RETN'=           32,
  'DESTRUCT'=       33,
  'NOTI'=           34,
  'DECISP'=         35,
  'INCISP'=         36,
  'JNZ'=            37,
  'CPDOWNBP'=       38,
  'CPTOPBP'=        39,
  'DECIBP'=         40,
  'INCIBP'=         41,
  'SAVEBP'=         42,
  'RESTOREBP'=      43,
  'STORE_STATE'=    44,
  'NOP'=            45,
  'T'=              46,
};