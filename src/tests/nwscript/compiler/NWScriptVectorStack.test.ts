/**
 * @jest-environment node
 *
 * VECTOR stack: X deepest, Z on top.
 * Run: npx jest --config jest.audio-priority.config.js src/nwscript/NWScriptVectorStack.test.ts --coverage=false
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/effects/GameEffectFactory', () => ({ GameEffectFactory: {} }));
jest.mock('@/nwscript/events/NWScriptEventFactory', () => ({ NWScriptEventFactory: {} }));
jest.mock('@/engine/EngineLocation', () => ({ __esModule: true, default: class {} }));
jest.mock('@/resource/GFFField', () => ({ GFFField: class {} }));
jest.mock('@/resource/GFFStruct', () => ({ GFFStruct: class {} }));

import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import { NWScriptStack } from '@/nwscript/NWScriptStack';

/** Mirrors CALL_ACTION VECTOR arg pop (: Z on top). */
function popVectorArg(stack: NWScriptStack): THREE.Vector3 {
  const z = stack.pop()?.value;
  const y = stack.pop()?.value;
  const x = stack.pop()?.value;
  return new THREE.Vector3(x, y, z);
}

/** Script CONSTF / CPTOPSP order: push x, then y, then z. */
function pushScriptVector(stack: NWScriptStack, x: number, y: number, z: number){
  stack.push(x, NWScriptDataType.FLOAT);
  stack.push(y, NWScriptDataType.FLOAT);
  stack.push(z, NWScriptDataType.FLOAT);
}

describe('NWScript VECTOR stack (engine Z-on-top)', () => {
  it('engine-returned Vector3 round-trips through push(VECTOR) + ACTION pop', () => {
    const stack = new NWScriptStack();
    stack.push(new THREE.Vector3(20, 0, 0), NWScriptDataType.VECTOR);
    const v = popVectorArg(stack);
    expect(v.x).toBeCloseTo(20, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('script CONSTF Vector(20,0,0) yields pos on X (onfire SetPlayerTunnelPos)', () => {
    const stack = new NWScriptStack();
    pushScriptVector(stack, 20, 0, 0);
    const v = popVectorArg(stack);
    expect(v.x).toBeCloseTo(20, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('script local Vector(-20,0,0) yields neg on X (onfire SetPlayerTunnelNeg)', () => {
    const stack = new NWScriptStack();
    pushScriptVector(stack, -20, 0, 0);
    const v = popVectorArg(stack);
    expect(v.x).toBeCloseTo(-20, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('onfire tunnel pattern: pos +20 X and neg -20 X (not Z)', () => {
    const tunnel = {
      pos: { x: 0, y: 0, z: 0 },
      neg: { x: 0, y: 0, z: 0 },
    };

    const stackPos = new NWScriptStack();
    pushScriptVector(stackPos, 20, 0, 0);
    const pos = popVectorArg(stackPos);
    Object.assign(tunnel.pos, { x: pos.x, y: pos.y, z: pos.z });

    const stackNeg = new NWScriptStack();
    pushScriptVector(stackNeg, -20, 0, 0);
    const neg = popVectorArg(stackNeg);
    Object.assign(tunnel.neg, { x: neg.x, y: neg.y, z: neg.z });

    expect(tunnel.pos).toEqual({ x: 20, y: 0, z: 0 });
    expect(tunnel.neg).toEqual({ x: -20, y: 0, z: 0 });
  });
});
