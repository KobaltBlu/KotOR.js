import React, { useState, useEffect } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Button, Modal } from "react-bootstrap";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ModalBlueprintBrowserState } from "../../states/modal/ModalBlueprintBrowserState";
import "./ModalBlueprintBrowser.scss";

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
    // Load blueprints when shown
    if (modal.items.length === 0) {
      setLoading(true);
      modal.loadBlueprints().catch((error) => {
        console.error('Failed to load blueprints:', error);
        setLoading(false);
      });
    }
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
    
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onBlueprintsLoaded', onBlueprintsLoaded);
      modal.removeEventListener('onSearchChanged', onSearchChanged);
    };
  });

  // Watch for visibility changes and load blueprints when modal becomes visible
  useEffect(() => {
    if (modal.visible && modal.items.length === 0) {
      setLoading(true);
      modal.loadBlueprints().catch((error) => {
        console.error('Failed to load blueprints:', error);
        setLoading(false);
      });
    }
  }, [modal.visible, modal.items.length]);

  const handleHide = () => {
    modal.close();
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    modal.close();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    modal.setSearchQuery(e.target.value);
  };

  const handleBlueprintClick = (blueprint: ModalBlueprintBrowserState['items'][0]) => {
    modal.selectBlueprint(blueprint);
  };

  return (
    <Modal
      show={show}
      onHide={handleHide}
      backdrop="static"
      keyboard={false}
      size="lg"
      className="modal-blueprint-browser"
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="blueprint-browser-search">
          <input
            type="text"
            className="form-control"
            placeholder={`Search ${BLUEPRINT_TYPE_LABELS[modal.selectedBlueprintType]}...`}
            value={searchQuery}
            onChange={handleSearchChange}
          />
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
                  key={blueprint.resref}
                  className="blueprint-browser-item"
                  onClick={() => handleBlueprintClick(blueprint)}
                  title={blueprint.localizedName || blueprint.resref}
                >
                  <div className="blueprint-browser-icon">
                    <div className="blueprint-browser-icon-placeholder">
                      {modal.selectedBlueprintType.toUpperCase()}
                    </div>
                  </div>
                  <div className="blueprint-browser-label">{blueprint.resref}</div>
                  {blueprint.localizedName && blueprint.localizedName !== blueprint.resref && (
                    <div className="blueprint-browser-localized-name">{blueprint.localizedName}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

