import type { NWScriptExpression } from "./NWScriptExpression";
import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

/**
 * AST Node Types for NWScript
 */
export enum NWScriptASTNodeType {
  // Program structure
  PROGRAM = 'program',
  FUNCTION = 'function',
  BLOCK = 'block',
  
  // Control structures
  IF = 'if',
  IF_ELSE = 'if_else',
  WHILE = 'while',
  DO_WHILE = 'do_while',
  FOR = 'for',
  SWITCH = 'switch',
  SWITCH_CASE = 'switch_case',
  SWITCH_DEFAULT = 'switch_default',
  
  // Statements
  EXPRESSION_STATEMENT = 'expression_statement',
  ASSIGNMENT = 'assignment',
  RETURN = 'return',
  BREAK = 'break',
  CONTINUE = 'continue',
  
  // Declarations
  VARIABLE_DECLARATION = 'variable_declaration',
  GLOBAL_VARIABLE_DECLARATION = 'global_variable_declaration',
  
  // Empty/null
  EMPTY = 'empty'
}

/**
 * Base interface for all AST nodes
 */
export interface NWScriptASTNode {
  /**
   * Type of this AST node
   */
  type: NWScriptASTNodeType;
  
  /**
   * Source location information (optional)
   */
  location?: {
    startBlock?: NWScriptBasicBlock;
    endBlock?: NWScriptBasicBlock;
    startAddress?: number;
    endAddress?: number;
  };
  
  /**
   * Child nodes (for hierarchical structure)
   */
  children: NWScriptASTNode[];
  
  /**
   * Parent node (for tree traversal)
   */
  parent?: NWScriptASTNode;
}

/**
 * Root node representing the entire program
 */
export interface NWScriptProgramNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.PROGRAM;
  /**
   * Global variable declarations
   */
  globals: NWScriptGlobalVariableDeclarationNode[];
  /**
   * Function definitions
   */
  functions: NWScriptFunctionNode[];
  /**
   * Main function body (if script has entry point code)
   */
  mainBody?: NWScriptBlockNode;
}

/**
 * Function definition node
 */
export interface NWScriptFunctionNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.FUNCTION;
  /**
   * Function name
   */
  name: string;
  /**
   * Return type
   */
  returnType: NWScriptDataType;
  /**
   * Function parameters
   */
  parameters: NWScriptFunctionParameter[];
  /**
   * Local variable declarations
   */
  locals: NWScriptVariableDeclarationNode[];
  /**
   * Function body
   */
  body: NWScriptBlockNode;
  /**
   * Entry block for this function
   */
  entryBlock?: NWScriptBasicBlock;
}

/**
 * Function parameter
 */
export interface NWScriptFunctionParameter {
  name: string;
  type: NWScriptDataType;
}

/**
 * Block node (sequence of statements)
 */
export interface NWScriptBlockNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.BLOCK;
  /**
   * Statements in this block (in execution order)
   */
  statements: NWScriptASTNode[];
}

/**
 * If statement node
 */
export interface NWScriptIfNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.IF;
  /**
   * Condition expression
   */
  condition: NWScriptExpression;
  /**
   * Then branch (body)
   */
  thenBody: NWScriptBlockNode;
  /**
   * Else branch (optional)
   */
  elseBody?: NWScriptBlockNode;
  /**
   * Header block (contains condition)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * If-else statement node
 */
export interface NWScriptIfElseNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.IF_ELSE;
  /**
   * Condition expression
   */
  condition: NWScriptExpression;
  /**
   * Then branch (body)
   */
  thenBody: NWScriptBlockNode;
  /**
   * Else branch
   */
  elseBody: NWScriptBlockNode;
  /**
   * Header block (contains condition)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * While loop node
 */
export interface NWScriptWhileNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.WHILE;
  /**
   * Loop condition expression
   */
  condition: NWScriptExpression;
  /**
   * Loop body
   */
  body: NWScriptBlockNode;
  /**
   * Header block (contains condition)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * Do-while loop node
 */
