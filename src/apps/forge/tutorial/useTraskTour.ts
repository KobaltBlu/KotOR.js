/**
 * React hook for Trask tour visibility / step updates.
 *
 * @file useTraskTour.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TraskTourState } from "@/apps/forge/tutorial/TraskTourState";
import type { TraskTourStep } from "@/apps/forge/tutorial/traskTourSteps";

export interface TraskTourViewModel {
  visible: boolean;
  stepIndex: number;
  stepCount: number;
  step: TraskTourStep | undefined;
  isFirstStep: boolean;
  isLastStep: boolean;
}

function readTourView(): TraskTourViewModel {
  return {
    visible: TraskTourState.isVisible(),
    stepIndex: TraskTourState.getStepIndex(),
    stepCount: TraskTourState.getStepCount(),
    step: TraskTourState.getCurrentStep(),
    isFirstStep: TraskTourState.isFirstStep(),
    isLastStep: TraskTourState.isLastStep(),
  };
}

export function useTraskTour(options?: { autoStart?: boolean }): TraskTourViewModel {
  const [view, setView] = useState<TraskTourViewModel>(() => readTourView());

  useEffectOnce(() => {
    const sync = () => setView(readTourView());
    TraskTourState.addEventListener("onChange", sync);

    if (options?.autoStart) {
      // Defer so shell targets (Start Page, explorers) have mounted.
      const timer = window.setTimeout(() => {
        TraskTourState.tryAutoStart();
      }, 400);
      return () => {
        window.clearTimeout(timer);
        TraskTourState.removeEventListener("onChange", sync);
      };
    }

    return () => {
      TraskTourState.removeEventListener("onChange", sync);
    };
  });

  return view;
}
