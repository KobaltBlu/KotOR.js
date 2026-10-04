export enum DebuggerState {
  Idle = 0x00,
  Paused = 0x01,
  /** @deprecated typo — use InstructionStepOver */
  IntructionStepOver = 0x02,
  InstructionStepOver = 0x02,
  InstructionStepInto = 0x03,
  InstructionStepOut = 0x04,
}

/** Pending Continue / Step action queued for the next GameState.Update tick. */
export type DebuggerPendingResume = {
  action: 'continue' | 'stepOver' | 'stepInto' | 'stepOut';
  seek: number;
};