export interface NWScriptDoWhileNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.DO_WHILE;
  /**
   * Loop body
   */
  body: NWScriptBlockNode;
  /**
   * Loop condition expression (evaluated after body)
   */
  condition: NWScriptExpression;
  /**
   * Header block (entry point)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * For loop node
 */
export interface NWScriptForNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.FOR;
  /**
   * Initialization statement (optional)
   */
  init?: NWScriptASTNode;
  /**
   * Loop condition expression (optional)
   */
  condition?: NWScriptExpression;
  /**
   * Increment statement (optional)
   */
  increment?: NWScriptASTNode;
  /**
   * Loop body
   */
  body: NWScriptBlockNode;
  /**
   * Header block (contains condition)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * Switch statement node
 */
export interface NWScriptSwitchNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.SWITCH;
  /**
   * Switch expression (value being switched on)
   */
  expression: NWScriptExpression;
  /**
   * Switch cases
   */
  cases: NWScriptSwitchCaseNode[];
  /**
   * Default case (optional)
   */
  defaultCase?: NWScriptSwitchDefaultNode;
  /**
   * Header block (contains switch expression)
   */
  headerBlock?: NWScriptBasicBlock;
}

/**
 * Switch case node
 */
export interface NWScriptSwitchCaseNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.SWITCH_CASE;
  /**
   * Case value expression
   */
  value: NWScriptExpression;
  /**
   * Case body
   */
  body: NWScriptBlockNode;
}

/**
 * Switch default case node
 */
export interface NWScriptSwitchDefaultNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.SWITCH_DEFAULT;
  /**
   * Default case body
   */
  body: NWScriptBlockNode;
}

/**
 * Expression statement node (function call, etc.)
 */
export interface NWScriptExpressionStatementNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.EXPRESSION_STATEMENT;
  /**
   * Expression being evaluated
   */
  expression: NWScriptExpression;
}

/**
 * Assignment statement node
 */
export interface NWScriptAssignmentNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.ASSIGNMENT;
  /**
   * Variable being assigned to
   */
  variable: string;
  /**
   * Whether variable is global
   */
  isGlobal: boolean;
  /**
   * Value being assigned
   */
  value: NWScriptExpression;
}

/**
 * Return statement node
 */
export interface NWScriptReturnNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.RETURN;
  /**
   * Return value expression (optional for void functions)
   */
  value?: NWScriptExpression;
}

/**
 * Break statement node
 */
export interface NWScriptBreakNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.BREAK;
}

/**
 * Continue statement node
 */
export interface NWScriptContinueNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.CONTINUE;
}

/**
 * Variable declaration node (local)
 */
export interface NWScriptVariableDeclarationNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.VARIABLE_DECLARATION;
  /**
   * Variable name
   */
  name: string;
  /**
   * Variable type
   */
  dataType: NWScriptDataType;
  /**
   * Initial value (optional)
   */
  initializer?: NWScriptExpression;
}

/**
 * Global variable declaration node
 */
export interface NWScriptGlobalVariableDeclarationNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.GLOBAL_VARIABLE_DECLARATION;
  /**
   * Variable name
   */
  name: string;
  /**
   * Variable type
   */
  dataType: NWScriptDataType;
  /**
   * Initial value (optional)
   */
  initializer?: NWScriptExpression;
}

/**
 * Empty node (placeholder, unreachable code, etc.)
 */
export interface NWScriptEmptyNode extends NWScriptASTNode {
  type: NWScriptASTNodeType.EMPTY;
}

/**
 * Union type for all AST nodes
 */
export type NWScriptASTNodeUnion =
  | NWScriptProgramNode
  | NWScriptFunctionNode
  | NWScriptBlockNode
  | NWScriptIfNode
  | NWScriptIfElseNode
  | NWScriptWhileNode
  | NWScriptDoWhileNode
  | NWScriptForNode
  | NWScriptSwitchNode
  | NWScriptSwitchCaseNode
  | NWScriptSwitchDefaultNode
  | NWScriptExpressionStatementNode
  | NWScriptAssignmentNode
  | NWScriptReturnNode
  | NWScriptBreakNode
  | NWScriptContinueNode
  | NWScriptVariableDeclarationNode
  | NWScriptGlobalVariableDeclarationNode
  | NWScriptEmptyNode;

