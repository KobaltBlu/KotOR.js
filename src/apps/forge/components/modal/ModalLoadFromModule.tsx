import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form, ListGroup } from "react-bootstrap";
import { ModalLoadFromModuleState } from "../../states/modal/ModalLoadFromModuleState";
import { CapsuleResourceEntry } from "../../helpers/LoadFromCapsule";
import { listModuleFiles, type ModuleFileEntry } from "../../helpers/ListModuleFiles";
import * as KotOR from "../../KotOR";

export const ModalLoadFromModule = (props: BaseModalProps) => {
  const modal = props.modal as ModalLoadFromModuleState;
  const [show, setShow] = useState(modal.visible);
  const [entries, setEntries] = useState<CapsuleResourceEntry[]>([]);
  const [filterText, setFilterText] = useState("");
  const [selected, setSelected] = useState<CapsuleResourceEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [capsulePath, setCapsulePath] = useState("");
  const [gameModules, setGameModules] = useState<ModuleFileEntry[]>([]);

  const refresh = () => {
    setEntries(modal.getFilteredEntries());
    setFilterText(modal.filterText);
    setSelected(modal.selectedEntry);
    setLoading(modal.loading);
    setError(modal.error);
    setCapsulePath(modal.capsuleFilePath);
  };

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    refresh();
  };

  useEffect(() => {
    const onStateChange = () => refresh();
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    modal.addEventListener("onStateChange", onStateChange);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
      modal.removeEventListener("onStateChange", onStateChange);
    };
  }, [modal]);

  useEffect(() => {
    if (show) refresh();
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const dir = (KotOR.ApplicationProfile as any).directory;
    if (dir && typeof (KotOR.ApplicationProfile as any).directory === "string") {
      import("path").then((pathMod) => {
        const modulesDir = pathMod.join(dir, "modules");
        listModuleFiles(modulesDir).then(setGameModules);
      }).catch(() => setGameModules([]));
    } else {
      setGameModules([]);
    }
  }, [show]);

  const handleClose = () => modal.close();
  const handleBrowse = () => modal.browseCapsule();
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFilterText(v);
    modal.setFilter(v);
    setEntries(modal.getFilteredEntries());
  };
  const handleSelect = (entry: CapsuleResourceEntry) => {
    setSelected(entry);
    modal.setSelected(entry);
  };
  const handleConfirm = () => modal.confirm();

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {gameModules.length > 0 && (
          <div className="mb-3">
            <span className="small text-muted d-block mb-1">From game modules:</span>
            <div className="d-flex flex-wrap gap-1">
              {gameModules.slice(0, 24).map((m) => (
                <Button
                  key={m.path}
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => modal.loadCapsuleFromPath(m.path)}
                  disabled={loading}
                >
                  {m.root}
                </Button>
              ))}
              {gameModules.length > 24 && (
                <span className="small text-muted align-self-center">+{gameModules.length - 24} more</span>
              )}
            </div>
          </div>
        )}
        <div className="mb-2">
          <Button variant="outline-primary" size="sm" onClick={handleBrowse} disabled={loading}>
            {loading ? "Loading…" : "Browse MOD / ERF / RIM…"}
          </Button>
          {capsulePath && (
            <span className="ms-2 small text-muted">{capsulePath}</span>
          )}
        </div>
        {error && <div className="text-danger small mb-2">{error}</div>}
        {modal.entries.length > 0 && (
          <>
            <Form.Control
              type="text"
              placeholder="Filter by resref…"
              value={filterText}
              onChange={handleFilterChange}
              className="mb-2"
            />
            <ListGroup style={{ maxHeight: "320px", overflowY: "auto" }}>
              {entries.map((entry, idx) => (
                <ListGroup.Item
                  key={`${entry.resref}-${entry.resType}-${idx}`}
                  action
                  active={selected?.resref === entry.resref && selected?.resType === entry.resType}
                  onClick={() => handleSelect(entry)}
                >
                  {entry.resref}.{entry.ext}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
        {!loading && modal.entries.length === 0 && capsulePath && (
          <div className="text-muted small">No matching resources in this file.</div>
        )}
        {!loading && !capsulePath && (
          <div className="text-muted small">Click &quot;Browse&quot; to open a MOD, ERF, or RIM file.</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!selected}>
          Load
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
