/**
 * Searchable NWScript resref picker.
 *
 * @file ModalScriptBrowser.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog, ForgeInput } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalScriptBrowserState } from "@/apps/forge/states/modal/ModalScriptBrowserState";
import type { ScriptCatalogSource } from "@/apps/forge/helpers/scriptResRefCatalog";
import "@/apps/forge/components/modal/ModalScriptBrowser.scss";

const SOURCE_LABEL: Record<ScriptCatalogSource, string> = {
  project: "Project",
  override: "Override",
  game: "Game",
};

export const ModalScriptBrowser = (props: BaseModalProps) => {
  const modal = props.modal as ModalScriptBrowserState;
  const [show, setShow] = useState(modal.visible);
  const [items, setItems] = useState(modal.filteredItems);
  const [searchQuery, setSearchQuery] = useState(modal.searchQuery);
  const [loading, setLoading] = useState(true);

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    setLoading(true);
    modal.loadScripts().catch((error) => {
      console.error("Failed to load scripts:", error);
      setLoading(false);
    });
  };

  const onItemsLoaded = () => {
    setItems([...modal.filteredItems]);
    setLoading(false);
  };

  const onSearchChanged = () => {
    setItems([...modal.filteredItems]);
    setSearchQuery(modal.searchQuery);
  };

  useEffectOnce(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onItemsLoaded", onItemsLoaded);
    modal.addEventListener("onSearchChanged", onSearchChanged);
    if (modal.visible) {
      onShow();
    }
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onItemsLoaded", onItemsLoaded);
      modal.removeEventListener("onSearchChanged", onSearchChanged);
    };
  });

  useEffect(() => {
    if (modal.visible && loading && modal.items.length === 0) {
      modal.loadScripts().catch((error) => {
        console.error("Failed to load scripts:", error);
        setLoading(false);
      });
    }
  }, [modal.visible, loading, modal.items.length]);

  return (
    <ForgeDialog
      show={show}
      onHide={() => modal.close()}
      backdrop="static"
      keyboard={true}
      size="lg"
      className="modal-script-browser"
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body>
        <div className="script-browser-search">
          <ForgeInput
            type="search"
            placeholder="Search scripts…"
            value={searchQuery}
            onChange={(e) => modal.setSearchQuery(e.target.value)}
            autoFocus
            aria-label="Search scripts"
          />
          {!loading ? (
            <div className="script-browser-count">{items.length} script{items.length === 1 ? "" : "s"}</div>
          ) : null}
        </div>
        {loading ? (
          <div className="script-browser-empty">Loading scripts…</div>
        ) : items.length === 0 ? (
          <div className="script-browser-empty">No scripts found</div>
        ) : (
          <div className="script-browser-list" role="listbox" aria-label="Scripts">
            {items.map((item) => (
              <button
                key={`${item.source}:${item.resref}`}
                type="button"
                className="script-browser-row"
                onClick={() => modal.selectScript(item)}
              >
                <span className="script-browser-resref">{item.resref}</span>
                <span className={`script-browser-source script-browser-source--${item.source}`}>
                  {SOURCE_LABEL[item.source]}
                </span>
              </button>
            ))}
          </div>
        )}
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton onClick={() => modal.close()}>Close</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
