/**
 * @jest-environment node
 *
 * Contract for OdysseyModel3D.update when animateFrame is gated off:
 * effects + animationManager still run; emitters / dangly / anim-dummy skip.
 */
import { describe, expect, test, jest } from "@jest/globals";

function updateModelLike(model: {
  animateFrame: boolean;
  effects: { update: (d: number) => void }[];
  animationManager: { update: (d: number) => void };
  emitters: { tick: (d: number) => void }[];
  childModels: { animateFrame: boolean; update: (d: number) => void }[];
  updateAnimDummy: () => void;
  updateDangly: () => void;
  updateSaber: () => void;
}, delta: number) {
  for(const e of model.effects){
    e.update(delta);
  }
  model.animationManager.update(delta);
  if(model.animateFrame){
    model.updateAnimDummy();
  }
  if(model.animateFrame){
    for(const em of model.emitters){
      em.tick(delta);
    }
  }
  for(const child of model.childModels){
    child.animateFrame = model.animateFrame;
    child.update(delta);
  }
  if(model.animateFrame){
    model.updateDangly();
    model.updateSaber();
  }
}

describe("OdysseyModel3D.update animateFrame gate", () => {
  test("skips emitters and dangly when animateFrame is false", () => {
    const emitterTick = jest.fn();
    const updateAnimDummy = jest.fn();
    const updateDangly = jest.fn();
    const updateSaber = jest.fn();
    const animUpdate = jest.fn();
    const childUpdate = jest.fn();

    updateModelLike({
      animateFrame: false,
      effects: [],
      animationManager: { update: animUpdate },
      emitters: [{ tick: emitterTick }],
      childModels: [{ animateFrame: true, update: childUpdate }],
      updateAnimDummy,
      updateDangly,
      updateSaber,
    }, 0.016);

    expect(animUpdate).toHaveBeenCalledWith(0.016);
    expect(emitterTick).not.toHaveBeenCalled();
    expect(updateAnimDummy).not.toHaveBeenCalled();
    expect(updateDangly).not.toHaveBeenCalled();
    expect(updateSaber).not.toHaveBeenCalled();
    expect(childUpdate).toHaveBeenCalled();
  });

  test("ticks emitters when animateFrame is true", () => {
    const emitterTick = jest.fn();
    const updateAnimDummy = jest.fn();
    const updateDangly = jest.fn();
    const updateSaber = jest.fn();

    updateModelLike({
      animateFrame: true,
      effects: [],
      animationManager: { update: jest.fn() },
      emitters: [{ tick: emitterTick }],
      childModels: [],
      updateAnimDummy,
      updateDangly,
      updateSaber,
    }, 0.016);

    expect(emitterTick).toHaveBeenCalledWith(0.016);
    expect(updateAnimDummy).toHaveBeenCalled();
    expect(updateDangly).toHaveBeenCalled();
    expect(updateSaber).toHaveBeenCalled();
  });
});
