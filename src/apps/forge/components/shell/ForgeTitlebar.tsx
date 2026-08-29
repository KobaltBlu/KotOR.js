import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import * as KotOR from "@/apps/forge/KotOR";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const isElectron = () => {
  try {
    return (
      KotOR.ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON &&
      typeof window !== "undefined" &&
      typeof window.electron !== "undefined"
    );
  } catch {
    return false;
  }
};

const getFullscreenElement = (): Element | null => {
  const doc = document as FullscreenDocument;

  return (
    document.fullscreenElement ??
    doc.webkitFullscreenElement ??
    null
  );
};

export interface ForgeTitlebarProps {
  children?: ReactNode;
}

export const ForgeTitlebar = function ForgeTitlebar({
  children,
}: ForgeTitlebarProps) {
  const electron = isElectron();
  const isMac = electron && !!window.electron.isMac?.();

  const [isFullscreen, setIsFullscreen] = useState(() => {
    try {
      return !!getFullscreenElement();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (electron) {
      return;
    }

    const onFullscreenChange = () => {
      setIsFullscreen(!!getFullscreenElement());
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      onFullscreenChange as EventListener,
    );

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange as EventListener,
      );
    };
  }, [electron]);

  const minimize = useCallback(() => {
    window.electron?.minimize?.();
  }, []);

  const maximize = useCallback(() => {
    window.electron?.maximize?.();
  }, []);

  const close = useCallback(() => {
    window.electron?.close?.();
  }, []);

  const onFullscreenClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const doc = document as FullscreenDocument;

        //
        // Exit fullscreen
        //
        if (getFullscreenElement()) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          }

          return;
        }

        //
        // Chrome requires this request to originate from an active
        // user gesture. Do not put any await/timer before this point.
        //
        if (!navigator.userActivation?.isActive) {
          console.warn(
            "Fullscreen request does not have active user activation",
          );
        }

        //
        // Prefer documentElement for browser fullscreen.
        //
        // Using #root can introduce problems if the React root has
        // constrained dimensions, transforms, overflow rules, etc.
        //
        const target = document.documentElement as FullscreenElement;

        if (target.requestFullscreen) {
          await target.requestFullscreen();
          return;
        }

        if (target.webkitRequestFullscreen) {
          await target.webkitRequestFullscreen();
          return;
        }

        console.error("Fullscreen is not available in this browser");
      } catch (err) {
        console.error("Fullscreen toggle failed", err);
      }
    },
    [],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.closest(
          "button, .forge-menubar, .forge-menubar-host, .forge-menubar-preview-btn, .forge-titlebar__controls",
        )
      ) {
        return;
      }

      if (electron) {
        maximize();
      }
    },
    [electron, maximize],
  );

  const macControls = useMemo(() => {
    if (!isMac) {
      return null;
    }

    return (
      <div className="forge-titlebar__controls forge-titlebar__controls--mac">
        <button
          type="button"
          className="forge-titlebar__btn forge-titlebar__btn--close"
          aria-label="Close"
          onClick={close}
        />

        <button
          type="button"
          className="forge-titlebar__btn forge-titlebar__btn--min"
          aria-label="Minimize"
          onClick={minimize}
        />

        <button
          type="button"
          className="forge-titlebar__btn forge-titlebar__btn--max"
          aria-label="Maximize"
          onClick={maximize}
        />
      </div>
    );
  }, [isMac, close, maximize, minimize]);

  const trailingControls = useMemo(() => {
    if (isMac) {
      return null;
    }

    if (electron) {
      return (
        <div className="forge-titlebar__controls">
          <button
            type="button"
            className="forge-titlebar__btn forge-titlebar__btn--min"
            aria-label="Minimize"
            onClick={minimize}
          >
            −
          </button>

          <button
            type="button"
            className="forge-titlebar__btn forge-titlebar__btn--max"
            aria-label="Maximize"
            onClick={maximize}
          >
            □
          </button>

          <button
            type="button"
            className="forge-titlebar__btn forge-titlebar__btn--close"
            aria-label="Close"
            onClick={close}
          >
            ×
          </button>
        </div>
      );
    }

    return (
      <div className="forge-titlebar__controls">
        <button
          type="button"
          className="forge-titlebar__btn forge-titlebar__btn--fullscreen"
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={onFullscreenClick}
        >
          <i
            className={`fa-solid ${
              isFullscreen ? "fa-compress" : "fa-expand"
            }`}
            aria-hidden
          />
        </button>
      </div>
    );
  }, [
    electron,
    isMac,
    isFullscreen,
    close,
    maximize,
    minimize,
    onFullscreenClick,
  ]);

  return (
    <div
      className={`forge-titlebar${
        electron ? " forge-titlebar--electron" : ""
      }${isMac ? " forge-titlebar--mac" : ""}`.trim()}
      onDoubleClick={onDoubleClick}
    >
      {macControls}

      <div className="forge-titlebar__menus">
        {children}
      </div>

      <div className="forge-titlebar__title">
        KotOR Forge
      </div>

      {trailingControls}
    </div>
  );
};