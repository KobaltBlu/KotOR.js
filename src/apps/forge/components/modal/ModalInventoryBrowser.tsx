import React, { useState, useEffect } from "react";
import { Button, Modal, Nav, Tab } from "react-bootstrap";

import { LazyTextureCanvas } from "@/apps/forge/components/LazyTextureCanvas/LazyTextureCanvas";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import type { InventoryItemEntry } from "@/apps/forge/module-editor/ForgeCreature";
import { ModalInventoryBrowserState, type UTISourceItem } from "@/apps/forge/states/modal/ModalInventoryBrowserState";
import "@/apps/forge/components/modal/ModalInventoryBrowser.scss";

export const ModalInventoryBrowser = (props: BaseModalProps) => {
  const modal = props.modal as ModalInventoryBrowserState;
  const [show, setShow] = useState(modal.visible);
  const [activeTab, setActiveTab] = useState<string>('core');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCoreItems, setFilteredCoreItems] = useState<UTISourceItem[]>([]);
  const [filteredModuleItems, setFilteredModuleItems] = useState<UTISourceItem[]>([]);
  const [filteredOverrideItems, setFilteredOverrideItems] = useState<UTISourceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItemEntry[]>([...modal.inventory]);
  const [coreLoading, setCoreLoading] = useState(!modal.coreLoaded);
  const [moduleLoading, setModuleLoading] = useState(!modal.moduleLoaded);
  const [overrideLoading, setOverrideLoading] = useState(!modal.overrideLoaded);

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    if (!modal.coreLoaded) {
      setCoreLoading(true);
      modal.loadCoreItems().catch(err => {
        console.error('Failed to load core items', err);
        setCoreLoading(false);
      });
    }
    if (!modal.moduleLoaded) {
      setModuleLoading(true);
      modal.loadModuleItems().catch(err => {
        console.error('Failed to load module items', err);
        setModuleLoading(false);
      });
    }
    if (!modal.overrideLoaded) {
      setOverrideLoading(true);
      modal.loadOverrideItems().catch(err => {
        console.error('Failed to load override items', err);
        setOverrideLoading(false);
      });
    }
  };

  const onCoreItemsLoaded = () => {
    setFilteredCoreItems([...modal.filteredCoreItems]);
    setCoreLoading(false);
  };
  const onModuleItemsLoaded = () => {
    setFilteredModuleItems([...modal.filteredModuleItems]);
    setModuleLoading(false);
  };
  const onOverrideItemsLoaded = () => {
    setFilteredOverrideItems([...modal.filteredOverrideItems]);
    setOverrideLoading(false);
  };
  const onSearchChanged = () => {
    setFilteredCoreItems([...modal.filteredCoreItems]);
    setFilteredModuleItems([...modal.filteredModuleItems]);
    setFilteredOverrideItems([...modal.filteredOverrideItems]);
    setSearchQuery(modal.searchQuery);
  };
  const onInventoryChanged = () => {
    setInventory([...modal.inventory]);
  };

  useEffectOnce(() => {
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    modal.addEventListener('onCoreItemsLoaded', onCoreItemsLoaded);
    modal.addEventListener('onModuleItemsLoaded', onModuleItemsLoaded);
    modal.addEventListener('onOverrideItemsLoaded', onOverrideItemsLoaded);
    modal.addEventListener('onSearchChanged', onSearchChanged);
    modal.addEventListener('onInventoryChanged', onInventoryChanged);
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onCoreItemsLoaded', onCoreItemsLoaded);
      modal.removeEventListener('onModuleItemsLoaded', onModuleItemsLoaded);
      modal.removeEventListener('onOverrideItemsLoaded', onOverrideItemsLoaded);
      modal.removeEventListener('onSearchChanged', onSearchChanged);
      modal.removeEventListener('onInventoryChanged', onInventoryChanged);
    };
  });

  useEffect(() => {
    if (modal.visible && !modal.coreLoaded) {
      setCoreLoading(true);
      modal.loadCoreItems().catch(err => {
        console.error('Failed to load core items', err);
        setCoreLoading(false);
      });
    }
  }, [modal.visible, modal.coreLoaded]);

  const handleHide = () => modal.close();
  const handleCancel = () => modal.close();
  const handleSave = () => modal.save();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    modal.setSearchQuery(e.target.value);
  };

  const handleAddItem = (item: UTISourceItem) => {
    modal.addItem(item.resref);
  };

  const handleRemoveItem = (index: number) => {
    modal.removeItem(index);
  };

  const handleDroppableChange = (index: number, checked: boolean) => {
    modal.setDroppable(index, checked);
  };

  const handleInfiniteChange = (index: number, checked: boolean) => {
    modal.setInfinite(index, checked);
  };

  const renderItemGrid = (items: UTISourceItem[], loading: boolean) => {
    if (loading) {
      return <div className="inv-browser-loading">Loading items...</div>;
    }
    if (items.length === 0) {
      return <div className="inv-browser-empty">No items found</div>;
    }
    return (
      <div className="inv-browser-grid">
        {items.map((item) => (
          <div
            key={`${item.source}-${item.resref}`}
            className="inv-browser-grid-item"
            title={`${item.localizedName}\n${item.resref}`}
            onDoubleClick={() => handleAddItem(item)}
          >
            <div className="inv-browser-grid-icon">
              {item.iconResRef ? (
                <LazyTextureCanvas texture={item.iconResRef} width={32} height={32} />
              ) : (
                <div className="inv-browser-icon-placeholder">?</div>
              )}
            </div>
            <div className="inv-browser-grid-label">{item.resref}</div>
            <button
              className="inv-browser-add-btn"
              onClick={() => handleAddItem(item)}
              title={`Add ${item.resref} to inventory`}
            >
              +
            </button>
          </div>
        ))}
      </div>
    );
  };

  const showDroppable = modal.mode === 'creature' || modal.mode === 'placeable';
  const showInfinite = false;

  return (
    <Modal
      show={show}
      onHide={handleHide}
      backdrop="static"
      keyboard={false}
      size="xl"
      className="modal-inventory-browser"
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="inv-browser-layout">
          {/* Left: source browser */}
          <div className="inv-browser-sources">
            <div className="inv-browser-search">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search items..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'core')}>
              <Nav variant="tabs" className="inv-browser-tabs">
                <Nav.Item>
                  <Nav.Link eventKey="core">
                    Core{!coreLoading && ` (${filteredCoreItems.length})`}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="module">
                    Module{!moduleLoading && ` (${filteredModuleItems.length})`}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="override">
                    Override{!overrideLoading && ` (${filteredOverrideItems.length})`}
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              <Tab.Content>
                <Tab.Pane eventKey="core">
                  {renderItemGrid(filteredCoreItems, coreLoading)}
                </Tab.Pane>
                <Tab.Pane eventKey="module">
                  {renderItemGrid(filteredModuleItems, moduleLoading)}
                </Tab.Pane>
                <Tab.Pane eventKey="override">
                  {renderItemGrid(filteredOverrideItems, overrideLoading)}
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </div>

          {/* Right: current inventory list */}
          <div className="inv-browser-inventory">
            <div className="inv-browser-inventory-header">
              <span>Inventory ({inventory.length} items)</span>
            </div>
            <div className="inv-browser-inventory-list">
              {inventory.length === 0 ? (
                <div className="inv-browser-empty">No items in inventory</div>
              ) : (
                <table className="inv-browser-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      {showDroppable && <th title="Droppable">Drop</th>}
                      {showInfinite && <th title="Infinite stock">Inf</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((entry, index) => (
                      <tr key={`inv-${index}-${entry.resref}`}>
                        <td className="inv-browser-table-resref">{entry.resref}</td>
                        {showDroppable && (
                          <td className="inv-browser-table-check">
                            <input
                              type="checkbox"
                              checked={entry.droppable}
                              onChange={(e) => handleDroppableChange(index, e.target.checked)}
                              title="Droppable"
                            />
                          </td>
                        )}
                        {showInfinite && (
                          <td className="inv-browser-table-check">
                            <input
                              type="checkbox"
                              checked={entry.infinite}
                              onChange={(e) => handleInfiniteChange(index, e.target.checked)}
                              title="Infinite"
                            />
                          </td>
                        )}
                        <td>
                          <button
                            className="inv-browser-remove-btn"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove item"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>OK</Button>
      </Modal.Footer>
    </Modal>
  );
};
