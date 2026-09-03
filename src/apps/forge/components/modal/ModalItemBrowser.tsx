import React, { useState, useEffect } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalItemBrowserState } from "@/apps/forge/states/modal/ModalItemBrowserState";
import { LazyTextureCanvas } from "@/apps/forge/components/LazyTextureCanvas/LazyTextureCanvas";
import "@/apps/forge/components/modal/ModalItemBrowser.scss";

export const ModalItemBrowser = (props: BaseModalProps) => {
  const modal = props.modal as ModalItemBrowserState;
  const [show, setShow] = useState(modal.visible);
  const [items, setItems] = useState(modal.filteredItems);
  const [searchQuery, setSearchQuery] = useState(modal.searchQuery);
  const [loading, setLoading] = useState(modal.items.length === 0);

  const onHide = () => {
    setShow(false);
  };

  const onShow = () => {
    setShow(true);
    if (modal.items.length === 0) {
      setLoading(true);
      modal.loadItems().catch((error) => {
        console.error('Failed to load items:', error);
        setLoading(false);
      });
    } else {
      setItems([...modal.filteredItems]);
      setLoading(false);
    }
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
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    modal.addEventListener('onItemsLoaded', onItemsLoaded);
    modal.addEventListener('onSearchChanged', onSearchChanged);

    if (modal.visible) {
      setShow(true);
    }
    if (modal.items.length > 0) {
      setItems([...modal.filteredItems]);
      setLoading(false);
    }

    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onItemsLoaded', onItemsLoaded);
      modal.removeEventListener('onSearchChanged', onSearchChanged);
    };
  });

  // Watch for visibility changes and load items when modal becomes visible
  useEffect(() => {
    if (modal.visible && modal.items.length === 0) {
      setLoading(true);
      modal.loadItems().catch((error) => {
        console.error('Failed to load items:', error);
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

  const handleItemClick = (item: ModalItemBrowserState['items'][0]) => {
    modal.selectItem(item);
  };

  return (
    <ForgeDialog
      show={show}
      onHide={handleHide}
      backdrop="static"
      keyboard={false}
      size="lg"
      className="modal-item-browser"
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <div className="item-browser-search">
          <input
            type="text"
            className="forge-input"
            placeholder="Search items..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
          {modal.slotFilter != null && (
            <div className="item-browser-filter-hint">Showing items that fit this equipment slot.</div>
          )}
        </div>

        {loading ? (
          <div className="item-browser-loading">
            <p>Loading items...</p>
          </div>
        ) : (
          <div className="item-browser-grid">
            {items.length === 0 ? (
              <div className="item-browser-empty">
                <p>No items found</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.resref}
                  className="item-browser-item"
                  onClick={() => handleItemClick(item)}
                  title={item.localizedName || item.resref}
                >
                  <div className="item-browser-icon">
                    {item.iconResRef ? (
                      <LazyTextureCanvas
                        texture={item.iconResRef}
                        width={64}
                        height={64}
                      />
                    ) : (
                      <div className="item-browser-icon-placeholder">?</div>
                    )}
                  </div>
                  <div className="item-browser-label">{item.resref}</div>
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

