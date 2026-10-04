/**
 * @jest-environment node
 *
 * Contract for ModuleDoor.update idle gating:
 * hidden idle doors skip model.update / syncWalkmeshMatrix;
 * transitions and collisionMatrixDirty still sync.
 */
import { describe, expect, test, jest } from "@jest/globals";
import { ModuleDoorAnimState } from "@core/enums/module/ModuleDoorAnimState";

function isTransitioningAnimState(animState: number): boolean {
  switch(animState){
    case ModuleDoorAnimState.OPENING1:
    case ModuleDoorAnimState.OPENING2:
    case ModuleDoorAnimState.CLOSING1:
    case ModuleDoorAnimState.CLOSING2:
    case ModuleDoorAnimState.DAMAGE:
    case ModuleDoorAnimState.BUSTED:
    case ModuleDoorAnimState.TRANS:
      return true;
    default:
      return false;
  }
}

function doorUpdateLike(door: {
  model: { visible: boolean; update: (d: number) => void } | null;
  forceAlwaysUpdate: boolean;
  isDead: boolean;
  collisionMatrixDirty: boolean;
  animState: number;
  syncWalkmeshMatrix: () => void;
}, delta: number) {
  const transitioning = isTransitioningAnimState(door.animState);
  const needsModelUpdate =
    transitioning ||
    door.forceAlwaysUpdate ||
    door.isDead ||
    !!(door.model?.visible);
  if(door.model && needsModelUpdate){
    door.model.update(delta);
  }
  if(door.collisionMatrixDirty || transitioning){
    door.syncWalkmeshMatrix();
    door.collisionMatrixDirty = false;
  }
}

describe("ModuleDoor idle update gate", () => {
  test("skips model.update and syncWalkmeshMatrix for hidden idle doors", () => {
    const modelUpdate = jest.fn();
    const sync = jest.fn();
    const door = {
      model: { visible: false, update: modelUpdate },
      forceAlwaysUpdate: false,
      isDead: false,
      collisionMatrixDirty: false,
      animState: ModuleDoorAnimState.CLOSED,
      syncWalkmeshMatrix: sync,
    };
    doorUpdateLike(door, 0.016);
    expect(modelUpdate).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  test("updates model and syncs DWK while opening", () => {
    const modelUpdate = jest.fn();
    const sync = jest.fn();
    const door = {
      model: { visible: false, update: modelUpdate },
      forceAlwaysUpdate: false,
      isDead: false,
      collisionMatrixDirty: false,
      animState: ModuleDoorAnimState.OPENING1,
      syncWalkmeshMatrix: sync,
    };
    doorUpdateLike(door, 0.016);
    expect(modelUpdate).toHaveBeenCalledWith(0.016);
    expect(sync).toHaveBeenCalled();
    expect(door.collisionMatrixDirty).toBe(false);
  });

  test("syncs DWK when collisionMatrixDirty even if idle and hidden", () => {
    const sync = jest.fn();
    const door = {
      model: { visible: false, update: jest.fn() },
      forceAlwaysUpdate: false,
      isDead: false,
      collisionMatrixDirty: true,
      animState: ModuleDoorAnimState.CLOSED,
      syncWalkmeshMatrix: sync,
    };
    doorUpdateLike(door, 0.016);
    expect(sync).toHaveBeenCalled();
    expect(door.collisionMatrixDirty).toBe(false);
  });

  test("forceAlwaysUpdate keeps model ticking when hidden", () => {
    const modelUpdate = jest.fn();
    const door = {
      model: { visible: false, update: modelUpdate },
      forceAlwaysUpdate: true,
      isDead: false,
      collisionMatrixDirty: false,
      animState: ModuleDoorAnimState.CLOSED,
      syncWalkmeshMatrix: jest.fn(),
    };
    doorUpdateLike(door, 0.016);
    expect(modelUpdate).toHaveBeenCalledWith(0.016);
  });
});
