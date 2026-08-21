/**
 * Small modal that asks for a ResRef when game catalogs are unavailable.
 *
 * @file ModalResRefPromptState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalResRefPrompt } from "@/apps/forge/components/modal/ModalResRefPrompt";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import { confirmTypedResRef, NO_GAME_RESREF_HINT } from "@/apps/forge/helpers/gameResRefPrompt";

export interface ModalResRefPromptOptions {
  title: string;
  hint?: string;
  label?: string;
  initial?: string;
  onConfirm: (resref: string) => void;
}

export class ModalResRefPromptState extends ModalState {
  hint: string;
  label: string;
  value: string;
  onConfirmCb: (resref: string) => void;

  constructor(options: ModalResRefPromptOptions) {
    super();
    this.title = options.title;
    this.hint = options.hint || NO_GAME_RESREF_HINT;
    this.label = options.label || "ResRef";
    this.value = sanitizeResRef(options.initial || "");
    this.onConfirmCb = options.onConfirm;
    this.setView(<ModalResRefPrompt modal={this} />);
  }

  setValue(value: string): void {
    this.value = sanitizeResRef(value);
    this.processEventListener("onValueChanged", [this]);
  }

  confirm(): void {
    const resref = confirmTypedResRef(this.value);
    if (!resref) {
      return;
    }
    this.onConfirmCb(resref);
    this.close();
  }
}
