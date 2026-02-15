import { useEffect, useRef } from "react";

/** Effect that runs once; may return a cleanup function */
type Effect = () => (() => void) | undefined;

export const useEffectOnce = ( effect: Effect ): void => {

  const destroyFunc = useRef<(() => void) | undefined>(undefined);
  const calledOnce = useRef(false);
  const renderAfterCalled = useRef(false);

  if (calledOnce.current) {
    renderAfterCalled.current = true;
  }

  useEffect( () => {
    if (calledOnce.current) { 
      return; 
    }

    calledOnce.current = true;
    const cleanup = effect();
    destroyFunc.current = typeof cleanup === 'function' ? cleanup : undefined;

    return (): void => {
      if (!renderAfterCalled.current) {
        return;
      }

      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
  }, []);
};