/**
 * Helper functions for AST node creation and manipulation
 */
export class NWScriptAST {
  /**
   * Create a program node
   */
  static createProgram(
    globals: NWScriptGlobalVariableDeclarationNode[] = [],
    functions: NWScriptFunctionNode[] = [],
    mainBody?: NWScriptBlockNode
  ): NWScriptProgramNode {
    return {
      type: NWScriptASTNodeType.PROGRAM,
      children: [...globals, ...functions, ...(mainBody ? [mainBody] : [])],
      globals,
      functions,
      mainBody
    };
  }

  /**
   * Create a function node
   */
  static createFunction(
    name: string,
    returnType: NWScriptDataType,
    parameters: NWScriptFunctionParameter[],
    body: NWScriptBlockNode,
    locals: NWScriptVariableDeclarationNode[] = [],
    entryBlock?: NWScriptBasicBlock
  ): NWScriptFunctionNode {
    return {
      type: NWScriptASTNodeType.FUNCTION,
      children: [...locals, body],
      name,
      returnType,
      parameters,
      locals,
      body,
      entryBlock
    };
  }

  /**
   * Create a block node
   */
  static createBlock(statements: NWScriptASTNode[] = []): NWScriptBlockNode {
    return {
      type: NWScriptASTNodeType.BLOCK,
      children: statements,
      statements
    };
  }

  /**
   * Create an if node
   */
  static createIf(
    condition: NWScriptExpression,
    thenBody: NWScriptBlockNode,
    elseBody?: NWScriptBlockNode,
    headerBlock?: NWScriptBasicBlock
  ): NWScriptIfNode | NWScriptIfElseNode {
    const children = [thenBody, ...(elseBody ? [elseBody] : [])];
    if (elseBody) {
      return {
        type: NWScriptASTNodeType.IF_ELSE,
        children,
        condition,
        thenBody,
        elseBody,
        headerBlock
      };
    } else {
      return {
        type: NWScriptASTNodeType.IF,
        children: [thenBody],
        condition,
        thenBody,
        elseBody,
        headerBlock
      };
    }
  }

  /**
   * Create a while loop node
   */
  static createWhile(
    condition: NWScriptExpression,
    body: NWScriptBlockNode,
    headerBlock?: NWScriptBasicBlock
  ): NWScriptWhileNode {
    return {
      type: NWScriptASTNodeType.WHILE,
      children: [body],
      condition,
      body,
      headerBlock
    };
  }

  /**
   * Create a do-while loop node
   */
  static createDoWhile(
    body: NWScriptBlockNode,
    condition: NWScriptExpression,
    headerBlock?: NWScriptBasicBlock
  ): NWScriptDoWhileNode {
    return {
      type: NWScriptASTNodeType.DO_WHILE,
      children: [body],
      body,
      condition,
      headerBlock
    };
  }

  /**
   * Create a for loop node
   */
  static createFor(
    body: NWScriptBlockNode,
    init?: NWScriptASTNode,
    condition?: NWScriptExpression,
    increment?: NWScriptASTNode,
    headerBlock?: NWScriptBasicBlock
  ): NWScriptForNode {
    const children = [
      ...(init ? [init] : []),
      body,
      ...(increment ? [increment] : [])
    ];
    return {
      type: NWScriptASTNodeType.FOR,
      children,
      init,
      condition,
      increment,
      body,
      headerBlock
    };
  }

  /**
   * Create a switch node
   */
  static createSwitch(
    expression: NWScriptExpression,
    cases: NWScriptSwitchCaseNode[],
    defaultCase?: NWScriptSwitchDefaultNode,
    headerBlock?: NWScriptBasicBlock
  ): NWScriptSwitchNode {
    const children = [...cases, ...(defaultCase ? [defaultCase] : [])];
    return {
      type: NWScriptASTNodeType.SWITCH,
      children,
      expression,
      cases,
      defaultCase,
      headerBlock
    };
  }

  /**
   * Create a switch case node
   */
  static createSwitchCase(
    value: NWScriptExpression,
    body: NWScriptBlockNode
  ): NWScriptSwitchCaseNode {
    return {
      type: NWScriptASTNodeType.SWITCH_CASE,
      children: [body],
      value,
      body
    };
  }

