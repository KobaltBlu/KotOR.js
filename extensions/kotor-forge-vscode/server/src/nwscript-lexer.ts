/**
 * Production-ready NWScript Lexer/Tokenizer
 * Handles all NWScript tokens including KOTOR-specific constructs
 */

import { SourceLocation } from './nwscript-ast';

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  
  // Specific value types
  INT_VALUE = 'INT_VALUE',
  FLOAT_VALUE = 'FLOAT_VALUE',
  INT_HEX_VALUE = 'INT_HEX_VALUE',
  STRING_VALUE = 'STRING_VALUE',
  TRUE_VALUE = 'TRUE_VALUE',
  FALSE_VALUE = 'FALSE_VALUE',
  OBJECTSELF_VALUE = 'OBJECTSELF_VALUE',
  OBJECTINVALID_VALUE = 'OBJECTINVALID_VALUE',

  // Type keywords
  VOID = 'void',
  INT = 'int',
  FLOAT = 'float',
  STRING_TYPE = 'string',
  OBJECT = 'object',
  VECTOR = 'vector',
  LOCATION = 'location',
  EVENT = 'event',
  EFFECT = 'effect',
  ITEMPROPERTY = 'itemproperty',
  TALENT = 'talent',
  ACTION = 'action',
  STRUCT = 'struct',
  CONST = 'const',

  // Control flow
  IF = 'if',
  ELSE = 'else',
  WHILE = 'while',
  FOR = 'for',
  DO = 'do',
  SWITCH = 'switch',
  CASE = 'case',
  DEFAULT = 'default',
  BREAK = 'break',
  CONTINUE = 'continue',
  RETURN = 'return',

  // Operators
  ASSIGN = '=',
  PLUS_ASSIGN = '+=',
  MINUS_ASSIGN = '-=',
  MULTIPLY_ASSIGN = '*=',
  DIVIDE_ASSIGN = '/=',
  MODULO_ASSIGN = '%=',

  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  MODULO = '%',

  EQUAL = '==',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  LESS_EQUAL = '<=',
  GREATER_THAN = '>',
  GREATER_EQUAL = '>=',

  LOGICAL_AND = '&&',
  LOGICAL_OR = '||',
  LOGICAL_NOT = '!',

  BITWISE_AND = '&',
  BITWISE_OR = '|',
  BITWISE_XOR = '^',
  BITWISE_NOT = '~',
  LEFT_SHIFT = '<<',
  RIGHT_SHIFT = '>>',

  INCREMENT = '++',
  DECREMENT = '--',

  // Punctuation
  SEMICOLON = ';',
  COMMA = ',',
  DOT = '.',
  QUESTION = '?',
  COLON = ':',

  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  LEFT_BRACE = '{',
  RIGHT_BRACE = '}',
  LEFT_BRACKET = '[',
  RIGHT_BRACKET = ']',

  // Preprocessor
  INCLUDE = '#include',
  DEFINE = '#define',

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
  COMMENT = 'COMMENT'
}

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
  raw?: string;
}

