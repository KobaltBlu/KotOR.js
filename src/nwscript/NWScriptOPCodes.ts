
//OPCodes & NCS info: http://web.archive.org/web/20040530002709/http://www.torlack.com/index.html?topics=nwndata_ncs

// CPDOWNSP - Copy Down Stack Pointer
// Copy the given number of bytes from the top of the stack down to the location specified.

// The value of SP remains unchanged.
export const OP_CPDOWNSP = 0x01;

// RSADDx- Reserve Space on Stack
// RSADDI- Reserve Integer Space on Stack
// RSADDF- Reserve Float Space on Stack
// RSADDS- Reserve String Space on Stack
// RSADDO- Reserve Object Space on Stack
// Reserve space on the stack for the given variable type.

// The value of SP is increased by the size of the type reserved.  (Always 4)
export const OP_RSADD = 0x02;

// CPTOPSP - Copy Top Stack Pointer
// Add the given number of bytes from the location specified in the stack to the top of the stack.

// The value of SP is increased by the number of copied bytes.
export const OP_CPTOPSP = 0x03;

// CONSTI - Place Constant Integer Onto the Stack
// CONSTF - Place Constant Float Onto the Stack
// CONSTS - Place Constant String Onto the Stack
// CONSTO - Place Constant Object ID Onto the Stack
// Place the constant integer onto the top of the stack.

// The value of SP is increased by the size of the type reserved.  (Always 4)
export const OP_CONST = 0x04;

// ACTION - Call an Engine Routine
// Invoke the engine routine specified.  All arguments must be placed on the stack in reverse order prior to this byte code.  The arguments will be removed by the engine routine and any return value then placed on the stack.

// The value of SP is increased by the size of the return value and decreased by the total size of the arguments.  It is important to note that the total size of the arguments might be different than the number of arguments.  Structures and vectors are take up more space than normal types.
export const OP_ACTION = 0x05;

// LOGANDII - Logical AND Two Integers
// Compute the logical AND of two integer values.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_LOGANDII = 0x06;

// LOGORII - Logical OR Two Integers
// Compute the logical OR of two integer values.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_LOGORII = 0x07;

// INCORII - Bitwise Inclusive OR Two Integers
// Compute the inclusive OR of two integer values.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_INCORII = 0x08;

// EXCORII - Bitwise Exclusive OR Two Integers
// Compute the exclusive OR of two integers.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_EXCORII = 0x09;

// BOOLANDII - Boolean or Bitwise AND Two Integers
// Compute the boolean AND of two integers.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_BOOLANDII = 0x0A;

// EQUALxx - Test for Logical Equality
// EQUALII - Test for Logical Equality Two Integers
// EQUALFF - Test for Logical Equality Two Floats
// EQUALSS - Test for Logical Equality Two Strings
// EQUALOO - Test for Logical Equality Two Object IDs
// Test the two operand for logical equality.  This operator supports the comparison or all the basic types and then engine types as long as both operands have the same type.

// The value of SP is increased by the size of the result while decreased by the size of both operands.

// EQUALTT - Test for Logical Equality Two Structures
// Test the two operand for logical equality.  This operator supports the comparison or all the basic types and then engine types as long as both operands have the same type.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_EQUAL = 0x0B;

// NEQUALxx - Test for Logical Inequality
// NEQUALII - Test for Logical Inequality Two Integers
// NEQUALFF - Test for Logical Inequality Two Floats
// NEQUALSS - Test for Logical Inequality Two Strings
// NEQUALOO - Test for Logical Inequality Two Object IDs
// Test the two operand for logical inequality.  This operator supports the comparison or all the basic types and then engine types as long as both operands have the same type.

// The value of SP is increased by the size of the result while decreased by the size of both operands.

// NEQUALTT - Test for Logical Inequality Two Structures
// Test the two operand for logical inequality.  This operator supports the comparison or all the basic types and then engine types as long as both operands have the same type.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_NEQUAL = 0x0C;

// GEQxx - Test for Greater Than or Equal
// GEQII - Test for Greater Than or Equal Two Integers
// GEQFF - Test for Greater Than or Equal Two Floats
// Test the two operand for logically greater than or equal.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_GEQ = 0x0D;

