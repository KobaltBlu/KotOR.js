import { useEffect, useRef } from "react";

/** Effect function run once; may return a cleanup function. */
type EffectOnceFn = () => (() => void) | undefined;

export const useEffectOnce = (effect: EffectOnceFn): void => {
  const effectRef = useRef<EffectOnceFn>(effect);
  effectRef.current = effect;
  const destroyFunc = useRef<(() => void) | undefined>(undefined);
  const calledOnce = useRef(false);
  const renderAfterCalled = useRef(false);

  if (calledOnce.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    if (calledOnce.current) {
      return;
    }

    calledOnce.current = true;
    const run = effectRef.current;
    const cleanup = run ? run() : undefined;
    destroyFunc.current = typeof cleanup === "function" ? cleanup : undefined;

    return () => {
      if (!renderAfterCalled.current) {
        return;
      }

      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
  }, []);
};
