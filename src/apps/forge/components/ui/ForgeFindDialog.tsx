/**
 * Reusable Find / Find & Replace dialog for Forge editors.
 *
 * @file ForgeFindDialog.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { ChangeEvent, useEffect, useRef } from "react";
import { ForgeButton, ForgeDialog, ForgeInput } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import "@/apps/forge/components/ui/ForgeFindDialog.scss";

export type ForgeFindMode = "find" | "replace";

export interface ForgeFindDialogProps {
  show: boolean;
  onHide: () => void;
  /** Active mode. When `allowReplace` is true, the dialog can switch modes. */
  mode?: ForgeFindMode;
  onModeChange?: (mode: ForgeFindMode) => void;
  /** When true, show Find & Replace controls and a mode toggle. */
  allowReplace?: boolean;
  title?: string;
  findValue: string;
  onFindValueChange: (value: string) => void;
  replaceValue?: string;
  onReplaceValueChange?: (value: string) => void;
  /** e.g. "3/42" or "0/0" */
  matchLabel?: string;
  caseSensitive?: boolean;
  onCaseSensitiveChange?: (value: boolean) => void;
  /** Editor-specific options (filter rows, wrap, etc.). */
  extras?: React.ReactNode;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace?: () => void;
  onReplaceAll?: () => void;
  findNextDisabled?: boolean;
  findPrevDisabled?: boolean;
  replaceDisabled?: boolean;
  replaceAllDisabled?: boolean;
}

export function ForgeFindDialog(props: ForgeFindDialogProps) {
  const {
    show,
    onHide,
    mode = "find",
    onModeChange,
    allowReplace = false,
    title,
    findValue,
    onFindValueChange,
    replaceValue = "",
    onReplaceValueChange,
    matchLabel = "",
    caseSensitive = false,
    onCaseSensitiveChange,
    extras,
    onFindNext,
    onFindPrev,
    onReplace,
    onReplaceAll,
    findNextDisabled = false,
    findPrevDisabled = false,
    replaceDisabled = false,
    replaceAllDisabled = false,
  } = props;

  const findRef = useRef<HTMLInputElement>(null);
  const isReplace = allowReplace && mode === "replace";
  const dialogTitle = title ?? (isReplace ? "Find & Replace" : "Find");

  useEffect(() => {
    if (!show) return;
    // ForgeDialog focuses the first input; re-select so Ctrl+F re-opens usefully.
    const id = window.setTimeout(() => {
      findRef.current?.focus();
      findRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [show, mode]);

  const onFindKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onFindPrev();
      else onFindNext();
    }
  };

  const onReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onReplace?.();
    }
  };

  return (
    <ForgeDialog show={show} onHide={onHide} size="sm" className="forge-find-dialog">
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{dialogTitle}</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body>
        {allowReplace ? (
          <div className="forge-find-dialog__mode">
            <ForgeButton
              size="sm"
              variant={!isReplace ? "primary" : "secondary"}
              onClick={() => onModeChange?.("find")}
            >
              Find
            </ForgeButton>
            <ForgeButton
              size="sm"
              variant={isReplace ? "primary" : "secondary"}
              onClick={() => onModeChange?.("replace")}
            >
              Replace
            </ForgeButton>
          </div>
        ) : null}

        <label className="forge-find-dialog__field">
          <span className="forge-find-dialog__label">Find</span>
          <ForgeInput
            ref={findRef}
            value={findValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFindValueChange(e.target.value)}
            onKeyDown={onFindKeyDown}
            placeholder="Search…"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        {isReplace ? (
          <label className="forge-find-dialog__field">
            <span className="forge-find-dialog__label">Replace</span>
            <ForgeInput
              value={replaceValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onReplaceValueChange?.(e.target.value)}
              onKeyDown={onReplaceKeyDown}
              placeholder="Replace with…"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        ) : null}

        <div className="forge-find-dialog__options">
          {onCaseSensitiveChange ? (
            <ForgeCheckbox
              label="Match case"
              value={caseSensitive}
              onChange={onCaseSensitiveChange}
            />
          ) : null}
          {extras}
        </div>

        {matchLabel ? (
          <div className="forge-find-dialog__matches" aria-live="polite">
            {matchLabel}
          </div>
        ) : null}
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton variant="secondary" size="sm" onClick={onFindPrev} disabled={findPrevDisabled}>
          Previous
        </ForgeButton>
        <ForgeButton variant="secondary" size="sm" onClick={onFindNext} disabled={findNextDisabled}>
          Next
        </ForgeButton>
        {isReplace ? (
          <>
            <ForgeButton variant="secondary" size="sm" onClick={onReplace} disabled={replaceDisabled || !onReplace}>
              Replace
            </ForgeButton>
            <ForgeButton variant="primary" size="sm" onClick={onReplaceAll} disabled={replaceAllDisabled || !onReplaceAll}>
              Replace All
            </ForgeButton>
          </>
        ) : (
          <ForgeButton variant="primary" size="sm" onClick={onFindNext} disabled={findNextDisabled}>
            Find Next
          </ForgeButton>
        )}
        <ForgeButton variant="secondary" size="sm" onClick={onHide}>
          Close
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
}