// GTxx - Test for Greater Than
// GTII - Test for Greater Than Two Integers
// GTFF - Test for Greater Than Two Floats
// Test the two operand for logically greater than.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_GT = 0x0E;

// LTxx - Test for Less Than
// LTII - Test for Less Than Two Integers
// LTFF - Test for Less Than Two Floats
// Test the two operand for logically less than.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_LT = 0x0F;

// LEQxx - Test for Less Than or Equal
// LEQII - Test for Less Than or Equal Two Integers
// LEQFF - Test for Less Than or Equal Two Floats
// Test the two operand for logically less than or equal.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_LEQ = 0x10;

// SHLEFTII - Shift the Integer Value Left
// Shift the value left be the given number of bits.  Operand one is the value to shift while operand two is the number of bits to shift.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_SHLEFTII = 0x11;

// SHRIGHTII - Shift the Integer Value Right
// Shift the value right be the given number of bits.  Operand one is the value to shift while operand two is the number of bits to shift.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_SHRIGHTII = 0x12;

// USHRIGHTII - Unsigned Shift the Integer Value Right
// Shift the value right be the given number of bits as if it was an unsigned integer and not a signed integer.  Operand one is the value to shift while operand two is the number of bits to shift.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_USHRIGHTII = 0x13;

// ADDxx - Add Two Values
// ADDII - Add Two Integer Values
// ADDIF - Add an Integer and Float Values
// ADDFI - Add a Float and Integer Values
// ADDFF - Add Two Float Values
// ADDSS - Add Two String Values
// ADDVV - Add Two Vector Values
// Add the two operands.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_ADD = 0x14;

// SUBxx - Subtract Two Values
// SUBII - Subtract Two Integer Values
// SUBIF - Subtract an Integer and Float Values
// SUBFI - Subtract a Float and Integer Values
// SUBFF - Subtract Two Float Values
// SUBVV - Subtract Two Vector Values
// Subtract the two operands. 

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_SUB = 0x15;

// MULxx - Multiply Two Values
// MULII - Multiply Two Integer Values
// MULIF - Multiply an Integer and Float Values
// MULFI - Multiply a Float and Integer Values
// MULFF - Multiply Two Float Values
// MULVF - Multiply a Vector and Float Values
// MULFV - Multiply a Float and Vector Values
// Multiply the two operands.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_MUL = 0x16;

// DIVxx - Divide Two Values
// DIVII - Divide Two Integer Values
// DIVLIF - Divide an Integer and Float Values
// DIVFI - Divide a Float and Integer Values
// DIVFF - Divide Two Float Values
// DIVVF - Divide a Vector and Float Values
// Divide the two operands.

// The value of SP is increased by the size of the result while decreased by the size of both operands
export const OP_DIV = 0x17;

// MODII- Compute the Modulus of Two Integer Values
// Computes the modulus of two values.

// The value of SP is increased by the size of the result while decreased by the size of both operands.
export const OP_MODII = 0x18;

// NEGx - Compute the Negation of a Value
// NEGI - Compute the Negation of an Integer Value
// NEGF - Compute the Negation of a Float Value
// Computes the negation of a value.

// The value of SP remains unchanged since the operand and result are of the same size.
export const OP_NEG = 0x19;

// COMPI - Compute the One's Complement of an Integer Value
// Computes the one's complement of a value.

// The value of SP remains unchanged since the operand and result are of the same size.
export const OP_COMPI = 0x1A;

// MOVSP - Adjust the Stack Pointer
// Add the value specified in the instruction to the stack pointer.

// The value of SP is adjusted by the value specified.
export const OP_MOVSP = 0x1B;

// STORE_STATEALL - Store the Current State of the Stack (Obsolete)
// Obsolete instruction to store the state of the stack and save a pointer to a block of code to later be used as an "action" argument.  This byte code is always followed by a JMP and then a block of code to be executed by a later function such as a DelayCommand.

// The value of SP remains unchanged.
export const OP_STORE_STATEALL = 0x1C;

