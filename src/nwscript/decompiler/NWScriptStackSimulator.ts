import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptExpression } from "./NWScriptExpression";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import type { NWScriptFunctionParameter } from "./NWScriptFunctionAnalyzer";
import {
  OP_CONST, OP_ACTION, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII,
  OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ,
  OP_LOGANDII, OP_LOGORII, OP_BOOLANDII, OP_INCORII, OP_EXCORII,
  OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_NEG, OP_COMPI, OP_NOTI,
  OP_CPTOPBP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPDOWNBP,
  OP_MOVSP, OP_DESTRUCT, OP_RSADD,
  OP_DECISP, OP_INCISP, OP_DECIBP, OP_INCIBP
} from '../NWScriptOPCodes';

/**
 * Represents an item on the stack
 */
interface StackItem {
  expression: NWScriptExpression;
  address: number; // Instruction address that created this item
}

/**
 * Simulates the NWScript stack during decompilation.
 * Tracks stack pointer (SP) and stack contents accurately.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptStackSimulator.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptStackSimulator {
  /**
   * The stack (array of stack items)
   * Index 0 is the bottom of the stack, higher indices are closer to the top
   */
  private stack: StackItem[] = [];

  /**
   * Current stack pointer (SP) - points to the top of the stack
   * In NWScript, SP points to the next available slot
   */
  private stackPointer: number = 0;

  /**
   * Current base pointer (BP) - for global variable access
   */
  private basePointer: number = 0;

  /**
   * Function parameters (for mapping CPTOPBP offsets to parameter names)
   */
  private functionParameters: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Global variables (for mapping CPTOPBP positive offsets to global variable names)
   */
  private globalVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Local variables (for mapping CPTOPSP offsets to local variable names)
   * This is a static mapping based on heuristics - kept for backward compatibility
   */
  private localVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Stack position to variable index mapping (for dynamic stack-aware variable resolution)
   * Key: stack position (absolute), Value: variable index
   * This is set by the converter and used for accurate CPTOPSP resolution
   */
  private variableStackPositions: Map<number, number> = new Map();
  
  /**
   * Local variable initializations (for looking up variable info by index)
   * Set by the converter to provide variable names and types
   */
  private localVariableInits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }> = [];

  /**
   * Track stack state at each instruction address (for debugging/analysis)
   * OPTIMIZATION: Only save snapshots when explicitly requested (e.g., for debugging)
   */
  private stackSnapshots: Map<number, StackItem[]> = new Map();
  private enableSnapshots: boolean = false; // Disabled by default for performance

  /**
   * Enable or disable stack snapshots (for debugging)
   */
  setSnapshotEnabled(enabled: boolean): void {
    this.enableSnapshots = enabled;
    if (!enabled) {
      this.stackSnapshots.clear();
    }
  }

  /**
   * Process an instruction and update the stack state
   */
  processInstruction(instruction: NWScriptInstruction): NWScriptExpression | null {
    // OPTIMIZATION: Only save snapshot if snapshots are enabled (for debugging)
    if (this.enableSnapshots) {
      this.saveSnapshot(instruction.address);
    }

    switch (instruction.code) {
      case OP_CONST:
        return this.handleConst(instruction);
      
      case OP_ADD:
      case OP_SUB:
      case OP_MUL:
      case OP_DIV:
      case OP_MODII:
        return this.handleBinaryOp(instruction);
      
      case OP_EQUAL:
      case OP_NEQUAL:
      case OP_GT:
      case OP_GEQ:
      case OP_LT:
      case OP_LEQ:
        return this.handleComparison(instruction);
      
      case OP_LOGANDII:
      case OP_LOGORII:
      case OP_BOOLANDII:
        return this.handleLogical(instruction);
      
      case OP_INCORII:
      case OP_EXCORII:
        return this.handleBitwise(instruction);
      
      case OP_SHLEFTII:
      case OP_SHRIGHTII:
      case OP_USHRIGHTII:
        return this.handleShiftOp(instruction);
      
      case OP_NEG:
      case OP_COMPI:
      case OP_NOTI:
        return this.handleUnaryOp(instruction);
      
      case OP_ACTION:
        return this.handleAction(instruction);
      
      case OP_CPTOPBP:
      case OP_CPTOPSP:
        return this.handleVariableRead(instruction);
      
      case OP_CPDOWNSP:
        return this.handleLocalWrite(instruction);
      
      case OP_CPDOWNBP:
        return this.handleGlobalWrite(instruction);
      
      case OP_MOVSP:
        this.handleMovsp(instruction);
        return null;
      
      case OP_DESTRUCT:
        this.handleDestruct(instruction);
        return null;
      
      case OP_RSADD:
        this.handleRsadd(instruction);
        return null;
      
      case OP_DECISP:
      case OP_INCISP:
        this.handleLocalIncrement(instruction);
        return null;
      
      case OP_DECIBP:
      case OP_INCIBP:
        this.handleGlobalIncrement(instruction);
        return null;
      
      default:
        // Other instructions don't affect the stack
        return null;
    }
  }

  /**
   * Handle CONST instruction (push constant onto stack)
   */
  private handleConst(instruction: NWScriptInstruction): NWScriptExpression {
    let value: any;
    let dataType: NWScriptDataType;

    switch (instruction.type) {
      case 3: // INTEGER
        value = instruction.integer;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        value = instruction.float;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        value = instruction.string;
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        value = instruction.object;
        dataType = NWScriptDataType.OBJECT;
        break;
      default:
        value = 0;
        dataType = NWScriptDataType.INTEGER;
    }

    const expr = NWScriptExpression.constant(value, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle binary arithmetic operations
   */
  private handleBinaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      // Not enough operands - create placeholder
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getBinaryOperator(instruction.code);
      const dataType = this.getResultType(instruction.type);
      const expr = NWScriptExpression.binaryOp(operator, left, right, dataType);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getBinaryOperator(instruction.code);
    const dataType = this.getResultType(instruction.type);
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle comparison operations
   */
  private handleComparison(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getComparisonOperator(instruction.code);
      const expr = NWScriptExpression.comparison(operator, left, right);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getComparisonOperator(instruction.code);
    
    const expr = NWScriptExpression.comparison(operator, left.expression, right.expression);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle logical operations
   */
  private handleLogical(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getLogicalOperator(instruction.code);
      const expr = NWScriptExpression.logical(operator, left, right);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getLogicalOperator(instruction.code);
    
    const expr = NWScriptExpression.logical(operator, left.expression, right.expression);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle bitwise operations
   */
  private handleBitwise(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = instruction.code === OP_INCORII ? '|' : '^';
      const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = instruction.code === OP_INCORII ? '|' : '^';
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle shift operations
   */
  private handleShiftOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      let operator: string;
      switch (instruction.code) {
        case OP_SHLEFTII: operator = '<<'; break;
        case OP_SHRIGHTII: operator = '>>'; break;
        case OP_USHRIGHTII: operator = '>>>'; break;
        default: operator = '?';
      }
      
      const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    
    let operator: string;
    switch (instruction.code) {
      case OP_SHLEFTII: operator = '<<'; break;
      case OP_SHRIGHTII: operator = '>>'; break;
      case OP_USHRIGHTII: operator = '>>>'; break;
      default: operator = '?';
    }
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle unary operations
   */
  private handleUnaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 1) {
      const operand = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const operator = this.getUnaryOperator(instruction.code);
      const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
      const expr = NWScriptExpression.unaryOp(operator, operand, dataType);
      this.push(expr, instruction.address);
      return expr;
    }

    const item = this.pop()!;
    const operator = this.getUnaryOperator(instruction.code);
    const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
    
    const expr = NWScriptExpression.unaryOp(operator, item.expression, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle ACTION (function call)
   */
  private handleAction(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (!instruction.actionDefinition) {
      return null;
    }

    const actionDef = instruction.actionDefinition;
    const argCount = instruction.argCount || 0;
    const args: NWScriptExpression[] = [];

    // Pop arguments from stack
    // In NWScript, arguments appear to be pushed in forward order (first arg first)
    // So when we pop them, we get them in reverse order (last arg first)
    // We use push to collect them, then reverse to get correct order
    for (let i = 0; i < argCount && this.stack.length > 0; i++) {
      const item = this.pop();
      if (item) {
        args.unshift(item.expression); // unshift to maintain correct order
      }
    }
    
    // Reverse to get correct argument order (first arg first)
    args.reverse();

    const functionName = actionDef.name || `Action_${instruction.action}`;
    const returnType = actionDef.type || NWScriptDataType.VOID;
    
    const expr = NWScriptExpression.functionCall(functionName, args, returnType);
    
    // Push return value if not void
    if (returnType !== NWScriptDataType.VOID) {
      this.push(expr, instruction.address);
    }
    
    return expr;
  }

  /**
   * Handle variable read (CPTOPBP/CPTOPSP)
   */
  private handleVariableRead(instruction: NWScriptInstruction): NWScriptExpression {
    const isGlobal = instruction.code === OP_CPTOPBP;
    let varName: string;
    let dataType: NWScriptDataType;
    
    if (isGlobal && instruction.offset !== undefined) {
      // Check if this is a function parameter (negative offset)
      const offset = instruction.offset;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
      
      if (offsetSigned < 0 && this.functionParameters.has(offsetSigned)) {
        // This is a function parameter (negative offset relative to BP)
        const param = this.functionParameters.get(offsetSigned)!;
        varName = param.name;
        dataType = param.dataType;
      } else if (offsetSigned < 0 && this.globalVariables.has(offsetSigned)) {
        // This is a global variable (negative offset relative to BP)
        // ALL stack offsets are negative - we're always looking down from the top
        const globalVar = this.globalVariables.get(offsetSigned)!;
        varName = globalVar.name;
        dataType = globalVar.dataType;
      } else {
        // Unknown - generate a generic name
        varName = this.generateVariableName(true, offset);
        dataType = NWScriptDataType.INTEGER; // Default, could be improved
      }
    } else {
      // Local variable (CPTOPSP)
      // CRITICAL: CPTOPSP reads from stack[SP + offset] where SP is the CURRENT stack pointer
      // We should resolve this dynamically using the actual stack state, not static offsets
      const offset = instruction.offset || 0;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
      
      // Calculate the actual stack position this instruction reads from
      const sourceStackPos = this.stackPointer + offsetSigned;
      
      // First, try to resolve using the dynamic stack position map (stack-aware)
      const varIndex = this.variableStackPositions.get(sourceStackPos);
      if (varIndex !== undefined && this.localVariableInits[varIndex]) {
        // Found variable using stack-aware resolution
        const init = this.localVariableInits[varIndex];
        varName = `localVar_${varIndex}`;
        dataType = init.dataType;
      } else {
        // Stack-aware fallback: Check all variable positions with tolerance
        // The stack may have grown between RSADD and CPTOPSP, so check all recorded positions
        let foundVar = false;
        for (const [varPos, idx] of this.variableStackPositions.entries()) {
          const distance = Math.abs(sourceStackPos - varPos);
          // Allow tolerance (±8 bytes) since the stack may have grown
          if (distance <= 8 && this.localVariableInits[idx]) {
            const init = this.localVariableInits[idx];
            varName = `localVar_${idx}`;
            dataType = init.dataType;
            foundVar = true;
            break;
          }
        }
        
        if (!foundVar) {
          // Last resort: Fallback to static offset-based mapping (for backward compatibility)
          // This should rarely be needed if stack-aware tracking is working correctly
          const offsetUnsigned = offset < 0 ? offset + 0x100000000 : offset;
          if (this.localVariables.has(offsetUnsigned)) {
            // Use mapped local variable name from static mapping
            const localVar = this.localVariables.get(offsetUnsigned)!;
            varName = localVar.name;
            dataType = localVar.dataType;
          } else {
            // Generate a generic name as absolute last resort
            varName = this.generateVariableName(false, offset);
            dataType = NWScriptDataType.INTEGER; // Default, could be improved
          }
        }
      }
    }
    
    const expr = NWScriptExpression.variable(varName, dataType, isGlobal);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle local variable write (CPDOWNSP)
   */
  private handleLocalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (this.stack.length === 0) {
      return null;
    }

    // CPDOWNSP copies from top of stack to a location down the stack
    // The value remains on the stack
    const topItem = this.peek();
    if (topItem) {
      // The value is written to stack[SP + offset]
      // For now, we just keep the value on the stack
      // The actual write is tracked by NWScriptVariableTracker
      return topItem.expression;
    }
    return null;
  }

  /**
   * Handle global variable write (CPDOWNBP)
   */
  private handleGlobalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (this.stack.length === 0) {
      return null;
    }

    // CPDOWNBP copies from top of stack to a global variable
    // The value remains on the stack
    const topItem = this.peek();
    if (topItem) {
      // The actual write is tracked by NWScriptVariableTracker
      return topItem.expression;
    }
    return null;
  }

  /**
   * Handle MOVSP (move stack pointer)
   */
  private handleMovsp(instruction: NWScriptInstruction): void {
    const offset = instruction.offset || 0;
    
    if (offset > 0) {
      // Positive offset: remove items from stack (cleanup)
      const count = Math.floor(offset / 4); // Each item is 4 bytes
      for (let i = 0; i < count && this.stack.length > 0; i++) {
        this.pop();
      }
    } else if (offset < 0) {
      // Negative offset: reserve space (add empty slots)
      // This is typically for variable declarations
      const count = Math.floor(-offset / 4);
      // We don't add actual items, just track the space
      // The stack pointer effectively moves, but we track it via stackPointer
    }
    
    // Update stack pointer
    this.stackPointer += offset;
  }

  /**
   * Handle DESTRUCT (destructure operation)
   * 
   * DESTRUCT removes sizeToDestroy bytes from the top of the stack,
   * but saves sizeOfElementToSave bytes starting at offsetToSaveElement
   * from the start of that region. The saved element(s) remain on the stack.
   * 
   * SP is decremented by sizeToDestroy
   */
  private handleDestruct(instruction: NWScriptInstruction): void {
    const sizeToDestroy = instruction.sizeToDestroy || 0;
    const offsetToSaveElement = instruction.offsetToSaveElement || 0;
    const sizeOfElementToSave = instruction.sizeOfElementToSave || 0;
    
    // Convert bytes to number of items (each item is 4 bytes)
    const totalItemsToRemove = Math.floor(sizeToDestroy / 4);
    const offsetItems = Math.floor(offsetToSaveElement / 4);
    const itemsToSave = Math.floor(sizeOfElementToSave / 4);
    
    if (totalItemsToRemove === 0 || this.stack.length === 0) {
      console.warn('DESTRUCT', sizeToDestroy, offsetToSaveElement, sizeOfElementToSave, this.stack.length);
      // Nothing to remove, but still update stack pointer
      return;
    }
    
    const saveStartFromTop = offsetItems;
    const saveEndFromTop = saveStartFromTop + itemsToSave;
    
    const savedItems: StackItem[] = [];
    if (itemsToSave > 0 && this.stack.length >= saveEndFromTop) {
      const saveStartIndex = this.stack.length - saveEndFromTop;
      const saveEndIndex = this.stack.length - saveStartFromTop;
      
      // This preserves the relative order when pushed back
      for (let i = saveStartIndex; i < saveEndIndex; i++) {
        savedItems.push(this.stack[i]);
      }
    }
    
    // Remove the entire region from the top (pop totalItemsToRemove items)
    // This decreases stackPointer by sizeToDestroy
    for (let i = 0; i < totalItemsToRemove && this.stack.length > 0; i++) {
      this.pop();
    }
    
    // Push the saved items back onto the stack
    // This increases stackPointer by sizeOfElementToSave
    for (const item of savedItems) {
      this.push(item.expression, item.address);
    }

    this.stackPointer -= sizeToDestroy;
  }

  /**
   * Handle RSADD (reserve space on stack)
   */
  private handleRsadd(instruction: NWScriptInstruction): void {
    // RSADD actually pushes a default value onto the stack (0, 0.0, '', etc.)
    // This matches the runtime behavior where RSADD pushes a value
    // The variable will live at this stack position
    
    // Determine the default value based on instruction type
    let defaultValue: any;
    let dataType: NWScriptDataType;
    
    switch (instruction.type) {
      case 3: // INTEGER
        defaultValue = 0;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        defaultValue = 0.0;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        defaultValue = '';
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        defaultValue = undefined;
        dataType = NWScriptDataType.OBJECT;
        break;
      case 16: // EFFECT
        defaultValue = undefined;
        dataType = NWScriptDataType.EFFECT;
        break;
      case 17: // EVENT
        defaultValue = undefined;
        dataType = NWScriptDataType.EVENT;
        break;
      case 18: // LOCATION
        defaultValue = undefined;
        dataType = NWScriptDataType.LOCATION;
        break;
      case 19: // TALENT
        defaultValue = undefined;
        dataType = NWScriptDataType.TALENT;
        break;
      default:
        // Default to integer
        defaultValue = 0;
        dataType = NWScriptDataType.INTEGER;
        break;
    }
    
    // Push the default value onto the stack
    // This creates a stack item that represents the variable's initial value
    const expr = NWScriptExpression.constant(defaultValue, dataType);
    this.push(expr, instruction.address);
  }

  /**
   * Handle local variable increment/decrement
   */
  private handleLocalIncrement(instruction: NWScriptInstruction): void {
    // DECISP/INCISP modify a local variable
    // They don't directly affect the stack, but the variable tracker handles this
  }

  /**
   * Handle global variable increment/decrement
   */
  private handleGlobalIncrement(instruction: NWScriptInstruction): void {
    // DECIBP/INCIBP modify a global variable
    // They don't directly affect the stack, but the variable tracker handles this
  }

  /**
   * Push an expression onto the stack
   */
  push(expression: NWScriptExpression, address: number): void {
    this.stack.push({ expression, address });
    this.stackPointer += 4; // Each item is 4 bytes
  }

  /**
   * Pop an expression from the stack
   */
  pop(): StackItem | null {
    if (this.stack.length === 0) {
      return null;
    }
    const item = this.stack.pop()!;
    this.stackPointer -= 4;
    return item;
  }

  /**
   * Peek at the top of the stack without popping
   */
  peek(): StackItem | null {
    if (this.stack.length === 0) {
      return null;
    }
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get the current stack size (number of items)
   */
  getStackSize(): number {
    return this.stack.length;
  }

  /**
   * Get the current stack pointer value
   */
  getStackPointer(): number {
    return this.stackPointer;
  }
  
  /**
   * Get global variables map (for passing to other components)
   */
  getGlobalVariables(): Map<number, { name: string, dataType: NWScriptDataType }> {
    return this.globalVariables;
  }
  
  /**
   * Get local variables map (for passing to other components)
   */
  getLocalVariables(): Map<number, { name: string, dataType: NWScriptDataType }> {
    return this.localVariables;
  }

  /**
   * Get the current base pointer value
   */
  getBasePointer(): number {
    return this.basePointer;
  }

  /**
   * Set the base pointer
   */
  setBasePointer(bp: number): void {
    this.basePointer = bp;
  }

  /**
   * Clear the stack
   */
  clear(): void {
    this.stack = [];
    this.stackPointer = 0;
    this.basePointer = 0;
    this.stackSnapshots.clear();
    this.functionParameters.clear();
  }

  /**
   * Set function parameters for parameter name mapping
   */
  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.functionParameters.clear();
    for (const param of parameters) {
      this.functionParameters.set(param.offset, { name: param.name, dataType: param.dataType });
    }
  }
  
  /**
   * Set global variables for variable name mapping
   * Maps BP offsets (positive) to global variable names
   */
  setGlobalVariables(globalVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.globalVariables = globalVars;
  }
  
  /**
   * Set local variables for variable name mapping
   * Maps SP offsets to local variable names
   */
  setLocalVariables(localVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.localVariables = localVars;
  }
  
  /**
   * Set the stack position to variable index mapping for dynamic variable resolution
   * This allows CPTOPSP to resolve variables based on actual stack state, not static offsets
   */
  setVariableStackPositions(positions: Map<number, number>): void {
    this.variableStackPositions = positions;
  }
  
  /**
   * Set local variable initializations for variable info lookup
   */
  setLocalVariableInits(inits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }>): void {
    this.localVariableInits = inits;
  }

  /**
   * Save a snapshot of the stack state
   */
  private saveSnapshot(address: number): void {
    // Deep copy the stack
    this.stackSnapshots.set(address, this.stack.map(item => ({ ...item })));
  }

  /**
   * Get a stack snapshot at a specific address
   */
  getSnapshot(address: number): StackItem[] | null {
    return this.stackSnapshots.get(address) || null;
  }

  /**
   * Get binary operator string
   */
  private getBinaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_ADD: return '+';
      case OP_SUB: return '-';
      case OP_MUL: return '*';
      case OP_DIV: return '/';
      case OP_MODII: return '%';
      default: return '?';
    }
  }

  /**
   * Get comparison operator string
   */
  private getComparisonOperator(opCode: number): string {
    switch (opCode) {
      case OP_EQUAL: return '==';
      case OP_NEQUAL: return '!=';
      case OP_GT: return '>';
      case OP_GEQ: return '>=';
      case OP_LT: return '<';
      case OP_LEQ: return '<=';
      default: return '?';
    }
  }

  /**
   * Get logical operator string
   */
  private getLogicalOperator(opCode: number): string {
    switch (opCode) {
      case OP_LOGANDII: return '&&';
      case OP_LOGORII: return '||';
      case OP_BOOLANDII: return '&&';
      default: return '?';
    }
  }

  /**
   * Get unary operator string
   */
  private getUnaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_NEG: return '-';
      case OP_COMPI: return '~';
      case OP_NOTI: return '!';
      default: return '?';
    }
  }

  /**
   * Get result data type from instruction type
   */
  private getResultType(type: number): NWScriptDataType {
    switch (type) {
      case 3: return NWScriptDataType.INTEGER;
      case 4: return NWScriptDataType.FLOAT;
      case 5: return NWScriptDataType.STRING;
      case 6: return NWScriptDataType.OBJECT;
      default: return NWScriptDataType.INTEGER;
    }
  }

  /**
   * Generate a variable name
   */
  private generateVariableName(isGlobal: boolean, offset: number): string {
    if (isGlobal) {
      return `g_var_${offset}`;
    } else {
      return `var_${offset}`;
    }
  }
}

