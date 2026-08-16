/**
 * ResRef prompt dialog used when KEY catalogs are not available.
 *
 * @file ModalResRefPrompt.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { FormEvent, useId, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog, ForgeInput } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalResRefPromptState } from "@/apps/forge/states/modal/ModalResRefPromptState";
import "@/apps/forge/components/modal/ModalResRefPrompt.scss";

export const ModalResRefPrompt = (props: BaseModalProps) => {
  const modal = props.modal as ModalResRefPromptState;
  const inputId = useId();
  const [show, setShow] = useState(modal.visible);
  const [value, setValue] = useState(modal.value);

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    setValue(modal.value);
  };
  const onValueChanged = () => setValue(modal.value);

  useEffectOnce(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onValueChanged", onValueChanged);
    if (modal.visible) {
      setShow(true);
    }
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onValueChanged", onValueChanged);
    };
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    modal.confirm();
  };

  return (
    <ForgeDialog
      show={show}
      onHide={() => modal.close()}
      backdrop="static"
      keyboard={true}
      size="sm"
      className="modal-resref-prompt"
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body>
        <form className="resref-prompt-form" onSubmit={onSubmit}>
          <p className="resref-prompt-hint">{modal.hint}</p>
          <label className="resref-prompt-label" htmlFor={inputId}>
            {modal.label}
          </label>
          <ForgeInput
            id={inputId}
            maxLength={16}
            value={value}
            placeholder="ResRef"
            autoFocus
            aria-label={modal.label}
            onChange={(e) => modal.setValue(e.target.value)}
          />
        </form>
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton onClick={() => modal.close()}>Cancel</ForgeButton>
        <ForgeButton variant="primary" disabled={!value} onClick={() => modal.confirm()}>
          OK
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