export class NWScriptLexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  // Keywords mapping
  private keywords: Map<string, TokenType> = new Map([
    ['void', TokenType.VOID],
    ['int', TokenType.INT],
    ['float', TokenType.FLOAT],
    ['string', TokenType.STRING_TYPE],
    ['object', TokenType.OBJECT],
    ['vector', TokenType.VECTOR],
    ['location', TokenType.LOCATION],
    ['event', TokenType.EVENT],
    ['effect', TokenType.EFFECT],
    ['itemproperty', TokenType.ITEMPROPERTY],
    ['talent', TokenType.TALENT],
    ['action', TokenType.ACTION],
    ['struct', TokenType.STRUCT],
    ['const', TokenType.CONST],
    ['if', TokenType.IF],
    ['else', TokenType.ELSE],
    ['while', TokenType.WHILE],
    ['for', TokenType.FOR],
    ['do', TokenType.DO],
    ['switch', TokenType.SWITCH],
    ['case', TokenType.CASE],
    ['default', TokenType.DEFAULT],
    ['break', TokenType.BREAK],
    ['continue', TokenType.CONTINUE],
    ['return', TokenType.RETURN],
    // Special constants
    ['TRUE', TokenType.TRUE_VALUE],
    ['FALSE', TokenType.FALSE_VALUE],
    ['OBJECT_SELF', TokenType.OBJECTSELF_VALUE],
    ['OBJECT_INVALID', TokenType.OBJECTINVALID_VALUE]
  ]);

  constructor(source: string) {
    this.source = source;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.scanToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      location: this.getCurrentLocation()
    });

    return tokens;
  }

  private scanToken(): Token | null {
    const start = this.getCurrentLocation();
    const char = this.advance();

    switch (char) {
      // Whitespace
      case ' ':
      case '\r':
      case '\t':
        return null; // Skip whitespace

      case '\n':
        this.line++;
        this.column = 1;
        return null; // Skip newlines

      // Single character tokens
      case '(':
        return this.makeToken(TokenType.LEFT_PAREN, char, start);
      case ')':
        return this.makeToken(TokenType.RIGHT_PAREN, char, start);
      case '{':
        return this.makeToken(TokenType.LEFT_BRACE, char, start);
      case '}':
        return this.makeToken(TokenType.RIGHT_BRACE, char, start);
      case '[':
        return this.makeToken(TokenType.LEFT_BRACKET, char, start);
      case ']':
        return this.makeToken(TokenType.RIGHT_BRACKET, char, start);
      case ',':
        return this.makeToken(TokenType.COMMA, char, start);
      case '.':
        return this.makeToken(TokenType.DOT, char, start);
      case ';':
        return this.makeToken(TokenType.SEMICOLON, char, start);
      case '?':
        return this.makeToken(TokenType.QUESTION, char, start);
      case ':':
        return this.makeToken(TokenType.COLON, char, start);
      case '~':
        return this.makeToken(TokenType.BITWISE_NOT, char, start);

      // Operators that can be compound
      case '+':
        if (this.match('=')) return this.makeToken(TokenType.PLUS_ASSIGN, '+=', start);
        if (this.match('+')) return this.makeToken(TokenType.INCREMENT, '++', start);
        return this.makeToken(TokenType.PLUS, char, start);

      case '-':
        if (this.match('=')) return this.makeToken(TokenType.MINUS_ASSIGN, '-=', start);
        if (this.match('-')) return this.makeToken(TokenType.DECREMENT, '--', start);
        return this.makeToken(TokenType.MINUS, char, start);

      case '*':
        if (this.match('=')) return this.makeToken(TokenType.MULTIPLY_ASSIGN, '*=', start);
        return this.makeToken(TokenType.MULTIPLY, char, start);

      case '%':
        if (this.match('=')) return this.makeToken(TokenType.MODULO_ASSIGN, '%=', start);
        return this.makeToken(TokenType.MODULO, char, start);

      case '!':
        if (this.match('=')) return this.makeToken(TokenType.NOT_EQUAL, '!=', start);
        return this.makeToken(TokenType.LOGICAL_NOT, char, start);

      case '=':
        if (this.match('=')) return this.makeToken(TokenType.EQUAL, '==', start);
        return this.makeToken(TokenType.ASSIGN, char, start);

      case '<':
        if (this.match('=')) return this.makeToken(TokenType.LESS_EQUAL, '<=', start);
        if (this.match('<')) return this.makeToken(TokenType.LEFT_SHIFT, '<<', start);
        return this.makeToken(TokenType.LESS_THAN, char, start);

      case '>':
        if (this.match('=')) return this.makeToken(TokenType.GREATER_EQUAL, '>=', start);
        if (this.match('>')) return this.makeToken(TokenType.RIGHT_SHIFT, '>>', start);
        return this.makeToken(TokenType.GREATER_THAN, char, start);

      case '&':
        if (this.match('&')) return this.makeToken(TokenType.LOGICAL_AND, '&&', start);
        return this.makeToken(TokenType.BITWISE_AND, char, start);

      case '|':
        if (this.match('|')) return this.makeToken(TokenType.LOGICAL_OR, '||', start);
        return this.makeToken(TokenType.BITWISE_OR, char, start);

      case '^':
        return this.makeToken(TokenType.BITWISE_XOR, char, start);

      case '/':
        if (this.match('/')) {
          // Line comment
          return this.scanLineComment(start);
        }
        if (this.match('*')) {
          // Block comment
          return this.scanBlockComment(start);
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.DIVIDE_ASSIGN, '/=', start);
        }
        return this.makeToken(TokenType.DIVIDE, char, start);

      case '#':
        return this.scanPreprocessor(start);

      case '"':
        return this.scanString(start);

      default:
        if (this.isDigit(char)) {
          return this.scanNumber(start);
        }
        if (this.isAlpha(char)) {
          return this.scanIdentifier(start);
        }

        // Unknown character - create error token
        return this.makeToken(TokenType.IDENTIFIER, char, start);
    }
  }

  private scanString(start: SourceLocation): Token {
    const value: string[] = [];

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }

      if (this.peek() === '\\') {
        this.advance(); // Skip backslash
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value.push('\n'); break;
          case 't': value.push('\t'); break;
          case 'r': value.push('\r'); break;
          case '\\': value.push('\\'); break;
          case '"': value.push('"'); break;
          default: value.push(escaped); break;
        }
      } else {
        value.push(this.advance());
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${start.line}`);
    }

    // Consume closing quote
    this.advance();

    return this.makeToken(TokenType.STRING, value.join(''), start, `"${value.join('')}"`);
  }

  private scanNumber(start: SourceLocation): Token {
    const startPos = this.position - 1;
    
    // Check for hexadecimal numbers (0x prefix)
    if (this.source.charAt(startPos) === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
      this.advance(); // consume 'x'
      
      // Consume hex digits
      while (this.isHexDigit(this.peek())) {
        this.advance();
      }
      
      const raw = this.source.substring(startPos, this.position);
      const value = parseInt(raw, 16);
      
      return this.makeToken(TokenType.INT_HEX_VALUE, value, start, raw);
    }

    // Consume integer part
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    let isFloat = false;
    
    // Look for decimal point
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      isFloat = true;
      this.advance(); // Consume '.'

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Look for 'f' suffix for float literals
    if (this.peek() === 'f' || this.peek() === 'F') {
      isFloat = true;
      this.advance();
    }

    const raw = this.source.substring(startPos, this.position);
    const value = isFloat ? parseFloat(raw.replace(/f$/i, '')) : parseInt(raw, 10);
    const tokenType = isFloat ? TokenType.FLOAT_VALUE : TokenType.INT_VALUE;

    return this.makeToken(tokenType, value, start, raw);
  }

  private scanIdentifier(start: SourceLocation): Token {
    const startPos = this.position - 1;

    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(startPos, this.position);
    const tokenType = this.keywords.get(text) || TokenType.IDENTIFIER;

    return this.makeToken(tokenType, text, start);
  }

  private scanLineComment(start: SourceLocation): Token | null {
    const startPos = this.position - 2; // Include '//'

    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }

    const text = this.source.substring(startPos, this.position);
    return this.makeToken(TokenType.COMMENT, text, start);
  }

  private scanBlockComment(start: SourceLocation): Token | null {
    const startPos = this.position - 2; // Include '/*'

    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // *
        this.advance(); // /
        break;
      }

      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }

      this.advance();
    }

    const text = this.source.substring(startPos, this.position);
    return this.makeToken(TokenType.COMMENT, text, start);
  }

  private scanPreprocessor(start: SourceLocation): Token {
    const startPos = this.position - 1; // Include '#'

    // Read the directive name
    while (this.isAlpha(this.peek())) {
      this.advance();
    }

    const directive = this.source.substring(startPos, this.position);

    if (directive === '#include') {
      return this.makeToken(TokenType.INCLUDE, directive, start);
    } else if (directive === '#define') {
      return this.makeToken(TokenType.DEFINE, directive, start);
    }

    // Unknown preprocessor directive
    return this.makeToken(TokenType.IDENTIFIER, directive, start);
  }

  private makeToken(type: TokenType, value: any, start: SourceLocation, raw?: string): Token {
    return {
      type,
      value,
      location: start,
      raw
    };
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private advance(): string {
    const char = this.source.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.position) !== expected) return false;

    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.position + 1);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isHexDigit(char: string): boolean {
    return (char >= '0' && char <= '9') ||
           (char >= 'a' && char <= 'f') ||
           (char >= 'A' && char <= 'F');
  }

  private getCurrentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.position
    };
  }
}
