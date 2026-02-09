/**
 * Advanced NWScript Completion Provider
 * Uses AST analysis for context-aware completions
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { trace, debug } from './logger';
import {
  CompletionItem,
  CompletionItemKind,
  MarkupKind,
  TextDocumentPositionParams
} from 'vscode-languageserver/node';
import {
  cleanFunctionDescription,
  NWSCRIPT_KEYWORDS,
  NWSCRIPT_TYPES,
  NWScriptConstant,
  NWScriptFunction,
  NWScriptType
} from './kotor-definitions';
import {
  ASTNode,
  Program
} from './nwscript-ast';
import { NWScriptParser } from './nwscript-parser';

export interface CompletionContext {
  expectingType: boolean;
  inFunctionCall: boolean;
  functionName?: string;
  parameterIndex?: number;
  afterDot: boolean;
  objectType?: string;
  inString: boolean;
  inComment: boolean;
  nearestNode?: ASTNode;
  scope: 'global' | 'function' | 'local';
}

export class CompletionProvider {
  private functions: NWScriptFunction[];
  private constants: NWScriptConstant[];
  private types: NWScriptType[];
  private keywords: string[];

  constructor(
    functions: NWScriptFunction[],
    constants: NWScriptConstant[],
    types: NWScriptType[] = NWSCRIPT_TYPES,
    keywords: string[] = NWSCRIPT_KEYWORDS
  ) {
    this.functions = functions;
    this.constants = constants;
    this.types = types;
    this.keywords = keywords;
  }

  public provideCompletions(
    document: TextDocument,
    position: TextDocumentPositionParams['position']
  ): CompletionItem[] {
    trace(`provideCompletions() uri=${document.uri} line=${position.line} char=${position.character}`);
    const text = document.getText();
    const context = this.analyzeCompletionContext(text, position);

    if (context.inString || context.inComment) {
      trace('provideCompletions() in string or comment, returning []');
      return [];
    }

    const completions: CompletionItem[] = [];

    // Add type completions
    if (context.expectingType) {
      completions.push(...this.getTypeCompletions());
    } else {
      // Add function completions
      completions.push(...this.getFunctionCompletions(context));

      // Add constant completions
      completions.push(...this.getConstantCompletions(context));

      // Add keyword completions
      completions.push(...this.getKeywordCompletions(context));

      // Add context-specific completions
      if (context.inFunctionCall && context.functionName) {
        completions.push(...this.getParameterCompletions(context));
      }

      if (context.afterDot && context.objectType) {
        completions.push(...this.getMemberCompletions(context));
      }
    }

    debug(`provideCompletions() returning ${completions.length} items`);
    return completions;
  }

  private analyzeCompletionContext(text: string, position: { line: number; character: number }): CompletionContext {
    const context: CompletionContext = {
      expectingType: false,
      inFunctionCall: false,
      afterDot: false,
      inString: false,
      inComment: false,
      scope: 'global'
    };

    const lines = text.split('\n');
    if (position.line >= lines.length) {
      return context;
    }

    const line = lines[position.line] || '';
    const beforeCursor = line.substring(0, position.character);

    // Try to parse the document to get AST context
    try {
      const parseResult = NWScriptParser.parseWithErrors(text);
      if (parseResult.program) {
        context.nearestNode = this.findNearestNode(parseResult.program, position);
        context.scope = this.determineScope(parseResult.program, position);
      }
    } catch (error) {
      // Fallback to text-based analysis
    }

    // Analyze text context
    context.expectingType = this.isExpectingType(beforeCursor, lines, position.line);
    context.inFunctionCall = this.isInFunctionCall(beforeCursor);
    if (context.inFunctionCall) {
      const funcInfo = this.getFunctionCallInfo(beforeCursor);
      context.functionName = funcInfo.name;
      context.parameterIndex = funcInfo.parameterIndex;
    }
    context.afterDot = beforeCursor.trimEnd().endsWith('.');
    context.inString = this.isInString(beforeCursor);
    context.inComment = this.isInComment(beforeCursor);

    return context;
  }

  private findNearestNode(program: Program, position: { line: number; character: number }): ASTNode | undefined {
    let nearest: ASTNode | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    const visit = (node: ASTNode) => {
      const start = node.range.start;
      const end = node.range.end;
      const before = position.line < start.line || (position.line === start.line && position.character < start.column);
      const after = position.line > end.line || (position.line === end.line && position.character > end.column);
      if (!before && !after) {
        // Inside node; prefer the smallest containing node by measuring span
        const span = (end.line - start.line) * 10000 + (end.column - start.column);
        if (span < nearestDistance) {
          nearest = node;
          nearestDistance = span;
        }
      }
      // Recurse into children where applicable
      const anyNode = node as any;
      for (const key of Object.keys(anyNode)) {
        const value = anyNode[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(v => v && v.type && visit(v));
          } else if (value.type) {
            visit(value);
          }
        }
      }
    };

    visit(program as unknown as ASTNode);
    return nearest;
  }

  private determineScope(program: Program, position: { line: number; character: number }): 'global' | 'function' | 'local' {
    // Determine if inside any function declaration
    const isWithin = (range: { start: any; end: any }) => {
      const s = range.start; const e = range.end;
      const afterStart = position.line > s.line || (position.line === s.line && position.character >= s.column);
      const beforeEnd = position.line < e.line || (position.line === e.line && position.character <= e.column);
      return afterStart && beforeEnd;
    };

    let inFunc: any | undefined;
    (program.body || []).forEach((decl: any) => {
      if (decl && decl.type === 'FunctionDeclaration') {
        if (isWithin(decl.range)) {
          inFunc = decl;
        }
      }
    });

    if (!inFunc) return 'global';
    if (inFunc.body && inFunc.body.range && isWithin(inFunc.body.range)) return 'local';
    return 'function';
  }

  private isExpectingType(beforeCursor: string, lines: string[], currentLine: number): boolean {
    const trimmed = beforeCursor.trim();

    // Check if we're at the start of a declaration
    const declarationStarters = ['', 'const'];
    if (declarationStarters.includes(trimmed)) {
      return true;
    }

    // Check if we're after a type modifier
    if (trimmed.endsWith('const')) {
      return true;
    }

    return false;
  }

  private isInFunctionCall(beforeCursor: string): boolean {
    return /[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*$/.test(beforeCursor);
  }

  private getFunctionCallInfo(beforeCursor: string): { name?: string; parameterIndex?: number } {
    const match = beforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)$/);
    if (!match) return {};

    const functionName = match[1];
    const argsText = match[2] || '';
    const parameterIndex = argsText ? (argsText.match(/,/g) || []).length : 0;

    return { name: functionName, parameterIndex };
  }

  private isInString(beforeCursor: string): boolean {
    const quotes = beforeCursor.match(/"/g);
    return quotes ? quotes.length % 2 === 1 : false;
  }

  private isInComment(beforeCursor: string): boolean {
    return beforeCursor.includes('//') ||
           (beforeCursor.includes('/*') && !beforeCursor.includes('*/'));
  }

  // Completion generators

  private getTypeCompletions(): CompletionItem[] {
    return this.types.map(type => ({
      label: type.name,
      kind: CompletionItemKind.TypeParameter,
      detail: `Type: ${type.name}`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${type.name}**\n\n${type.description || `NWScript data type`}`
      },
      insertText: type.name,
      sortText: `0_${type.name}`
    }));
  }

  private getFunctionCompletions(context: CompletionContext): CompletionItem[] {
    return this.functions.map(func => {
      const params = func.parameters.map(p =>
        p.defaultValue ? `${p.type} ${p.name} = ${p.defaultValue}` : `${p.type} ${p.name}`
      ).join(', ');

      // Create snippet for function with parameters
      let snippetText = func.name;
      if (func.parameters.length > 0) {
        const snippetParams = func.parameters.map((p, index) => {
          const placeholder = p.defaultValue ? `\${${index + 1}:${p.defaultValue}}` : `\${${index + 1}:${p.name}}`;
          return placeholder;
        }).join(', ');
        snippetText = `${func.name}(${snippetParams})`;
      } else {
        snippetText = `${func.name}()`;
      }

      return {
        label: func.name,
        kind: CompletionItemKind.Function,
        detail: `${func.returnType} ${func.name}(${params})`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${func.name}** (${func.returnType})\n\n\`\`\`nwscript\n${func.returnType} ${func.name}(${params})\n\`\`\`\n\n${cleanFunctionDescription(func.description) || `Function returning ${func.returnType}`}${func.category ? `\n\n*Category:* ${func.category}` : ''}`
        },
        insertText: snippetText,
        insertTextFormat: 2, // Snippet format
        sortText: `2_${func.category || 'other'}_${func.name}`
      };
    });
  }

  private getConstantCompletions(context: CompletionContext): CompletionItem[] {
    return this.constants.map(constant => ({
      label: constant.name,
      kind: CompletionItemKind.Constant,
      detail: `${constant.type} = ${constant.value}`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${constant.name}** (${constant.type})\n\n${constant.description || `Constant of type ${constant.type}`}\n\n*Value:* \`${constant.value}\`${constant.category ? `\n\n*Category:* ${constant.category}` : ''}`
      },
      insertText: constant.name,
      sortText: `1_${constant.category || 'other'}_${constant.name}`
    }));
  }

  private getKeywordCompletions(context: CompletionContext): CompletionItem[] {
    return this.keywords
      .filter(keyword => this.shouldIncludeKeyword(keyword, context))
      .map(keyword => ({
        label: keyword,
        kind: CompletionItemKind.Keyword,
        detail: `Keyword: ${keyword}`,
        insertText: keyword,
        sortText: `3_${keyword}`
      }));
  }

  private getParameterCompletions(context: CompletionContext): CompletionItem[] {
    if (!context.functionName || context.parameterIndex === undefined) {
      return [];
    }

    const func = this.functions.find(f => f.name === context.functionName);
    if (!func || context.parameterIndex >= func.parameters.length) {
      return [];
    }

    const param = func.parameters[context.parameterIndex];
    if (!param) return [];

    // Suggest constants that match the parameter type
    return this.constants
      .filter(constant => constant.type === param.type)
      .map(constant => ({
        label: constant.name,
        kind: CompletionItemKind.Value,
        detail: `${constant.type} = ${constant.value} (for ${param.name})`,
        documentation: `Suggested for parameter '${param.name}' of type ${param.type}`,
        insertText: constant.name,
        sortText: `0_param_${constant.name}`
      }));
  }

  private getMemberCompletions(context: CompletionContext): CompletionItem[] {
    const completions: CompletionItem[] = [];

    if (context.objectType === 'vector') {
      ['x', 'y', 'z'].forEach(component => {
        completions.push({
          label: component,
          kind: CompletionItemKind.Property,
          detail: `float ${component} (vector component)`,
          documentation: `Vector ${component} component`,
          insertText: component,
          sortText: `0_${component}`
        });
      });
    }

    return completions;
  }

  private shouldIncludeKeyword(keyword: string, context: CompletionContext): boolean {
    if (context.inFunctionCall) return false;
    if (context.afterDot) return false;
    return true;
  }
}
