export type TokenType =
  | "eof"
  | "name"
  | "int"
  | "float"
  | "string"
  | "hex"
  | "keyword"
  | "op"
  | "punct"
  | "comment";

export interface SourceSpan {
  first_line: number;
  first_column: number;
  last_line: number;
  last_column: number;
}

export interface Token {
  type: TokenType;
  value: string;
  source: SourceSpan;
}