// JMP - Jump to a New Location
// Change the current execution address to the relative address given in the instruction.

// The value of SP remains unchanged.
export const OP_JMP = 0x1D;

// JSR - Jump to Subroutine
// Jump to the subroutine at the relative address given in the instruction.  If the routine returns a value, the RSADDx instruction should first be used to allocate space for the return value.  Then all arguments to the subroutine should be pushed in reverse order.

// The value of SP remains unchanged.  The return value is NOT placed on the stack.
export const OP_JSR = 0x1E;

// JZ - Jump if Top of Stack is Zero
// Change the current execution address to the relative address given in the instruction if the integer on the top of the stack is zero.

// The value of SP is decremented by the size of the integer.
export const OP_JZ = 0x1F;

// RETN - Return from a JSR
// Return from a JSR.  All arguments used to invoke the subroutine should be removed prior to the RETN.  This leaves any return value on the top of the stack.  The return value must be allocated by the caller prior to invoking the subroutine.

// The value of SP remains unchanged.  The return value is NOT placed on the stack.
export const OP_RETN = 0x20;

// DESTRUCT - Destroy Element on the Stack
// Given a stack size, destroy all elements in that size excluding the given stack element and element size.

// The value of SP decremented by the given stack size minus the element size.
export const OP_DESTRUCT = 0x21;

// NOTI - Compute the logical NOT of an Integer Value
// Computes the logical not of the value.

// The value of SP remains unchanged since the operand and result are of the same size.
export const OP_NOTI = 0x22;

// DECISP - Decrement Integer Value Relative to Stack Pointer
// Decrements an integer relative to the current stack pointer.

// The value of SP remains unchanged.
export const OP_DECISP = 0x23;

// INCISP - Increment Integer Value Relative to Stack Pointer
// Increments an integer relative to the current stack pointer.

// The value of SP remains unchanged.
export const OP_INCISP = 0x24;

// JNZ - Jump if Top of Stack is Non-Zero
// Change the current execution address to the relative address given in the instruction if the integer on the top of the stack is non-zero.

// The value of SP is decremented by the size of the integer.
export const OP_JNZ = 0x25;

// CPDOWNBP - Copy Down Base Pointer
// Copy the given number of bytes from the base pointer down to the location specified. This instruction is used to assign new values to global variables.

// The value of SP remains unchanged.
export const OP_CPDOWNBP = 0x26;

// CPTOPBP - Copy Top Base Pointer
// Add the given number of bytes from the location specified relative to the base pointer to the top of the stack.  This instruction is used to retrieve the current value of global variables.

// The value of SP is increased by the number of copied bytes.
export const OP_CPTOPBP = 0x27;

// DECIBP - Decrement Integer Value Relative to Base Pointer
// Decrements an integer relative to the current base pointer.  This instruction is used to decrement the value of global variables.

// The value of SP remains unchanged.
export const OP_DECIBP = 0x28;

// INCIBP - Increment Integer Value Relative to Base Pointer
// Increments an integer relative to the current base pointer.  This instruction is used to increment the value of global variables.

// The value of SP remains unchanged.
export const OP_INCIBP = 0x29;

// SAVEBP  - Set a New Base Pointer Value
// Save the current value of the base pointer and set BP to the current stack position.

// The value of SP remains unchanged.
export const OP_SAVEBP = 0x2A;

// RESTOREBP - Restored the BP
// Restore the BP from a previous SAVEBP instruction.

// The value of SP remains unchanged.
export const OP_RESTOREBP = 0x2B;

// STORE_STATE - Store the Current Stack State
// Store the state of the stack and save a pointer to a block of code to later be used as an "action" argument.  This byte code is always followed by a JMP and then a block of code to be executed by a later function such as a DelayCommand.

// The value of SP remains unchanged.
export const OP_STORE_STATE = 0x2C;

// NOP - No-operation
// Perform no program function.  This opcode is used as a placeholder for the debugger.

// The value of SP remains unchanged.
export const OP_NOP = 0x2D;

// T - Program Size
// This byte code isn't a real instruction and is always found at offset 8 in the NCS file.

// The value of SP remains unchanged.
export const OP_T = 0x42;
