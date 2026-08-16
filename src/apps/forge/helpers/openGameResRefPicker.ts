/**
 * Open a KEY catalog browser, or a ResRef prompt when game data is missing.
 *
 * @file openGameResRefPicker.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ModalItemBrowserState, ModalItemBrowserOptions, UTIItem } from "@/apps/forge/states/modal/ModalItemBrowserState";
import { ModalBlueprintBrowserState, BlueprintType, BlueprintItem } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { ModalScriptBrowserState } from "@/apps/forge/states/modal/ModalScriptBrowserState";
import { ModalResRefBrowserState, ResRefKind, RESREF_KIND_SPEC } from "@/apps/forge/states/modal/ModalResRefBrowserState";
import { ModalResRefPromptState, ModalResRefPromptOptions } from "@/apps/forge/states/modal/ModalResRefPromptState";
import {
  blueprintFromTypedResRef,
  blueprintResRefTitle,
  catalogNeedsResRefPrompt,
  NO_GAME_RESREF_HINT,
  utiFromTypedResRef,
} from "@/apps/forge/helpers/gameResRefPrompt";

function present(modal: ModalState): void {
  modal.attachToModalManager(ForgeState.modalManager);
  modal.open();
}

export function promptResRef(options: ModalResRefPromptOptions): void {
  present(new ModalResRefPromptState(options));
}

export interface OpenItemBrowserOptions extends ModalItemBrowserOptions {
  initial?: string;
}

export function openItemBrowser(
  onItemSelect: (item: UTIItem) => void,
  options?: OpenItemBrowserOptions
): void {
  if (catalogNeedsResRefPrompt(ForgeState.hasGameData)) {
    promptResRef({
      title: options?.title || "Item ResRef",
      hint: NO_GAME_RESREF_HINT,
      initial: options?.initial,
      onConfirm: (resref) => onItemSelect(utiFromTypedResRef(resref)),
    });
    return;
  }
  const modal = new ModalItemBrowserState(onItemSelect, options);
  present(modal);
  void modal.loadItems();
}

export function openBlueprintBrowser(
  blueprintType: BlueprintType,
  onBlueprintSelect?: (blueprint: BlueprintItem, type: BlueprintType) => void,
  initial?: string
): void {
  if (catalogNeedsResRefPrompt(ForgeState.hasGameData)) {
    promptResRef({
      title: blueprintResRefTitle(blueprintType),
      hint: NO_GAME_RESREF_HINT,
      initial,
      onConfirm: (resref) => onBlueprintSelect?.(blueprintFromTypedResRef(resref), blueprintType),
    });
    return;
  }
  present(new ModalBlueprintBrowserState(blueprintType, onBlueprintSelect));
}

export function openScriptBrowser(onSelect: (resref: string) => void, initial?: string): void {
  if (catalogNeedsResRefPrompt(ForgeState.hasGameData)) {
    promptResRef({
      title: "Script ResRef",
      hint: NO_GAME_RESREF_HINT,
      label: "Script ResRef",
      initial,
      onConfirm: onSelect,
    });
    return;
  }
  present(new ModalScriptBrowserState(onSelect));
}

export function openResRefBrowser(kind: ResRefKind, onSelect: (resref: string) => void, initial?: string): void {
  if (catalogNeedsResRefPrompt(ForgeState.hasGameData)) {
    const spec = RESREF_KIND_SPEC[kind];
    promptResRef({
      title: `${spec.kindLabel.charAt(0).toUpperCase()}${spec.kindLabel.slice(1)} ResRef`,
      hint: NO_GAME_RESREF_HINT,
      label: `${spec.kindLabel} ResRef`,
      initial,
      onConfirm: onSelect,
    });
    return;
  }
  present(new ModalResRefBrowserState(kind, onSelect));
}
