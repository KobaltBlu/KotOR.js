import React, { useState, useEffect } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalBlueprintBrowserState } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import type { BlueprintCatalogSource } from "@/apps/forge/helpers/blueprintCatalog";
import { BlueprintBrowserThumbnail } from "@/apps/forge/components/modal/BlueprintBrowserThumbnail";
import { isBlueprintThumbnailType } from "@/apps/forge/helpers/blueprintThumbnailFingerprint";
import "@/apps/forge/components/modal/ModalBlueprintBrowser.scss";

const BLUEPRINT_TYPE_LABELS: Record<string, string> = {
  'utc': 'creatures',
  'utd': 'doors',
  'ute': 'encounters',
  'uti': 'items',
  'utp': 'placeables',
  'utm': 'stores',
  'uts': 'sounds',
  'utt': 'triggers',
  'utw': 'waypoints',
};

const SOURCE_LABEL: Record<BlueprintCatalogSource, string> = {
  project: "Project",
  override: "Override",
  game: "Game",
};

export const ModalBlueprintBrowser = (props: BaseModalProps) => {
  const modal = props.modal as ModalBlueprintBrowserState;
  const [show, setShow] = useState(modal.visible);
  const [items, setItems] = useState(modal.filteredItems);
  const [searchQuery, setSearchQuery] = useState(modal.searchQuery);
  const [loading, setLoading] = useState(true);

  const onHide = () => {
    setShow(false);
  };

  const onShow = () => {
    setShow(true);
    setLoading(true);
    modal.loadBlueprints().catch((error) => {
      console.error('Failed to load blueprints:', error);
      setLoading(false);
    });
  };

  const onBlueprintsLoaded = () => {
    setItems([...modal.filteredItems]);
    setLoading(false);
  };

  const onSearchChanged = () => {
    setItems([...modal.filteredItems]);
    setSearchQuery(modal.searchQuery);
  };

  useEffectOnce(() => {
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    modal.addEventListener('onBlueprintsLoaded', onBlueprintsLoaded);
    modal.addEventListener('onSearchChanged', onSearchChanged);
    
    if (modal.visible) {
      onShow();
    } else if (modal.items.length > 0) {
      setItems([...modal.filteredItems]);
      setLoading(false);
    }
    
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onBlueprintsLoaded', onBlueprintsLoaded);
      modal.removeEventListener('onSearchChanged', onSearchChanged);
    };
  });

  useEffect(() => {
    if (modal.visible && loading && modal.items.length === 0) {
      modal.loadBlueprints().catch((error) => {
        console.error('Failed to load blueprints:', error);
        setLoading(false);
      });
    }
  }, [modal.visible, loading, modal.items.length]);

  const handleHide = () => {
    modal.close();
  };

  const handleClose = (_e: React.MouseEvent<HTMLButtonElement>) => {
    modal.close();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    modal.setSearchQuery(e.target.value);
  };

  const handleBlueprintClick = (blueprint: ModalBlueprintBrowserState['items'][0]) => {
    modal.selectBlueprint(blueprint);
  };

  return (
    <ForgeDialog
      show={show}
      onHide={handleHide}
      backdrop="static"
      keyboard={false}
      size="lg"
      className="modal-blueprint-browser"
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <div className="blueprint-browser-search">
          <input
            type="text"
            className="forge-input"
            placeholder={`Search ${BLUEPRINT_TYPE_LABELS[modal.selectedBlueprintType]}...`}
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {!loading ? (
            <div className="blueprint-browser-count">
              {items.length} blueprint{items.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="blueprint-browser-loading">
            <p>Loading blueprints...</p>
          </div>
        ) : (
          <div className="blueprint-browser-grid">
            {items.length === 0 ? (
              <div className="blueprint-browser-empty">
                <p>No blueprints found</p>
              </div>
            ) : (
              items.map((blueprint) => (
                <div
                  key={`${blueprint.source || "game"}:${blueprint.resref}`}
                  className="blueprint-browser-item"
                  onClick={() => handleBlueprintClick(blueprint)}
                  title={blueprint.localizedName || blueprint.resref}
                >
                  {isBlueprintThumbnailType(modal.selectedBlueprintType) ? (
                    <BlueprintBrowserThumbnail
                      type={modal.selectedBlueprintType}
                      item={blueprint}
                    />
                  ) : (
                    <div className="blueprint-browser-icon">
                      <div className="blueprint-browser-icon-placeholder">
                        {modal.selectedBlueprintType.toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="blueprint-browser-label">{blueprint.resref}</div>
                  {blueprint.source && (
                    <div className={`blueprint-browser-source blueprint-browser-source--${blueprint.source}`}>
                      {SOURCE_LABEL[blueprint.source]}
                    </div>
                  )}
                  {blueprint.localizedName && blueprint.localizedName !== blueprint.resref && (
                    <div className="blueprint-browser-localized-name">{blueprint.localizedName}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </ForgeDialog.Body>

      <ForgeDialog.Footer>
        <ForgeButton onClick={handleClose}>
          Close
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
