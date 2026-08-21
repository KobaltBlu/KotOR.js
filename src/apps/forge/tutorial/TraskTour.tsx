/**
 * Clippy-style Trask Ulgo first-run tour overlay.
 *
 * @file TraskTour.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ForgeButton } from "@/apps/forge/components/ui";
import {
  TRASK_SPRITESHEET_URL,
  getTraskFrameBackgroundPosition,
  getTraskSpritesheetBackgroundSize,
} from "@/apps/forge/tutorial/traskFrames";
import { TraskTourState } from "@/apps/forge/tutorial/TraskTourState";
import {
  traskTourTargetSelector,
  type TraskTourTargetId,
} from "@/apps/forge/tutorial/traskTourSteps";
import { useTraskTour } from "@/apps/forge/tutorial/useTraskTour";
import "@/apps/forge/tutorial/TraskTour.scss";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTarget(targetId: TraskTourTargetId | undefined): HighlightRect | null {
  if (!targetId || typeof document === "undefined") {
    return null;
  }
  const el = document.querySelector(traskTourTargetSelector(targetId));
  if (!(el instanceof HTMLElement)) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const pad = 6;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

export const TraskTour = function TraskTour() {
  const tour = useTraskTour({ autoStart: true });
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const refreshHighlight = useCallback(() => {
    setHighlight(measureTarget(tour.step?.target));
  }, [tour.step?.target]);

  useLayoutEffect(() => {
    if (!tour.visible) {
      setHighlight(null);
      return;
    }
    refreshHighlight();
  }, [tour.visible, tour.stepIndex, tour.step?.target, refreshHighlight]);

  useEffect(() => {
    if (!tour.visible) {
      return;
    }
    const onResize = () => refreshHighlight();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const interval = window.setInterval(refreshHighlight, 500);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(interval);
    };
  }, [tour.visible, refreshHighlight]);

  useEffect(() => {
    if (!tour.visible) {
      return;
    }
    nextBtnRef.current?.focus();
  }, [tour.visible, tour.stepIndex]);

  useEffect(() => {
    if (!tour.visible) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        TraskTourState.skip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tour.visible]);

  if (!tour.visible || !tour.step) {
    return null;
  }

  const pose = tour.step.pose;
  const stepLabel = `Step ${tour.stepIndex + 1} of ${tour.stepCount}`;
  const primaryLabel = tour.isLastStep ? "Got it" : "Next";

  return (
    <div className="trask-tour" aria-live="polite">
      {highlight ? (
        <div
          className="trask-tour__highlight"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
          aria-hidden="true"
        />
      ) : null}

      <div className="trask-tour__dock">
        <div
          className="trask-tour__bubble"
          role="dialog"
          aria-modal="false"
          aria-labelledby="trask-tour-title"
          aria-describedby="trask-tour-body"
        >
          <div className="trask-tour__bubble-header">
            <span id="trask-tour-title" className="trask-tour__name">
              {tour.step.title}
            </span>
            <span className="trask-tour__step">{stepLabel}</span>
          </div>
          <p id="trask-tour-body" className="trask-tour__body">
            {tour.step.body}
          </p>
          <div className="trask-tour__actions">
            <ForgeButton
              variant="ghost"
              size="sm"
              className="trask-tour__skip"
              onClick={() => TraskTourState.skip()}
            >
              Skip tour
            </ForgeButton>
            <div className="trask-tour__nav">
              <ForgeButton
                variant="ghost"
                size="sm"
                disabled={tour.isFirstStep}
                onClick={() => TraskTourState.prev()}
              >
                Back
              </ForgeButton>
              <ForgeButton
                ref={nextBtnRef}
                variant="primary"
                size="sm"
                onClick={() => TraskTourState.next()}
              >
                {primaryLabel}
              </ForgeButton>
            </div>
          </div>
          <div className="trask-tour__tail" aria-hidden="true" />
        </div>

        <div className="trask-tour__portrait" aria-hidden="true">
          <div
            key={pose}
            className="trask-tour__sprite"
            style={{
              backgroundImage: `url(${TRASK_SPRITESHEET_URL})`,
              backgroundSize: getTraskSpritesheetBackgroundSize(),
              backgroundPosition: getTraskFrameBackgroundPosition(pose),
            }}
          />
        </div>
      </div>
    </div>
  );
};
