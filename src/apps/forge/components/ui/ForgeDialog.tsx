import React, { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface ForgeDialogProps {
  show?: boolean;
  onHide?: () => void;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  backdrop?: boolean | "static";
  keyboard?: boolean;
  centered?: boolean;
}

function DialogHeader({ children, closeButton, onHide, onClick }: {
  children?: React.ReactNode;
  closeButton?: boolean;
  onHide?: () => void;
  onClick?: React.MouseEventHandler;
}) {
  const hide = (e: React.MouseEvent) => {
    onClick?.(e);
    onHide?.();
  };
  return (
    <div className="forge-dialog__header">
      <div>{children}</div>
      {closeButton ? (
        <button type="button" className="forge-dialog__close" aria-label="Close" onClick={hide}>
          <span className="fa-solid fa-xmark" />
        </button>
      ) : null}
    </div>
  );
}

function DialogTitle({ children }: { children?: React.ReactNode }) {
  return <h2 className="forge-dialog__title">{children}</h2>;
}

function DialogBody({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`forge-dialog__body ${className}`.trim()}>{children}</div>;
}

function DialogFooter({ children }: { children?: React.ReactNode }) {
  return <div className="forge-dialog__footer">{children}</div>;
}

export function ForgeDialog({
  show = false,
  onHide,
  children,
  className = "",
  size = "md",
  backdrop = true,
  keyboard = true,
  centered: _centered,
}: ForgeDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  const requestHide = useCallback(() => {
    onHideRef.current?.();
  }, []);

  useEffect(() => {
    if (!show) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute("disabled"));
    const preferred =
      focusables.find((el) => el.matches("input, textarea, select") && el.getAttribute("type") !== "hidden") ||
      focusables[0];
    preferred?.focus();

    return () => {
      previous?.focus?.();
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (keyboard && e.key === "Escape") {
        e.stopPropagation();
        requestHide();
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [show, keyboard, requestHide]);

  if (!show) return null;

  const onBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (backdrop === "static" || backdrop === false) return;
    requestHide();
  };

  const sizeClass =
    size === "xl" ? "forge-dialog--xl" :
    size === "lg" ? "forge-dialog--lg" :
    size === "sm" ? "forge-dialog--sm" : "";

  const patched = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === DialogHeader) {
      return React.cloneElement(child as React.ReactElement<any>, { onHide: requestHide });
    }
    return child;
  });

  return createPortal(
    <div className="forge-dialog-backdrop" onMouseDown={onBackdropMouseDown}>
      <div
        ref={panelRef}
        className={`forge-dialog ${sizeClass} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {patched}
      </div>
    </div>,
    document.body,
  );
}

ForgeDialog.Header = DialogHeader;
ForgeDialog.Title = DialogTitle;
ForgeDialog.Body = DialogBody;
ForgeDialog.Footer = DialogFooter;
