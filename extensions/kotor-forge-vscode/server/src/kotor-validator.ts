/**
 * KOTOR-Specific NWScript Validator
 * Validates KOTOR-specific patterns, conventions, and best practices
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { trace, debug } from './logger';
import {
  ASTNode,
  ASTVisitor,
  CallExpression,
  FunctionDeclaration,
  Identifier,
  Literal,
  Program,
  VariableDeclaration,
  walkAST
} from './nwscript-ast';
import { SemanticError } from './semantic-analyzer';

export class KotorValidator implements ASTVisitor<void> {
  private errors: SemanticError[] = [];
  private gameVersion: 'kotor1' | 'kotor2' | 'both' = 'both';
  private sourceText?: string;

  constructor(gameVersion: 'kotor1' | 'kotor2' | 'both' = 'both') {
    this.gameVersion = gameVersion;
  }

  public validate(ast: Program, sourceText?: string): SemanticError[] {
    trace('KotorValidator.validate() entered');
    this.errors = [];
    this.sourceText = sourceText;

    try {
      this.visitProgram(ast);
      debug(`KotorValidator.validate() completed errors=${this.errors.length}`);
    } catch (error) {
      if (error instanceof Error) {
        this.addError({
          message: `KOTOR validation error: ${error.message}`,
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 }
          }
        });
      }
    }

    return this.errors;
  }

  private addError(error: SemanticError): void {
    this.errors.push(error);
  }

  public visitProgram(node: Program): void {
    trace('KotorValidator.visitProgram() entered');
    this.validateKotorIncludes(node);
    this.validateKotorEntryPoints(node);
    node.body.forEach(decl => {
      walkAST(decl, this);
    });
  }

  public visitFunctionDeclaration(node: FunctionDeclaration): void {
    // Validate KOTOR function naming conventions
    this.validateKotorFunctionNaming(node);

    // Check for common KOTOR function patterns
    this.validateKotorFunctionPatterns(node);

    if (!node.isPrototype) {
      walkAST(node.body, this);
    }
  }

  public visitVariableDeclaration(node: VariableDeclaration): void {
    // Validate KOTOR variable naming conventions
    this.validateKotorVariableNaming(node);
  }

  public visitCallExpression(node: CallExpression): void {
    if (node.callee instanceof Identifier) {
      this.validateKotorFunctionCall(node, node.callee.name);
    }

    node.arguments.forEach(arg => {
      walkAST(arg, this);
    });
  }

  // KOTOR-specific validation methods

  private validateKotorIncludes(program: Program): void {
    const includeNames = program.includes.map(inc => inc.filename);

    // Check for common KOTOR includes
    const commonIncludes = [
      'k_inc_generic',
      'k_inc_utility',
      'k_inc_debug',
      'k_inc_glob_vars'
    ];

    // Suggest common includes if certain patterns are detected
    program.body.forEach(decl => {
      if (decl instanceof FunctionDeclaration) {
        // Check for patterns that suggest missing includes
        const bodyText = this.getNodeText(decl.body);

        if (bodyText.includes('UT_') && !includeNames.includes('k_inc_utility')) {
          // Find the first UT_ usage to highlight specifically
          const utMatch = bodyText.match(/UT_\w+/);
          let utRange = decl.range; // fallback to function range
          if (utMatch && utMatch.index !== undefined) {
            // Calculate line and character of the UT_ usage
            const beforeMatch = bodyText.substring(0, utMatch.index);
            const lines = beforeMatch.split('\n');
            const line = decl.range.start.line + lines.length - 1;
            const character = lines[lines.length - 1]?.length || 0;
            utRange = {
              start: { line, column: character, offset: 0 },
              end: { line, column: character + utMatch[0].length, offset: 0 }
            };
          }

          this.addError({
            message: 'Using utility functions (UT_*) without including k_inc_utility',
            severity: DiagnosticSeverity.Information,
            range: utRange,
            code: 'missing-utility-include'
          });
        }

        if (bodyText.includes('GN_') && !includeNames.includes('k_inc_generic')) {
          // Find the first GN_ usage to highlight specifically
          const gnMatch = bodyText.match(/GN_\w+/);
          let gnRange = decl.range; // fallback to function range
          if (gnMatch && gnMatch.index !== undefined) {
            // Calculate line and character of the GN_ usage
            const beforeMatch = bodyText.substring(0, gnMatch.index);
            const lines = beforeMatch.split('\n');
            const line = decl.range.start.line + lines.length - 1;
            const character = lines[lines.length - 1]?.length || 0;
            gnRange = {
              start: { line, column: character, offset: 0 },
              end: { line, column: character + gnMatch[0].length, offset: 0 }
            };
          }

          this.addError({
            message: 'Using generic functions (GN_*) without including k_inc_generic',
            severity: DiagnosticSeverity.Information,
            range: gnRange,
            code: 'missing-generic-include'
          });
        }
      }
    });
  }

  private validateKotorEntryPoints(program: Program): void {
    const functions = program.body.filter(decl => decl instanceof FunctionDeclaration) as FunctionDeclaration[];

    functions.forEach(func => {
      if (func.name === 'main') {
        this.validateMainFunction(func);
      } else if (func.name === 'StartingConditional') {
        this.validateStartingConditionalFunction(func);
      }
    });
  }

  private validateMainFunction(func: FunctionDeclaration): void {
    // Main function should follow KOTOR conventions
    if (func.returnType.name !== 'void') {
      this.addError({
        message: 'KOTOR main function must return void',
        severity: DiagnosticSeverity.Error,
        range: func.returnType.range,
        code: 'kotor-main-return-type'
      });
    }

    if (func.parameters.length > 0) {
      this.addError({
        message: 'KOTOR main function should not have parameters',
        severity: DiagnosticSeverity.Warning,
        range: func.range,
        code: 'kotor-main-parameters'
      });
    }
  }

  private validateStartingConditionalFunction(func: FunctionDeclaration): void {
    // StartingConditional should return int (boolean)
    if (func.returnType.name !== 'int') {
      this.addError({
        message: 'KOTOR StartingConditional function must return int',
        severity: DiagnosticSeverity.Error,
        range: func.returnType.range,
        code: 'kotor-conditional-return-type'
      });
    }

    if (func.parameters.length > 0) {
      this.addError({
        message: 'KOTOR StartingConditional function should not have parameters',
        severity: DiagnosticSeverity.Warning,
        range: func.range,
        code: 'kotor-conditional-parameters'
      });
    }
  }

  private validateKotorFunctionNaming(func: FunctionDeclaration): void {
    const name = func.name;
    // Module-specific function prefixes
    if (name.startsWith('k_') && name.length < 5) {
      this.addError({
        message: `KOTOR function name '${name}' with 'k_' prefix should be more descriptive`,
        severity: DiagnosticSeverity.Information,
        range: func.range,
        code: 'kotor-function-name-length'
      });
    }

    if (name.length > 16) {
      this.addError({
        message: `Function name '${name}' exceeds KOTOR's recommended 16-character limit`,
        severity: DiagnosticSeverity.Information,
        range: func.range,
        code: 'kotor-function-name-length'
      });
    }

    if (name.startsWith('k_') && !name.includes('_', 2)) {
      this.addError({
        message: `KOTOR function '${name}' with 'k_' prefix should include module identifier (e.g., k_pdan_)`,
        severity: DiagnosticSeverity.Information,
        range: func.range,
        code: 'kotor-function-prefix-convention'
      });
    }

    const reservedPrefixes = ['SW_', 'NW_', 'X0_', 'X2_'];
    reservedPrefixes.forEach(prefix => {
      if (name.startsWith(prefix)) {
        this.addError({
          message: `Function name '${name}' uses reserved BioWare prefix '${prefix}'`,
          severity: DiagnosticSeverity.Warning,
          range: func.range,
          code: 'reserved-prefix'
        });
      }
    });
  }

  private validateKotorVariableNaming(variable: VariableDeclaration): void {
    const name = variable.name;

    if (variable.isConstant && !name.match(/^[A-Z_][A-Z0-9_]*$/)) {
      this.addError({
        message: `KOTOR constant '${name}' should use UPPER_CASE naming`,
        severity: DiagnosticSeverity.Information,
        range: variable.range,
        code: 'kotor-constant-naming'
      });
    }

    if (name.startsWith('g_') && variable.varType.name !== 'object') {
      this.addError({
        message: `Variable '${name}' with 'g_' prefix typically indicates a global object`,
        severity: DiagnosticSeverity.Information,
        range: variable.range,
        code: 'kotor-global-prefix-convention'
      });
    }

    const hungarianPrefixes = {
      'n': 'int',
      'f': 'float',
      's': 'string',
      'o': 'object',
      'v': 'vector',
      'l': 'location',
      'e': 'event',
      'ef': 'effect',
      't': 'talent'
    };

    Object.entries(hungarianPrefixes).forEach(([prefix, expectedType]) => {
      if (name.startsWith(prefix) && variable.varType.name !== expectedType) {
        this.addError({
          message: `Variable '${name}' uses Hungarian prefix '${prefix}' but is declared as '${variable.varType.name}', expected '${expectedType}'`,
          severity: DiagnosticSeverity.Information,
          range: variable.range,
          code: 'hungarian-notation-mismatch'
        });
      }
    });
  }

  private validateKotorFunctionPatterns(func: FunctionDeclaration): void {
    const name = func.name;

    if (name.startsWith('k_') && name.includes('_user_')) {
      if (!name.endsWith('01') && !name.match(/_\d{2}$/)) {
        this.addError({
          message: `KOTOR user event handler '${name}' should end with a two-digit number (e.g., _01)`,
          severity: DiagnosticSeverity.Information,
          range: func.range,
          code: 'kotor-event-handler-naming'
        });
      }
    }

    if (name.startsWith('k_') && (name.includes('_dialog') || name.includes('_dlg'))) {
      this.addError({
        message: `Dialog function '${name}' detected. Ensure it's properly linked in the dialog editor`,
        severity: DiagnosticSeverity.Information,
        range: func.range,
        code: 'kotor-dialog-function'
      });
    }

    if (name.includes('heartbeat') || name.includes('hb')) {
      this.addError({
        message: `Heartbeat function '${name}' detected. Be aware of performance implications`,
        severity: DiagnosticSeverity.Information,
        range: func.range,
        code: 'kotor-heartbeat-function'
      });
    }
  }

  private validateKotorFunctionCall(node: CallExpression, functionName: string): void {
    // Pattern-based validation for KOTOR function usage
    this.validateByFunctionPattern(node, functionName);

    // Check for deprecated functions
    this.checkDeprecatedFunctions(functionName, node.range);

    // Check for game-specific functions
    this.checkGameSpecificFunctions(functionName, node.range);
  }

  private validateByFunctionPattern(node: CallExpression, functionName: string): void {
    // Global variable functions
    if (functionName.match(/^(Get|Set|Clear)Global(Number|Boolean|String|Location)$/)) {
      this.validateGlobalPattern(node, functionName);
    }

    // Object tag functions
    if (functionName.match(/^.*ByTag$/) || functionName.includes('Object') && functionName.includes('Tag')) {
      this.validateTagPattern(node, functionName);
    }

    // Script execution functions
    if (functionName.match(/^(Execute|Run|Start)Script$/)) {
      this.validateScriptPattern(node);
    }

    // Template/ResRef functions
    if (functionName.includes('Template') || functionName.includes('ResRef')) {
      this.validateTemplatePattern(node, functionName);
    }

    // Party/NPC management functions
    if (functionName.match(/^.*NPC.*$/) && functionName.match(/^(Add|Remove|Get)/)) {
      this.validatePartyPattern(node);
    }

    // Functions requiring object parameters
    if (functionName.match(/^GetIs[A-Z]/) && node.arguments.length === 0) {
      this.addError({
        message: `${functionName}() requires an object parameter. Did you mean ${functionName}(OBJECT_SELF)?`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'missing-object-parameter'
      });
    }
  }

  private validateGlobalPattern(node: CallExpression, functionName: string): void {
    if (node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (firstArg instanceof Literal && typeof firstArg.value === 'string') {
        const globalName = firstArg.value;

        // Check KOTOR global naming conventions
        if (!globalName.match(/^[A-Z_][A-Z0-9_]*$/)) {
          this.addError({
            message: `Global variable '${globalName}' should use UPPER_CASE naming convention`,
            severity: DiagnosticSeverity.Information,
            range: firstArg.range,
            code: 'kotor-global-naming'
          });
        }

        // Check for common KOTOR global prefixes
        const kotorPrefixes = ['K_', 'DAN_', 'TAR_', 'KOR_', 'MAN_', 'STA_', 'UNK_', 'LEV_'];
        const hasKotorPrefix = kotorPrefixes.some(prefix => globalName.startsWith(prefix));

        if (!hasKotorPrefix && globalName.length > 3) {
          this.addError({
            message: `Global variable '${globalName}' may benefit from a module prefix (${kotorPrefixes.join(', ')})`,
            severity: DiagnosticSeverity.Hint,
            range: firstArg.range,
            code: 'kotor-global-prefix-suggestion'
          });
        }
      }
    }
  }

  private validateTagPattern(node: CallExpression, functionName: string): void {
    const tagArgIndex = functionName.includes('ByTag') ? 0 :
                        functionName.startsWith('Create') ? 2 : 0;

    if (node.arguments.length > tagArgIndex) {
      const tagArg = node.arguments[tagArgIndex];
      if (tagArg instanceof Literal && typeof tagArg.value === 'string') {
        const tag = tagArg.value;

        // KOTOR tags should be 16 characters or less
        if (tag.length > 16) {
          this.addError({
            message: `Object tag '${tag}' exceeds KOTOR's 16-character limit`,
            severity: DiagnosticSeverity.Error,
            range: tagArg.range,
            code: 'kotor-tag-too-long'
          });
        }

        // Check for valid tag characters
        if (!tag.match(/^[a-zA-Z0-9_]+$/)) {
          this.addError({
            message: `Object tag '${tag}' contains invalid characters. Use only letters, numbers, and underscores`,
            severity: DiagnosticSeverity.Warning,
            range: tagArg.range,
            code: 'kotor-invalid-tag-chars'
          });
        }
      }
    }
  }

  private validateScriptPattern(node: CallExpression): void {
    if (node.arguments.length > 0) {
      const scriptArg = node.arguments[0];
      if (scriptArg instanceof Literal && typeof scriptArg.value === 'string') {
        const scriptName = scriptArg.value;

        // KOTOR script names should be 16 characters or less
        if (scriptName.length > 16) {
          this.addError({
            message: `Script name '${scriptName}' exceeds KOTOR's 16-character limit`,
            severity: DiagnosticSeverity.Error,
            range: scriptArg.range,
            code: 'kotor-script-name-too-long'
          });
        }

        // Check for common KOTOR script naming patterns
        if (!scriptName.match(/^[a-z0-9_]+$/)) {
          this.addError({
            message: `Script name '${scriptName}' should use lowercase with underscores`,
            severity: DiagnosticSeverity.Information,
            range: scriptArg.range,
            code: 'kotor-script-naming-convention'
          });
        }
      }
    }
  }

  private validateTemplatePattern(node: CallExpression, functionName: string): void {
    const templateArgIndex = functionName.startsWith('Create') ? 1 : 0;

    if (node.arguments.length > templateArgIndex) {
      const templateArg = node.arguments[templateArgIndex];
      if (templateArg instanceof Literal && typeof templateArg.value === 'string') {
        const template = templateArg.value;

        if (template.length > 16) {
          this.addError({
            message: `Template ResRef '${template}' exceeds KOTOR's 16-character limit`,
            severity: DiagnosticSeverity.Error,
            range: templateArg.range,
            code: 'kotor-template-too-long'
          });
        }
      }
    }
  }

  private validatePartyPattern(node: CallExpression): void {
    node.arguments.forEach(arg => {
      if (arg instanceof Identifier && arg.name.match(/^NPC_[A-Z_]+$/)) {
        // NPC constant pattern detected - could validate against known constants
      }
    });
  }

  private checkDeprecatedFunctions(functionName: string, range: any): void {
    // Functions that were deprecated or changed between KOTOR versions
    const deprecatedFunctions = new Map([
      ['GetLocalInt', 'Use GetLocalNumber instead'],
      ['SetLocalInt', 'Use SetLocalNumber instead'],
      ['GetGlobalInt', 'Use GetGlobalNumber instead'],
      ['SetGlobalInt', 'Use SetGlobalNumber instead']
    ]);

    const deprecationMessage = deprecatedFunctions.get(functionName);
    if (deprecationMessage) {
      this.addError({
        message: `Function '${functionName}' is deprecated. ${deprecationMessage}`,
        severity: DiagnosticSeverity.Warning,
        range: range,
        code: 'deprecated-function'
      });
    }
  }

  private checkGameSpecificFunctions(functionName: string, range: any): void {
    // Functions that are specific to KOTOR 1 or KOTOR 2
    const kotor1OnlyFunctions = [
      'GetModuleItemAcquiredStackSize',
      'GetModuleItemAcquired'
    ];

    const kotor2OnlyFunctions = [
      'GetInfluence',
      'SetInfluence',
      'GetWorkbenchUpgradeType'
    ];

    if (this.gameVersion === 'kotor2' && kotor1OnlyFunctions.includes(functionName)) {
      this.addError({
        message: `Function '${functionName}' is only available in KOTOR 1`,
        severity: DiagnosticSeverity.Warning,
        range: range,
        code: 'kotor1-only-function'
      });
    }

    if (this.gameVersion === 'kotor1' && kotor2OnlyFunctions.includes(functionName)) {
      this.addError({
        message: `Function '${functionName}' is only available in KOTOR 2`,
        severity: DiagnosticSeverity.Warning,
        range: range,
        code: 'kotor2-only-function'
      });
    }
  }


  private getNodeText(node: ASTNode): string {
    if (!this.sourceText) {
      return '';
    }
    const start = node.range.start.offset ?? 0;
    const end = node.range.end.offset ?? start;
    if (start >= 0 && end >= start && end <= this.sourceText.length) {
      return this.sourceText.slice(start, end);
    }
    return '';
  }
}
