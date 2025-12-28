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
}