  /**
   * Create a switch default case node
   */
  static createSwitchDefault(
    body: NWScriptBlockNode
  ): NWScriptSwitchDefaultNode {
    return {
      type: NWScriptASTNodeType.SWITCH_DEFAULT,
      children: [body],
      body
    };
  }

  /**
   * Create an expression statement node
   */
  static createExpressionStatement(
    expression: NWScriptExpression
  ): NWScriptExpressionStatementNode {
    return {
      type: NWScriptASTNodeType.EXPRESSION_STATEMENT,
      children: [],
      expression
    };
  }

  /**
   * Create an assignment node
   */
  static createAssignment(
    variable: string,
    value: NWScriptExpression,
    isGlobal: boolean = false
  ): NWScriptAssignmentNode {
    return {
      type: NWScriptASTNodeType.ASSIGNMENT,
      children: [],
      variable,
      isGlobal,
      value
    };
  }

  /**
   * Create a return node
   */
  static createReturn(value?: NWScriptExpression): NWScriptReturnNode {
    return {
      type: NWScriptASTNodeType.RETURN,
      children: [],
      value
    };
  }

  /**
   * Create a break node
   */
  static createBreak(): NWScriptBreakNode {
    return {
      type: NWScriptASTNodeType.BREAK,
      children: []
    };
  }

  /**
   * Create a continue node
   */
  static createContinue(): NWScriptContinueNode {
    return {
      type: NWScriptASTNodeType.CONTINUE,
      children: []
    };
  }

  /**
   * Create a variable declaration node
   */
  static createVariableDeclaration(
    name: string,
    dataType: NWScriptDataType,
    initializer?: NWScriptExpression
  ): NWScriptVariableDeclarationNode {
    return {
      type: NWScriptASTNodeType.VARIABLE_DECLARATION,
      children: [],
      name,
      dataType,
      initializer
    };
  }

  /**
   * Create a global variable declaration node
   */
  static createGlobalVariableDeclaration(
    name: string,
    dataType: NWScriptDataType,
    initializer?: NWScriptExpression
  ): NWScriptGlobalVariableDeclarationNode {
    return {
      type: NWScriptASTNodeType.GLOBAL_VARIABLE_DECLARATION,
      children: [],
      name,
      dataType,
      initializer
    };
  }

  /**
   * Create an empty node
   */
  static createEmpty(): NWScriptEmptyNode {
    return {
      type: NWScriptASTNodeType.EMPTY,
      children: []
    };
  }

  /**
   * Set parent relationships for a node and its children
   */
  static setParent(node: NWScriptASTNode, parent?: NWScriptASTNode): void {
    node.parent = parent;
    for (const child of node.children) {
      NWScriptAST.setParent(child, node);
    }
  }

  /**
   * Build parent relationships for entire tree
   */
  static buildParentRelationships(root: NWScriptASTNode): void {
    NWScriptAST.setParent(root);
  }

  /**
   * Find all nodes of a specific type in the tree
   */
  static findNodes<T extends NWScriptASTNode>(
    root: NWScriptASTNode,
    nodeType: NWScriptASTNodeType
  ): T[] {
    const results: T[] = [];
    const traverse = (node: NWScriptASTNode) => {
      if (node.type === nodeType) {
        results.push(node as T);
      }
      for (const child of node.children) {
        traverse(child);
      }
    };
    traverse(root);
    return results;
  }

