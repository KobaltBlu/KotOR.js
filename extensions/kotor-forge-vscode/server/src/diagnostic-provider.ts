/**
 * Advanced NWScript Diagnostic Provider
 * Provides detailed error messages with suggestions and quick fixes
 */

import { Diagnostic, DiagnosticRelatedInformation } from 'vscode-languageserver/node';

import { GameVersionDetector } from './game-version-detector';
import {
  KOTOR_CONSTANTS,
  KOTOR_FUNCTIONS,
  NWScriptConstant,
  NWScriptFunction
} from './kotor-definitions';
import { trace, debug } from './logger';
import { SemanticError } from './semantic-analyzer';

export interface EnhancedDiagnostic extends Diagnostic {
  suggestions?: string[];
  quickFixes?: QuickFix[];
  relatedInformation?: DiagnosticRelatedInformation[];
}

export interface QuickFix {
  title: string;
  kind: string;
  edit: {
    range: { start: { line: number; character: number }, end: { line: number; character: number } };
    newText: string;
  };
}

export class DiagnosticProvider {
  private availableFunctions: Map<string, NWScriptFunction> = new Map();
  private availableConstants: Map<string, NWScriptConstant> = new Map();

  constructor(
    functions: NWScriptFunction[] = [],
    constants: NWScriptConstant[] = []
  ) {
    trace('DiagnosticProvider constructor() entered');
    KOTOR_FUNCTIONS.forEach(func => {
      this.availableFunctions.set(func.name, func);
    });
    KOTOR_CONSTANTS.forEach(constant => {
      this.availableConstants.set(constant.name, constant);
    });
    functions.forEach(func => {
      this.availableFunctions.set(func.name, func);
    });
    constants.forEach(constant => {
      this.availableConstants.set(constant.name, constant);
    });
    debug(`DiagnosticProvider constructed: ${this.availableFunctions.size} functions, ${this.availableConstants.size} constants`);
  }

  public enhanceDiagnostics(errors: SemanticError[]): EnhancedDiagnostic[] {
    trace(`enhanceDiagnostics() errors count=${errors.length}`);
    return errors.map(error => this.enhanceDiagnostic(error));
  }

  private enhanceDiagnostic(error: SemanticError): EnhancedDiagnostic {
    const enhanced: EnhancedDiagnostic = {
      severity: error.severity,
      range: {
        start: { line: error.range.start.line, character: error.range.start.column },
        end: { line: error.range.end.line, character: error.range.end.column }
      },
      message: error.message,
      source: 'Forge-KotOR.js',
      code: error.code,
      suggestions: [],
      quickFixes: []
    };

    // Add specific enhancements based on error code
    switch (error.code) {
      case 'unknown-function':
        this.enhanceUnknownFunctionError(enhanced, error);
        break;

      case 'unknown-identifier':
        this.enhanceUnknownIdentifierError(enhanced, error);
        break;

      case 'type-mismatch':
        this.enhanceTypeMismatchError(enhanced, error);
        break;

      case 'invalid-type':
        this.enhanceInvalidTypeError(enhanced, error);
        break;

      case 'insufficient-args':
        this.enhanceInsufficientArgsError(enhanced, error);
        break;

      case 'too-many-args':
        this.enhanceTooManyArgsError(enhanced, error);
        break;

      case 'division-by-zero':
        this.enhanceDivisionByZeroError(enhanced, error);
        break;

      case 'missing-return':
        this.enhanceMissingReturnError(enhanced, error);
        break;

      case 'no-entry-point':
        this.enhanceNoEntryPointError(enhanced, error);
        break;

      case 'missing-game-version':
        this.enhanceMissingGameVersionError(enhanced, error);
        break;
    }

    return enhanced;
  }

  private enhanceUnknownFunctionError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    const functionName = this.extractIdentifierFromMessage(error.message);
    if (!functionName) return;

    // Find similar function names
    const suggestions = this.findSimilarFunctionNames(functionName);

    diagnostic.suggestions = suggestions.length > 0 ?
      [`Did you mean: ${suggestions.slice(0, 3).join(', ')}?`] :
      ['Check if the function is defined or included from the correct library'];