  /**
   * Get depth of a node in the tree
   */
  static getDepth(node: NWScriptASTNode): number {
    let depth = 0;
    let current: NWScriptASTNode | undefined = node;
    while (current?.parent) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  /**
   * Check if a node is a descendant of another node
   */
  static isDescendant(node: NWScriptASTNode, ancestor: NWScriptASTNode): boolean {
    let current: NWScriptASTNode | undefined = node.parent;
    while (current) {
      if (current === ancestor) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Serialize an AST node to JSON, handling circular references
   * Removes parent references and converts object references to IDs
   */
  static toJSON(node: NWScriptASTNode): any {
    return this.serializeNode(node, new Set());
  }

  /**
   * Internal method to serialize a node, tracking visited nodes to prevent infinite recursion
   */
  private static serializeNode(node: NWScriptASTNode, visited: Set<NWScriptASTNode>): any {
    // Prevent infinite recursion (though parent refs are excluded, this is a safety measure)
    if (visited.has(node)) {
      return { type: node.type, _circular: true };
    }
    visited.add(node);

    const base: any = {
      type: node.type
    };

    // Serialize location (convert blocks to IDs)
    if (node.location) {
      base.location = {
        startBlockId: node.location.startBlock?.id,
        endBlockId: node.location.endBlock?.id,
        startAddress: node.location.startAddress,
        endAddress: node.location.endAddress
      };
    }

    // Serialize children (recursively, but don't include parent refs)
    // For BLOCK nodes, children and statements are the same, so we skip children
    // to avoid duplication. For other nodes, serialize children.
    if (node.type !== NWScriptASTNodeType.BLOCK && node.children && node.children.length > 0) {
      base.children = node.children.map(child => this.serializeNode(child, visited));
    }

    // Handle specific node types
    switch (node.type) {
      case NWScriptASTNodeType.PROGRAM: {
        const programNode = node as NWScriptProgramNode;
        base.globals = programNode.globals?.map(g => this.serializeNode(g, visited)) || [];
        base.functions = programNode.functions?.map(f => this.serializeNode(f, visited)) || [];
        if (programNode.mainBody) {
          base.mainBody = this.serializeNode(programNode.mainBody, visited);
        }
        // Don't serialize children for PROGRAM - they're the same as globals + functions + mainBody
        // This avoids duplication
        break;
      }
      case NWScriptASTNodeType.FUNCTION: {
        const funcNode = node as NWScriptFunctionNode;
        base.name = funcNode.name;
        base.returnType = funcNode.returnType;
        base.parameters = funcNode.parameters?.map(p => {
          const param: any = {
            name: p.name,
            type: p.type
          };
          // Include optional fields if they exist (from NWScriptFunctionAnalyzer)
          if ('offset' in p && p.offset !== undefined) {
            param.offset = p.offset;
          }
          if ('dataType' in p && p.dataType !== undefined) {
            param.dataType = p.dataType;
          }
          return param;
        }) || [];
        base.locals = funcNode.locals?.map(l => this.serializeNode(l, visited)) || [];
        base.body = funcNode.body ? this.serializeNode(funcNode.body, visited) : null;
        base.entryBlockId = funcNode.entryBlock?.id;
        break;
      }
      case NWScriptASTNodeType.BLOCK: {
        const blockNode = node as NWScriptBlockNode;
        // Only serialize statements, not children (they're the same array)
        // This avoids duplication in JSON output
        base.statements = blockNode.statements?.map(s => this.serializeNode(s, visited)) || [];
        // Don't serialize children for blocks - they're the same as statements
        break;
      }
      case NWScriptASTNodeType.IF:
      case NWScriptASTNodeType.IF_ELSE: {
        const ifNode = node as NWScriptIfNode | NWScriptIfElseNode;
        base.condition = this.serializeExpression(ifNode.condition);
        base.thenBody = this.serializeNode(ifNode.thenBody, visited);
        if (ifNode.elseBody) {
          base.elseBody = this.serializeNode(ifNode.elseBody, visited);
        }
        base.headerBlockId = ifNode.headerBlock?.id;
        break;
      }
      case NWScriptASTNodeType.WHILE: {
        const whileNode = node as NWScriptWhileNode;
        base.condition = this.serializeExpression(whileNode.condition);
        base.body = this.serializeNode(whileNode.body, visited);
        base.headerBlockId = whileNode.headerBlock?.id;
        break;
      }
      case NWScriptASTNodeType.DO_WHILE: {
        const doWhileNode = node as NWScriptDoWhileNode;
        base.body = this.serializeNode(doWhileNode.body, visited);
        base.condition = this.serializeExpression(doWhileNode.condition);
        base.headerBlockId = doWhileNode.headerBlock?.id;
        break;
      }
      case NWScriptASTNodeType.FOR: {
        const forNode = node as NWScriptForNode;
        if (forNode.init) {
          base.init = this.serializeNode(forNode.init, visited);
        }
        if (forNode.condition) {
          base.condition = this.serializeExpression(forNode.condition);
        }
        if (forNode.increment) {
          base.increment = this.serializeNode(forNode.increment, visited);
        }
        base.body = this.serializeNode(forNode.body, visited);
        base.headerBlockId = forNode.headerBlock?.id;
        break;
      }
      case NWScriptASTNodeType.SWITCH: {
        const switchNode = node as NWScriptSwitchNode;
        base.expression = this.serializeExpression(switchNode.expression);
        base.cases = switchNode.cases?.map(c => this.serializeNode(c, visited)) || [];
        if (switchNode.defaultCase) {
          base.defaultCase = this.serializeNode(switchNode.defaultCase, visited);
        }
        base.headerBlockId = switchNode.headerBlock?.id;
        break;
      }
      case NWScriptASTNodeType.SWITCH_CASE: {
        const caseNode = node as NWScriptSwitchCaseNode;
        base.value = this.serializeExpression(caseNode.value);
        base.body = this.serializeNode(caseNode.body, visited);
        break;
      }
      case NWScriptASTNodeType.SWITCH_DEFAULT: {
        const defaultNode = node as NWScriptSwitchDefaultNode;
        base.body = this.serializeNode(defaultNode.body, visited);
        break;
      }
      case NWScriptASTNodeType.EXPRESSION_STATEMENT: {
        const exprStmtNode = node as NWScriptExpressionStatementNode;
        base.expression = this.serializeExpression(exprStmtNode.expression);
        break;
      }
      case NWScriptASTNodeType.ASSIGNMENT: {
        const assignNode = node as NWScriptAssignmentNode;
        base.variable = assignNode.variable;
        base.isGlobal = assignNode.isGlobal;
        base.value = this.serializeExpression(assignNode.value);
        break;
      }
      case NWScriptASTNodeType.RETURN: {
        const returnNode = node as NWScriptReturnNode;
        if (returnNode.value) {
          base.value = this.serializeExpression(returnNode.value);
        }
        break;
      }
      case NWScriptASTNodeType.VARIABLE_DECLARATION:
      case NWScriptASTNodeType.GLOBAL_VARIABLE_DECLARATION: {
        const varNode = node as NWScriptVariableDeclarationNode | NWScriptGlobalVariableDeclarationNode;
        base.name = varNode.name;
        base.dataType = varNode.dataType;
        if (varNode.initializer) {
          base.initializer = this.serializeExpression(varNode.initializer);
        }
        break;
      }
      // BREAK, CONTINUE, EMPTY have no additional properties
    }

    visited.delete(node);
    return base;
  }

  /**
   * Serialize an expression to JSON, handling potential circular references
   */
  private static serializeExpression(expr: any): any {
    if (!expr) return null;
    
    // If it's already a plain object (from JSON), return as-is
    if (typeof expr !== 'object' || expr === null) {
      return expr;
    }

    // Handle NWScriptExpression objects
    const serialized: any = {
      type: expr.type,
      dataType: expr.dataType
    };

    // Add properties based on expression type
    switch (expr.type) {
      case 'constant':
        serialized.value = expr.value;
        break;
      case 'variable':
        serialized.variableName = expr.variableName;
        serialized.isGlobal = expr.isGlobal;
        break;
      case 'binary_op':
      case 'comparison':
      case 'logical':
        serialized.operator = expr.operator;
        if (expr.left) {
          serialized.left = this.serializeExpression(expr.left);
        }
        if (expr.right) {
          serialized.right = this.serializeExpression(expr.right);
        }
        break;
      case 'unary_op':
        serialized.operator = expr.operator;
        if (expr.left) {
          serialized.left = this.serializeExpression(expr.left);
        }
        break;
      case 'function_call':
        serialized.functionName = expr.functionName;
        serialized.arguments = expr.arguments?.map((arg: any) => this.serializeExpression(arg)) || [];
        break;
    }

    return serialized;
  }
}