    // Add quick fixes for common typos
    if (suggestions.length > 0) {
      diagnostic.quickFixes = suggestions.slice(0, 3).map(suggestion => ({
        title: `Change to '${suggestion}'`,
        kind: 'quickfix',
        edit: {
          range: diagnostic.range,
          newText: suggestion
        }
      }));
    }
  }

  private enhanceUnknownIdentifierError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    const identifier = this.extractIdentifierFromMessage(error.message);
    if (!identifier) return;

    // Find similar constant names
    const suggestions = this.findSimilarConstantNames(identifier);

    if (suggestions.length > 0) {
      diagnostic.suggestions = [`Did you mean: ${suggestions.slice(0, 3).join(', ')}?`];
      diagnostic.quickFixes = suggestions.slice(0, 3).map(suggestion => ({
        title: `Change to '${suggestion}'`,
        kind: 'quickfix',
        edit: {
          range: diagnostic.range,
          newText: suggestion
        }
      }));
    } else {
      diagnostic.suggestions = [
        'Ensure the variable is declared in the current scope',
        'Check if this should be a constant from an include file'
      ];
    }
  }

  private enhanceTypeMismatchError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    diagnostic.suggestions = [
      'Check the types of the operands',
      'Use explicit type conversion if needed (IntToFloat, FloatToInt, etc.)',
      'Verify the function signature if this is a function call'
    ];

    // Extract types from error message for more specific suggestions
    const typeMatch = error.message.match(/'([^']+)' (?:to|and) '([^']+)'/);
    if (typeMatch) {
      const [, sourceType, targetType] = typeMatch;

      if ((sourceType === 'int' && targetType === 'float') ||
          (sourceType === 'float' && targetType === 'int')) {
        diagnostic.suggestions = [
          `Use ${sourceType === 'int' ? 'IntToFloat' : 'FloatToInt'}() for explicit conversion`
        ];
      } else if (sourceType === 'int' && targetType === 'string') {
        diagnostic.suggestions = ['Use IntToString() to convert integer to string'];
      } else if (sourceType === 'float' && targetType === 'string') {
        diagnostic.suggestions = ['Use FloatToString() to convert float to string'];
      }
    }
  }

  private enhanceInvalidTypeError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    const validTypes = ['void', 'int', 'float', 'string', 'object', 'vector', 'location', 'event', 'effect', 'itemproperty', 'talent', 'action'];
    diagnostic.suggestions = [`Valid types are: ${validTypes.join(', ')}`];
  }

  private enhanceInsufficientArgsError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    const functionName = this.extractFunctionNameFromMessage(error.message);
    if (functionName) {
      const func = this.availableFunctions.get(functionName);
      if (func) {
        const requiredParams = func.parameters.filter(p => !p.defaultValue);
        diagnostic.suggestions = [
          `Function '${functionName}' requires ${requiredParams.length} arguments`,
          `Required parameters: ${requiredParams.map(p => `${p.type} ${p.name}`).join(', ')}`
        ];
      }
    }
  }

  private enhanceTooManyArgsError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    const functionName = this.extractFunctionNameFromMessage(error.message);
    if (functionName) {
      const func = this.availableFunctions.get(functionName);
      if (func) {
        diagnostic.suggestions = [
          `Function '${functionName}' accepts at most ${func.parameters.length} arguments`,
          `Parameters: ${func.parameters.map(p => `${p.type} ${p.name}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`).join(', ')}`
        ];
      }
    }
  }

  private enhanceDivisionByZeroError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    diagnostic.suggestions = [
      'Check the divisor value',
      'Add a condition to ensure the divisor is not zero',
      'Use a default value if the divisor could be zero'
    ];

    diagnostic.message = 'Division by zero detected. This will cause a runtime error.';
  }

  private enhanceMissingReturnError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    diagnostic.suggestions = [
      'Add a return statement at the end of the function',
      'Ensure all code paths return a value',
      'Check if-else statements have returns in both branches'
    ];
  }

  private enhanceNoEntryPointError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    diagnostic.suggestions = [
      'Add a main() function for executable scripts',
      'Add a StartingConditional() function for conditional scripts',
      'This may be an include file, which is normal'
    ];

    diagnostic.quickFixes = [
      {
        title: 'Add main() function',
        kind: 'quickfix',
        edit: {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          newText: 'void main()\n{\n    object oPC = GetFirstPC();\n    if (GetIsObjectValid(oPC))\n    {\n        // Entry point: add your logic here\n    }\n}\n\n'
        }
      },
      {
        title: 'Add StartingConditional() function',
        kind: 'quickfix',
        edit: {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          newText: 'int StartingConditional()\n{\n    // Return TRUE to allow; FALSE to block\n    return TRUE;\n}\n\n'
        }
      }
    ];
  }

  private enhanceMissingGameVersionError(diagnostic: EnhancedDiagnostic, error: SemanticError): void {
    diagnostic.suggestions = [
      'Add a target comment at the top of the file to specify the game version',
      'Use "// @target kotor1" for KOTOR 1 scripts',
      'Use "// @target kotor2" for KOTOR 2/TSL scripts'
    ];

    diagnostic.quickFixes = GameVersionDetector.generateVersionQuickFixes();
  }

  // Helper methods

  private extractIdentifierFromMessage(message: string): string | undefined {
    const match = message.match(/'([^']+)'/);
    return match ? match[1] : undefined;
  }

  private extractFunctionNameFromMessage(message: string): string | undefined {
    const match = message.match(/Function '([^']+)'/);
    return match ? match[1] : undefined;
  }

  private findSimilarFunctionNames(target: string): string[] {
    const functions = Array.from(this.availableFunctions.keys());
    return this.findSimilarNames(target, functions);
  }

  private findSimilarConstantNames(target: string): string[] {
    const constants = Array.from(this.availableConstants.keys());
    return this.findSimilarNames(target, constants);
  }

  private findSimilarNames(target: string, candidates: string[]): string[] {
    const targetLower = target.toLowerCase();

    // Calculate Levenshtein distance for similarity
    const similarities = candidates.map(candidate => ({
      name: candidate,
      distance: this.levenshteinDistance(targetLower, candidate.toLowerCase())
    }));

    // Sort by similarity and return top matches
    return similarities
      .filter(item => item.distance <= Math.max(2, target.length * 0.4)) // Allow up to 40% difference
      .sort((a, b) => a.distance - b.distance)
      .map(item => item.name)
      .slice(0, 5);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
      matrix[i]![0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,      // deletion
          matrix[i]![j - 1]! + 1,      // insertion
          matrix[i - 1]![j - 1]! + cost // substitution
        );
      }
    }

    return matrix[a.length]![b.length]!;
  }

  /**
   * Generate code action suggestions for common errors
   */
  public generateCodeActions(diagnostic: EnhancedDiagnostic): any[] {
    const actions: any[] = [];

    if (diagnostic.quickFixes) {
      diagnostic.quickFixes.forEach(fix => {
        actions.push({
          title: fix.title,
          kind: fix.kind,
          edit: {
            changes: {
              [diagnostic.range.start.line]: [fix.edit]
            }
          }
        });
      });
    }

    return actions;
  }

  /**
   * Add contextual information to diagnostics
   */
  public addContextualInfo(diagnostic: EnhancedDiagnostic, sourceText: string): void {
    trace(`addContextualInfo() code=${diagnostic.code}`);
    if (diagnostic.code === 'unknown-function') {
      const functionName = this.extractIdentifierFromMessage(diagnostic.message);
      if (functionName) {
        // Check if function exists in other contexts
        const allFunctions = Array.from(this.availableFunctions.values());
        const exactMatch = allFunctions.find(f => f.name === functionName);

        if (exactMatch && exactMatch.includeFile) {
          diagnostic.relatedInformation = [{
            location: {
              uri: `kotor-forge:/kotor/${exactMatch.includeFile}.nss`,
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 }
              }
            },
            message: `Function '${functionName}' is available in include file '${exactMatch.includeFile}'`
          }];

          diagnostic.suggestions = [
            `Add #include "${exactMatch.includeFile}" to use this function`
          ];
        }
      }
    }
  }
}
